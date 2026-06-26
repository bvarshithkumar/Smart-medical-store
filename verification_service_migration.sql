-- =====================================================================
-- ENTERPRISE AUTHENTICATION & VERIFICATION SERVICE MIGRATION
-- Run in: Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_type TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    resend_count INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_all_verification_requests" ON public.verification_requests;

-- Create admin select/manage policy (so admins can audit verification requests if needed)
CREATE POLICY "admin_all_verification_requests" ON public.verification_requests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Create index for faster lookup of active verification requests
CREATE INDEX IF NOT EXISTS idx_verification_active 
ON public.verification_requests(email, verification_type) 
WHERE verified = false;

-- 2. SQL Functions

-- Function 2a: verify_otp
CREATE OR REPLACE FUNCTION public.verify_otp(
  p_email TEXT,
  p_verification_type TEXT,
  p_entered_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_entered_hash TEXT;
BEGIN
  -- Hash the entered OTP using SHA-256
  v_entered_hash := encode(digest(p_entered_otp, 'sha256'), 'hex');

  -- Find the latest active verification request for the given email & type
  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE email = p_email
    AND verification_type = p_verification_type
    AND verified = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active verification request found.');
  END IF;

  -- Check expiration
  IF v_request.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Verification code has expired. Please request a new one.');
  END IF;

  -- Check attempt count (max 5)
  IF v_request.attempt_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum verification attempts exceeded. Please request a new code.');
  END IF;

  -- Increment attempt count
  UPDATE public.verification_requests
  SET attempt_count = attempt_count + 1
  WHERE id = v_request.id;

  -- Compare hashes
  IF v_request.otp_hash = v_entered_hash THEN
    -- Success! Mark as verified
    UPDATE public.verification_requests
    SET verified = true,
        verified_at = now()
    WHERE id = v_request.id;

    -- Invalidate/expire other non-verified requests for this email & type
    UPDATE public.verification_requests
    SET expires_at = now()
    WHERE email = p_email
      AND verification_type = p_verification_type
      AND id != v_request.id;

    RETURN jsonb_build_object('success', true, 'message', 'OTP verified successfully.', 'payload', v_request.payload);
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invalid verification code. Attempts remaining: ' || (4 - v_request.attempt_count));
  END IF;
END;
$$;

-- Function 2b: reset_password_with_otp
CREATE OR REPLACE FUNCTION public.reset_password_with_otp(
  p_email TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Check if there is a verified PASSWORD_RESET request in the last 15 minutes
  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE email = p_email
    AND verification_type = 'PASSWORD_RESET'
    AND verified = true
    AND verified_at >= now() - interval '15 minutes'
  ORDER BY verified_at DESC
  LIMIT 1;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Password reset session expired or invalid. Please verify again.');
  END IF;

  -- Update password in auth.users using crypt encrypting (default blowfish algorithm used by Supabase)
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE email = p_email;

  -- Delete/clean verification requests for this email to prevent reuse
  DELETE FROM public.verification_requests
  WHERE email = p_email
    AND verification_type = 'PASSWORD_RESET';

  RETURN jsonb_build_object('success', true, 'message', 'Password has been reset successfully. Please log in with your new password.');
END;
$$;

-- Function 2c: update_email_with_otp
CREATE OR REPLACE FUNCTION public.update_email_with_otp(
  p_user_id UUID,
  p_new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Check if there is a verified EMAIL_CHANGE request in the last 15 minutes
  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE email = p_new_email
    AND verification_type = 'EMAIL_CHANGE'
    AND verified = true
    AND verified_at >= now() - interval '15 minutes'
  ORDER BY verified_at DESC
  LIMIT 1;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Email change session expired or invalid.');
  END IF;

  -- Update email in auth.users
  UPDATE auth.users
  SET email = p_new_email,
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_user_id;

  -- Update email in public.profiles
  UPDATE public.profiles
  SET email = p_new_email
  WHERE id = p_user_id;

  -- Delete/clean verification requests for this email
  DELETE FROM public.verification_requests
  WHERE email = p_new_email
    AND verification_type = 'EMAIL_CHANGE';

  RETURN jsonb_build_object('success', true, 'message', 'Email address has been updated successfully.');
END;
$$;

-- Function 2d: cleanup_expired_otps
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.verification_requests
  WHERE expires_at < now();
END;
$$;

-- Auto-cleanup: trigger cleanup of old OTPs during verification
CREATE OR REPLACE FUNCTION public.verify_otp_with_cleanup(
  p_email TEXT,
  p_verification_type TEXT,
  p_entered_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res JSONB;
BEGIN
  -- Cleanup first
  PERFORM public.cleanup_expired_otps();
  -- Then verify
  v_res := public.verify_otp(p_email, p_verification_type, p_entered_otp);
  RETURN v_res;
END;
$$;

-- Reload postgrest schema
NOTIFY pgrst, 'reload schema';
