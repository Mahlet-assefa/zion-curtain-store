import { Router } from 'express';
import { query } from '../database/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/summary', requireAuth, async (_req, res, next) => {
  try {
    const [curtains, lowStock, openDebits, today] = await Promise.all([
      query(`
        SELECT 
          COUNT(*)::int AS count, 
          COALESCE(SUM(stock_amount), 0)::float AS units, 
          COALESCE(SUM(stock_amount * price_per_meter), 0)::float AS value 
        FROM curtains
      `),
      query(`
        SELECT COUNT(*)::int AS count FROM curtains WHERE stock_amount <= 10
      `),
      query(`
        SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount - paid_amount), 0)::float AS balance 
        FROM debits WHERE status <> 'paid'
      `),
      query(`
        SELECT 
          COALESCE(SUM(amount) FILTER (WHERE kind='income'), 0)::float AS income, 
          COALESCE(SUM(amount) FILTER (WHERE kind='expense'), 0)::float AS expenses 
        FROM ledger_entries WHERE entry_date = CURRENT_DATE
      `)
    ]);

    res.json({
      inventory: curtains.rows[0],
      lowStock: lowStock.rows[0].count,
      debits: openDebits.rows[0],
      today: today.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
