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

const changePasscodeSchema = z.object({
  currentPasscode: z.string().regex(/^\d{4}$/, 'Current passcode must be exactly 4 digits'),
  newPasscode: z.string().regex(/^\d{4}$/, 'New passcode must be exactly 4 digits')
}).refine((data) => data.newPasscode !== data.currentPasscode, {
  message: 'New passcode must be different from current passcode',
  path: ['newPasscode']
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasscodeSchema
};
