const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new AppError(errorMessage, 400));
    }
    next(error);
  }
};

module.exports = validate;
