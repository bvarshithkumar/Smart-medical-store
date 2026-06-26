import { supabase } from '../../lib/supabase';
import { VERIFICATION_TYPES } from './verificationTypes';
import { otpService } from './otpService';

/**
 * Enterprise Authentication & Verification Orchestrator.
 */
export const verificationService = {
  // =========================================================================
  // REGISTRATION FLOW
  // =========================================================================

  /**
   * Pre-validates and starts registration by caching details and sending email OTP.
   * @param {string} name 
   * @param {string} email 
   * @param {string} phone 
   * @param {string} password 
   */
  startRegistration: async (name, email, phone, password) => {
    console.log('[verificationService] Starting registration flow for:', email);

    // Check if user already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      throw new Error('This email is already registered. Try logging in instead.');
    }

    // Cache the credentials in sessionStorage temporarily
    sessionStorage.setItem('pending_reg_name', name.trim());
    sessionStorage.setItem('pending_reg_email', email.trim().toLowerCase());
    sessionStorage.setItem('pending_reg_phone', phone.replace(/\D/g, ''));
    sessionStorage.setItem('pending_reg_password', password); // stored in sessionStorage only during verification

    // Trigger OTP sending via Edge Function
    await otpService.sendOTP(email.trim().toLowerCase(), VERIFICATION_TYPES.EMAIL_REGISTRATION, {
      full_name: name.trim(),
      phone: phone.replace(/\D/g, '')
    });
  },

  /**
   * Completes registration after OTP is successfully verified by creating the Supabase User.
   * @param {string} email 
   * @param {string} otp 
   */
  completeRegistration: async (email, otp) => {
    console.log('[verificationService] Completing registration for:', email);

    // 1. Verify OTP first
    await otpService.verifyOTP(email.trim().toLowerCase(), VERIFICATION_TYPES.EMAIL_REGISTRATION, otp);

    // 2. Fetch cached registration details
    const name = sessionStorage.getItem('pending_reg_name');
    const phone = sessionStorage.getItem('pending_reg_phone');
    const password = sessionStorage.getItem('pending_reg_password');

    if (!name || !phone || !password) {
      throw new Error('Registration session expired. Please register again.');
    }

    // 3. Create the Supabase User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          full_name: name,
          phone: phone
        }
      }
    });

    if (authError) {
      console.error('[verificationService] Supabase signUp failed:', authError);
      throw authError;
    }

    const authUser = authData?.user;
    if (!authUser) {
      throw new Error('Failed to create account. User not returned.');
    }

    // 4. Safely create profile row directly
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id:            authUser.id,
        full_name:     name,
        phone:         phone,
        phone_number:  phone,
        email:         email.trim().toLowerCase(),
        role:          'customer',
        customer_type: 'registered'
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.warn('[verificationService] Profile direct upsert failed/warn:', profileError);
    }

    // 5. Clean up cached details
    sessionStorage.removeItem('pending_reg_name');
    sessionStorage.removeItem('pending_reg_email');
    sessionStorage.removeItem('pending_reg_phone');
    sessionStorage.removeItem('pending_reg_password');

    return authData;
  },

  // =========================================================================
  // PASSWORD RESET FLOW
  // =========================================================================

  /**
   * Starts password reset flow by checking if user exists and sending reset OTP.
   * @param {string} email 
   */
  startPasswordReset: async (email) => {
    console.log('[verificationService] Starting password reset for:', email);

    // Verify if profile exists first (to prevent sending reset codes to unregistered emails)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error || !profile) {
      throw new Error('No registered account was found with this email address.');
    }

    // Send reset OTP
    await otpService.sendOTP(email.trim().toLowerCase(), VERIFICATION_TYPES.PASSWORD_RESET);
  },

  /**
   * Verifies the OTP for password reset.
   * @param {string} email 
   * @param {string} otp 
   */
  verifyPasswordReset: async (email, otp) => {
    return await otpService.verifyOTP(email.trim().toLowerCase(), VERIFICATION_TYPES.PASSWORD_RESET, otp);
  },

  /**
   * Updates the password securely using the verified reset OTP session.
   * @param {string} email 
   * @param {string} newPassword 
   */
  completePasswordReset: async (email, newPassword) => {
    console.log('[verificationService] Resetting password for:', email);

    const { data, error } = await supabase.rpc('reset_password_with_otp', {
      p_email:        email.trim().toLowerCase(),
      p_new_password: newPassword
    });

    if (error) {
      console.error('[verificationService] reset_password_with_otp RPC failed:', error);
      throw new Error(error.message || 'Failed to update your password.');
    }

    if (!data || !data.success) {
      throw new Error(data?.message || 'Password reset session invalid or expired.');
    }

    return data;
  },

  // =========================================================================
  // EMAIL CHANGE FLOW
  // =========================================================================

  /**
   * Triggers an OTP sent to the new email address.
   * @param {string} newEmail 
   */
  startEmailChange: async (newEmail) => {
    console.log('[verificationService] Requesting email change to:', newEmail);
    await otpService.sendOTP(newEmail.trim().toLowerCase(), VERIFICATION_TYPES.EMAIL_CHANGE);
  },

  /**
   * Updates email in DB after verifying OTP sent to the new address.
   * @param {string} userId 
   * @param {string} newEmail 
   * @param {string} otp 
   */
  completeEmailChange: async (userId, newEmail, otp) => {
    console.log('[verificationService] Completing email change to:', newEmail);

    // 1. Verify OTP first
    await otpService.verifyOTP(newEmail.trim().toLowerCase(), VERIFICATION_TYPES.EMAIL_CHANGE, otp);

    // 2. Call DB RPC to update email in auth.users and profiles
    const { data, error } = await supabase.rpc('update_email_with_otp', {
      p_user_id:   userId,
      p_new_email: newEmail.trim().toLowerCase()
    });

    if (error) {
      console.error('[verificationService] update_email_with_otp RPC failed:', error);
      throw new Error(error.message || 'Failed to update email address.');
    }

    if (!data || !data.success) {
      throw new Error(data?.message || 'Email change session invalid or expired.');
    }

    return data;
  }
};
