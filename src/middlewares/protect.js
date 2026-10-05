const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      throw new AppError('You are not logged in', 401);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production');
    
    // Check if user still exists
    const currentUser = await userRepository.findById(decoded.id);
    if (!currentUser) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    // SPEC-API-02 CON-API02-02: session enforcement with grace.
    // Pre-02 tokens carry no `sid` — pass until 24h expiry (zero forced
    // logout on deploy). sid-bound tokens must match the live session;
    // a null session (post-logout) mismatches any sid and 401s.
    if (decoded.sid && decoded.sid !== currentUser.currentSessionId) {
      throw new AppError('Your session was ended on another device.', 401);
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token, please log in again', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Your token has expired, please log in again', 401));
    } else {
      next(error);
    }
  }
};

module.exports = protect;
