const publicRepository = require('../repositories/publicRepository');

// Spec 02 FINAL (SPEC-API-02) — D-PUB-02
// Service assembles the nested public shape. No auth, no writes, no logging of rows.
// Clamp lives here (normative per CON-PUB-06); repository re-clamps defensively.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// CON-PUB-03 allowlist — re-picked here so a repository change can never leak a column.
function pickPublicTransaction(row) {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    date: row.date,
    note: row.note,
    type: row.type,
    categoryId: row.categoryId,
    paymentMethod: row.paymentMethod,
    establishment: row.establishment,
    createdAt: row.createdAt,
  };
}

function clampWindow(limit, offset) {
  let safeLimit = Number.parseInt(limit, 10);
  let safeOffset = Number.parseInt(offset, 10);
  if (!Number.isFinite(safeLimit)) safeLimit = DEFAULT_LIMIT;
  if (!Number.isFinite(safeOffset)) safeOffset = 0;
  safeLimit = Math.min(Math.max(safeLimit, 1), MAX_LIMIT);
  safeOffset = Math.max(safeOffset, 0);
  return { safeLimit, safeOffset };
}

const publicService = {
  getUsersWithTransactions: async (limit, offset) => {
    const { safeLimit, safeOffset } = clampWindow(limit, offset);

    const users = await publicRepository.listPublicUsers(safeLimit, safeOffset);
    if (!users || users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const flatTx = await publicRepository.listPublicTransactionsForUsers(userIds);

    const byUser = new Map();
    for (const row of flatTx) {
      if (!byUser.has(row.userId)) byUser.set(row.userId, []);
      byUser.get(row.userId).push(pickPublicTransaction(row));
    }

    // Repository returns date-desc globally, so per-user arrays stay latest-first.
    return users.map((u) => {
      const txs = byUser.get(u.id) || [];
      return {
        id: u.id,
        name: u.name,
        transactionCount: txs.length,
        transactions: txs,
      };
    });
  },
};

module.exports = publicService;
