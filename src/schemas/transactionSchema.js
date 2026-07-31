const { z } = require('zod');

const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime().or(z.date()),
  note: z.string().optional().nullable(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional().nullable(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  establishment: z.string().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable().or(z.literal(''))
});

const updateTransactionSchema = createTransactionSchema.partial();

module.exports = {
  createTransactionSchema,
  updateTransactionSchema
};
