const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  passcode: z.string().min(4, 'Passcode must be at least 4 characters long'),
  initialBalance: z.number().nonnegative().optional().default(0)
});

const loginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  passcode: z.string().min(1, 'Passcode is required')
});

module.exports = {
  registerSchema,
  loginSchema
};
