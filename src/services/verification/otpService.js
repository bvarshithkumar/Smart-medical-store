import { supabase } from '../../lib/supabase';
import { emailService } from './emailService';

/**
 * Service to manage OTP lifecycle: triggering delivery and performing verification.
 */
export const otpService = {
  /**
   * Generates and triggers sending an OTP to a target email.
   * @param {string} email 
   * @param {string} type 
   * @param {object} payload 
   * @returns {Promise<object>}
   */
  sendOTP: async (email, type, payload = {}) => {
    return await emailService.sendVerificationEmail(email, type, payload);
  },

  /**
   * Verifies the entered OTP using a secure DB RPC.
   * @param {string} email 
   * @param {string} type 
   * @param {string} otp 
   * @returns {Promise<object>}
   */
  verifyOTP: async (email, type, otp) => {
    console.log(`[otpService] Verifying OTP for ${email} (${type})`);

    const { data, error } = await supabase.rpc('verify_otp_with_cleanup', {
      p_email:             email,
      p_verification_type: type,
      p_entered_otp:       otp
    });

    if (error) {
      console.error('[otpService] verify_otp_with_cleanup RPC failed:', error);
      throw new Error(error.message || 'Verification service is temporarily unavailable.');
    }

    if (!data || !data.success) {
      console.warn('[otpService] OTP Verification rejected:', data?.message);
      throw new Error(data?.message || 'Invalid or expired verification code.');
    }

    console.log('[otpService] OTP Verification succeeded!');
    return data; // returns { success: true, message: '...', payload: {...} }
  }
};
