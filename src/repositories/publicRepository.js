const supabase = require('../config/supabaseClient');

// Spec 02 FINAL (SPEC-API-02) — D-PUB-01
// Public allowlist repository. No SELECT *, no secrets, no logging of rows.
// Users: exactly id, name (CON-PUB-02). Transactions: CON-PUB-03 allowlist only.

const PUBLIC_USER_COLUMNS = 'id, name';
const PUBLIC_TX_COLUMNS =
  'id, userId, amount, date, note, type, categoryId, paymentMethod, establishment, createdAt';

const DEFAULT_USER_LIMIT = 20;
const MAX_USER_LIMIT = 50;
const MAX_TX_PER_USER = 100;

function clampUserWindow(limit, offset) {
  let safeLimit = Number.parseInt(limit, 10);
  let safeOffset = Number.parseInt(offset, 10);
  if (!Number.isFinite(safeLimit)) safeLimit = DEFAULT_USER_LIMIT;
  if (!Number.isFinite(safeOffset)) safeOffset = 0;
  safeLimit = Math.min(Math.max(safeLimit, 1), MAX_USER_LIMIT);
  safeOffset = Math.max(safeOffset, 0);
  return { safeLimit, safeOffset };
}

const publicRepository = {
  // Paginated public users, stable order for offset paging. Never selects secrets.
  listPublicUsers: async (limit = DEFAULT_USER_LIMIT, offset = 0) => {
    const { safeLimit, safeOffset } = clampUserWindow(limit, offset);

    const { data, error } = await supabase
      .from('users')
      .select(PUBLIC_USER_COLUMNS)
      .order('name', { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) throw error;
    return data || [];
  },

  // Latest transactions for the given user ids, capped at 100 per user (server-enforced).
  // Single query bounded by userIds.length * MAX_TX_PER_USER, then sliced per user
  // to preserve date-desc order without N+1 queries.
  listPublicTransactionsForUsers: async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];

    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select(PUBLIC_TX_COLUMNS)
      .in('userId', uniqueIds)
      .order('date', { ascending: false })
      .limit(uniqueIds.length * MAX_TX_PER_USER);

    if (error) throw error;

    const perUserCount = new Map();
    const capped = [];
    for (const row of data || []) {
      const seen = perUserCount.get(row.userId) || 0;
      if (seen >= MAX_TX_PER_USER) continue;
      perUserCount.set(row.userId, seen + 1);
      capped.push(row);
    }
    return capped;
  },
};

module.exports = publicRepository;
