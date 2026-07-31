const supabase = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('Unauthorized: Invalid token', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Unauthorized: Server error during verification', 401));
  }
};

module.exports = authMiddleware;
