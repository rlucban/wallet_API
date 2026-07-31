const { z } = require('zod');

const createSavingsItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  balance: z.number().nonnegative('Balance must be zero or positive').default(0),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  id: z.string().optional()
});

const updateSavingsItemSchema = createSavingsItemSchema.partial();

module.exports = {
  createSavingsItemSchema,
  updateSavingsItemSchema
};
