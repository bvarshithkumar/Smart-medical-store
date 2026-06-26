/**
 * Verification Utilities
 */

/**
 * Validates whether the given string is a valid 6-digit numeric OTP.
 * @param {string} otp 
 * @returns {boolean}
 */
export const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Formats a cooldown duration in seconds into a friendly human-readable format.
 * @param {number} seconds 
 * @returns {string}
 */
export const formatCooldown = (seconds) => {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
