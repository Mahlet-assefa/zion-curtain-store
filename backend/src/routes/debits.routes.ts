import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../database/client';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/debits - All debits with dynamic due status calculation
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        id,
        customer_name,
        customer_phone,
        item_description,
        total_amount::float,
        paid_amount::float,
        (total_amount - paid_amount)::float AS balance,
        due_date,
        notes,
        CASE 
          WHEN paid_amount >= total_amount THEN 'paid'
          WHEN due_date IS NOT NULL AND due_date::date < CURRENT_DATE THEN 'overdue'
          WHEN due_date IS NOT NULL AND due_date::date = CURRENT_DATE THEN 'due_today'
          ELSE status
        END AS status,
        created_at,
        updated_at
      FROM debits 
      ORDER BY 
        CASE 
          WHEN due_date::date = CURRENT_DATE THEN 0
          WHEN due_date::date < CURRENT_DATE THEN 1
          WHEN status='open' THEN 2
          ELSE 3 
        END, 
        created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/debits/today - Today's debits summary
router.get('/today', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        id, customer_name, customer_phone, item_description, 
        total_amount::float, paid_amount::float, 
        (total_amount - paid_amount)::float AS remaining_debt,
        due_date, status, created_at
      FROM debits
      WHERE created_at::date = CURRENT_DATE AND status != 'paid'
      ORDER BY created_at DESC
    `);
    const totalTodayDebt = result.rows.reduce((sum: number, r: any) => sum + Number(r.remaining_debt || 0), 0);
    res.json({
      debits: result.rows,
      total_today_debt: totalTodayDebt
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/debits/reminders/today - Get reminders due today or overdue
router.get('/reminders/today', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        id, customer_name, customer_phone, item_description, 
        total_amount::float, paid_amount::float, 
        (total_amount - paid_amount)::float AS balance,
        due_date,
        CASE 
          WHEN due_date::date < CURRENT_DATE THEN 'overdue'
          ELSE 'due_today'
        END AS status
      FROM debits
      WHERE paid_amount < total_amount 
        AND due_date IS NOT NULL 
        AND due_date::date <= CURRENT_DATE
      ORDER BY due_date ASC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/debits - Record new debit
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerName = req.body.customerName || req.body.customer_name;
    const customerPhone = req.body.customerPhone || req.body.customer_phone || null;
    const itemDescription = req.body.itemDescription || req.body.item_description || 'General Debt';
    const totalAmount = Number(req.body.totalAmount || req.body.total_amount || 0);
    const paidAmount = Number(req.body.paidAmount || req.body.paid_amount || 0);
    const dueDate = req.body.dueDate || req.body.due_date || null;
    const notes = req.body.notes || null;

    if (!customerName || isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: 'Customer name and valid total amount are required' });
    }

    const status = paidAmount >= totalAmount ? 'paid' : 'open';
    const result = await query(`
      INSERT INTO debits(customer_name, customer_phone, item_description, total_amount, paid_amount, due_date, status, notes) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *, (total_amount - paid_amount)::float AS balance
    `, [customerName, customerPhone, itemDescription, totalAmount, paidAmount, dueDate, status, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/debits/:id - Edit debit record details
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerName = req.body.customer_name || req.body.customerName;
    const customerPhone = req.body.customer_phone || req.body.customerPhone;
    const itemDescription = req.body.item_description || req.body.itemDescription;
    const totalAmount = req.body.total_amount !== undefined ? Number(req.body.total_amount) : undefined;
    const paidAmount = req.body.paid_amount !== undefined ? Number(req.body.paid_amount) : undefined;
    const dueDate = req.body.due_date !== undefined ? req.body.due_date : undefined;

    const result = await query(`
      UPDATE debits
      SET
        customer_name = COALESCE($1, customer_name),
        customer_phone = COALESCE($2, customer_phone),
        item_description = COALESCE($3, item_description),
        total_amount = COALESCE($4, total_amount),
        paid_amount = COALESCE($5, paid_amount),
        due_date = COALESCE($6, due_date),
        status = CASE
          WHEN COALESCE($5, paid_amount) >= COALESCE($4, total_amount) THEN 'paid'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *, (total_amount - paid_amount)::float AS balance
    `, [customerName, customerPhone, itemDescription, totalAmount, paidAmount, dueDate, req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Debit record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/debits/:id/reminder - Set or update reminder due date
router.patch('/:id/reminder', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dueDate = req.body.due_date || req.body.dueDate;
    if (!dueDate) {
      return res.status(400).json({ message: 'Due date is required for setting a reminder' });
    }

    const result = await query(`
      UPDATE debits 
      SET 
        due_date = $1,
        status = CASE 
          WHEN $1::date < CURRENT_DATE THEN 'overdue'
          WHEN $1::date = CURRENT_DATE THEN 'due_today'
          ELSE 'open'
        END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *, (total_amount - paid_amount)::float AS balance
    `, [dueDate, req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Debit record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/debits/:id/close - Close debt manually (mark as paid)
router.patch('/:id/close', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      UPDATE debits 
      SET 
        paid_amount = total_amount,
        status = 'paid',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *, (total_amount - paid_amount)::float AS balance
    `, [req.params.id]);

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Debit record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
