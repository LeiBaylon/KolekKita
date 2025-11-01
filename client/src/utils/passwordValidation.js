/**
 * Password validation utility
 * Enforces strong password requirements
 */

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
export const validatePassword = (password) => {
  const errors = [];
  
  // Minimum length check
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  // Maximum length check
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }
  
  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get password strength level
 * @param {string} password - Password to evaluate
 * @returns {Object} - Strength level and score
 */
export const getPasswordStrength = (password) => {
  let score = 0;
  
  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Complexity bonus
  if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }
  
  // Determine strength level
  let level = "weak";
  let color = "red";
  
  if (score >= 7) {
    level = "very strong";
    color = "green";
  } else if (score >= 6) {
    level = "strong";
    color = "green";
  } else if (score >= 4) {
    level = "medium";
    color = "orange";
  }
  
  return {
    score,
    level,
    color,
    percentage: Math.min((score / 8) * 100, 100)
  };
};

/**
 * Password requirements for display
 */
export const PASSWORD_REQUIREMENTS = [
  "At least 8 characters long",
  "At least one uppercase letter (A-Z)",
  "At least one lowercase letter (a-z)",
  "At least one number (0-9)",
  "At least one special character (!@#$%^&*...)"
];
