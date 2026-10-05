const publicService = require('../services/publicService');

// Spec 02 FINAL (SPEC-API-02) — D-PUB-03
// Thin controller: no auth, no logging of rows, envelope per CON-PUB-05.
// NOTE: mounted + throttled in D-PUB-04; this file has no side effects on existing routes.

const publicController = {
  getUsersTransactions: async (req, res, next) => {
    try {
      const { limit, offset } = req.query;

      const users = await publicService.getUsersWithTransactions(limit, offset);

      res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = publicController;
