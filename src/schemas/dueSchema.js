const { z } = require('zod');

const createDueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime('Invalid date format, expected ISO 8601'),
  frequency: z.enum(['once', 'weekly', 'biweekly', 'monthly', 'yearly']).optional(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional().nullable(),
  autoProcess: z.boolean().optional().default(false),
  completed: z.boolean().optional().default(false),
  id: z.string().optional()
});

const updateDueSchema = createDueSchema.partial();

module.exports = {
  createDueSchema,
  updateDueSchema
};
