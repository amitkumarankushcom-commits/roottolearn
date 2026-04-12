// ============================================================
// middleware/validation.js — Input Validation Middleware
// ============================================================

/**
 * Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
}

/**
 * Validate password strength
 */
function isValidPassword(password) {
  return password && password.length >= 8;
}

/**
 * Validate name
 */
function isValidName(name) {
  return name && name.trim().length >= 2 && name.length <= 100;
}

/**
 * Middleware to validate signup request
 */
function validateSignup(req, res, next) {
  const { email, password, name } = req.body;
  
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format',
      field: 'email'
    });
  }
  
  if (!password || !isValidPassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters',
      field: 'password'
    });
  }
  
  if (!name || !isValidName(name)) {
    return res.status(400).json({ 
      error: 'Name must be between 2 and 100 characters',
      field: 'name'
    });
  }
  
  next();
}

/**
 * Middleware to validate login request
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;
  
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format',
      field: 'email'
    });
  }
  
  if (!password) {
    return res.status(400).json({ 
      error: 'Password is required',
      field: 'password'
    });
  }
  
  next();
}

/**
 * Middleware to validate OTP verification
 */
function validateOTP(req, res, next) {
  const { email, otp } = req.body;
  
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format',
      field: 'email'
    });
  }
  
  if (!otp || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ 
      error: 'OTP must be 6 digits',
      field: 'otp'
    });
  }
  
  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateOTP,
  isValidEmail,
  isValidPassword,
  isValidName
};
