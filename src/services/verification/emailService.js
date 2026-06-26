import { supabase } from '../../lib/supabase';

/**
 * Service to interact with Edge Functions for email sending operations.
 */
export const emailService = {
  /**
   * Invokes the send-verification-email Edge Function to generate, hash, and deliver OTP.
   * @param {string} email 
   * @param {string} type 
   * @param {object} payload 
   * @returns {Promise<object>}
   */
  sendVerificationEmail: async (email, type, payload = {}) => {
    console.log(`[emailService] Sending verification email request for ${email} (${type})`);
    
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { email, type, payload }
    });

    if (error) {
      console.error('[emailService] Edge function invoke error:', error);
      throw new Error(error.message || 'Failed to request verification code.');
    }

    console.log('[emailService] Edge function response:', data);
    return data; // returns { success: true, message: '...', dev_mode: boolean, otp?: string }
  }
};
