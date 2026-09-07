import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { pool, query } from '../database/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/curtains - List all curtains with purchase and selling prices
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        c.id,
        c.item_code,
        c.item_color,
        c.purchase_price_per_meter::float AS purchase_price_per_meter,
        c.price_per_meter::float AS price_per_meter,
        c.stock_amount::float AS stock_amount,
        c.item_image,
        c.created_at,
        c.updated_at,
        COALESCE(COUNT(DISTINCT s.id), 0)::int AS rolls_count,
        COALESCE(SUM(cs.meters_sold), 0)::float AS total_sold_meters
      FROM curtains c
      LEFT JOIN curtain_stock_items s ON s.curtain_id = c.id AND s.status = 'in_stock'
      LEFT JOIN curtain_sales cs ON cs.curtain_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/curtains/template - Download Excel template with column headers
router.get('/template', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templateData = [
      {
        item_code: 'CRT-SAMPLE-001',
        item_color: 'Royal Blue',
        purchase_price_per_meter: 350,
        price_per_meter: 550,
        stock_amount: 50
      },
      {
        item_code: 'CRT-SAMPLE-002',
        item_color: 'Ivory Gold',
        purchase_price_per_meter: 450,
        price_per_meter: 720,
        stock_amount: 35
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Curtains Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=curtain_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/curtains/export - Export DB inventory to Excel with purchase & selling prices
router.get('/export', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const curtainsRes = await query(`
      SELECT 
        c.item_code AS "Item Code", 
        c.item_color AS "Item Color", 
        c.purchase_price_per_meter::float AS "Purchased Price Per Meter (birr)", 
        c.price_per_meter::float AS "Selling Price Per Meter (birr)", 
        c.stock_amount::float AS "Total Stock (Meters)",
        COALESCE(COUNT(DISTINCT s.id), 0)::int AS "Variant Pieces Count",
        c.created_at AS "Date Added"
      FROM curtains c
      LEFT JOIN curtain_stock_items s ON s.curtain_id = c.id AND s.status = 'in_stock'
      GROUP BY c.id
      ORDER BY c.item_code ASC
    `);

    const stockRes = await query(`
      SELECT 
        c.item_code AS "Item Code",
        c.item_color AS "Item Color",
        s.length_meters::float AS "Variant Length (Meters)",
        s.status AS "Status",
        s.created_at AS "Date Added"
      FROM curtain_stock_items s
      JOIN curtains c ON c.id = s.curtain_id
      ORDER BY c.item_code ASC, s.created_at DESC
    `);

    const salesRes = await query(`
      SELECT 
        c.item_code AS "Item Code",
        c.item_color AS "Item Color",
        sa.meters_sold::float AS "Meters Sold",
        COALESCE(sa.purchase_price_per_meter, c.purchase_price_per_meter, 0)::float AS "Purchased Price Per Meter (birr)",
        sa.price_per_meter::float AS "Selling Price Per Meter (birr)",
        sa.total_price::float AS "Total Revenue (birr)",
        (sa.total_price - (sa.meters_sold * COALESCE(sa.purchase_price_per_meter, c.purchase_price_per_meter, 0)))::float AS "Net Profit (birr)",
        sa.sale_date AS "Sale Timestamp"
      FROM curtain_sales sa
      JOIN curtains c ON c.id = sa.curtain_id
      ORDER BY sa.sale_date DESC
    `);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(curtainsRes.rows), 'Curtains Catalogue');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stockRes.rows), 'In-Stock Variants');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesRes.rows), 'Sales History');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=curtains_export.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/curtains/sales/today - Today's sales breakdown & total revenue
router.get('/sales/today', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(`
      SELECT 
        sa.id,
        c.item_code,
        c.item_color,
        sa.meters_sold::float,
        COALESCE(sa.purchase_price_per_meter, c.purchase_price_per_meter, 0)::float AS purchase_price_per_meter,
        sa.price_per_meter::float,
        sa.total_price::float,
        (sa.total_price - (sa.meters_sold * COALESCE(sa.purchase_price_per_meter, c.purchase_price_per_meter, 0)))::float AS net_profit,
        sa.sale_date
      FROM curtain_sales sa
      JOIN curtains c ON c.id = sa.curtain_id
      WHERE sa.sale_date::date = CURRENT_DATE
      ORDER BY sa.sale_date DESC
    `);

    const totalRevenue = result.rows.reduce((sum: number, row: any) => sum + Number(row.total_price || 0), 0);

    res.json({
      sales: result.rows,
      total_sales_today: totalRevenue
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/curtains/:id - Fetch curtain detail with in-stock rolls & sales history
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const curtainRes = await query(`
      SELECT id, item_code, item_color, purchase_price_per_meter::float, price_per_meter::float, stock_amount::float, item_image, created_at, updated_at
      FROM curtains WHERE id::text = $1 OR item_code = $1
    `, [req.params.id]);

    if (!curtainRes.rowCount) {
      return res.status(404).json({ message: 'Curtain not found' });
    }
    const curtain = curtainRes.rows[0];

    const inStockRes = await query(`
      SELECT id, length_meters::float, status, created_at
      FROM curtain_stock_items
      WHERE curtain_id = $1 AND status = 'in_stock'
      ORDER BY created_at DESC
    `, [curtain.id]);

    const salesRes = await query(`
      SELECT id, meters_sold::float, COALESCE(purchase_price_per_meter, 0)::float AS purchase_price_per_meter, price_per_meter::float, total_price::float, sale_date
      FROM curtain_sales
      WHERE curtain_id = $1
      ORDER BY sale_date DESC
    `, [curtain.id]);

    res.json({
      curtain,
      inStock: inStockRes.rows,
      sales: salesRes.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/curtains - Add new curtain with purchase_price_per_meter & selling price
router.post('/', requireAuth, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemCode = req.body.item_code || req.body.sku;
    const itemColor = req.body.item_color || req.body.color || '';
    const purchasePricePerMeter = Number(req.body.purchase_price_per_meter || req.body.purchase_price || req.body.buy_price || 0);
    const pricePerMeter = Number(req.body.price_per_meter || req.body.selling_price || req.body.unit_price || 0);
    const stockAmount = Number(req.body.stock_amount || req.body.length_meters || 0);

    if (!itemCode || isNaN(pricePerMeter) || pricePerMeter < 0) {
      return res.status(400).json({ message: 'Item code and valid selling price per meter are required' });
    }

    let itemImage = req.body.item_image || req.body.image_url || null;
    if (req.file) {
      itemImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const curtainRes = await query(`
      INSERT INTO curtains(item_code, item_color, purchase_price_per_meter, price_per_meter, stock_amount, item_image)
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING id, item_code, item_color, purchase_price_per_meter::float, price_per_meter::float, stock_amount::float, item_image, created_at, updated_at
    `, [itemCode, itemColor, Math.max(0, purchasePricePerMeter), Math.max(0, pricePerMeter), Math.max(0, stockAmount), itemImage]);

    const curtain = curtainRes.rows[0];

    if (stockAmount > 0) {
      await query(`
        INSERT INTO curtain_stock_items(curtain_id, length_meters, status)
        VALUES($1, $2, 'in_stock')
      `, [curtain.id, Math.max(0, stockAmount)]);
    }

    res.status(201).json(curtain);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Curtain with this Item Code already exists' });
    }
    next(error);
  }
});

// PATCH /api/curtains/:id - Edit curtain item fields (item_code, item_color, purchase_price_per_meter, price_per_meter, item_image)
router.patch('/:id', requireAuth, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemCode = req.body.item_code || req.body.sku;
    const itemColor = req.body.item_color || req.body.color;
    const purchasePricePerMeter = req.body.purchase_price_per_meter !== undefined ? Number(req.body.purchase_price_per_meter) : undefined;
    const pricePerMeter = req.body.price_per_meter !== undefined ? Number(req.body.price_per_meter) : undefined;

    let itemImage = req.body.item_image || req.body.image_url;
    if (req.file) {
      itemImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const current = await query(`SELECT * FROM curtains WHERE id::text = $1 OR item_code = $1`, [req.params.id]);
    if (!current.rowCount) {
      return res.status(404).json({ message: 'Curtain not found' });
    }
    const c = current.rows[0];

    const updatedCode = itemCode !== undefined ? String(itemCode).trim() : c.item_code;
    const updatedColor = itemColor !== undefined ? String(itemColor).trim() : c.item_color;
    const updatedPurchasePrice = purchasePricePerMeter !== undefined && !isNaN(purchasePricePerMeter) ? Math.max(0, purchasePricePerMeter) : c.purchase_price_per_meter;
    const updatedPrice = pricePerMeter !== undefined && !isNaN(pricePerMeter) ? Math.max(0, pricePerMeter) : c.price_per_meter;
    const updatedImage = itemImage !== undefined ? itemImage : c.item_image;

    const result = await query(`
      UPDATE curtains
      SET 
        item_code = $1,
        item_color = $2,
        purchase_price_per_meter = $3,
        price_per_meter = $4,
        item_image = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, item_code, item_color, purchase_price_per_meter::float, price_per_meter::float, stock_amount::float, item_image, updated_at
    `, [updatedCode, updatedColor, updatedPurchasePrice, updatedPrice, updatedImage, c.id]);

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Another curtain already uses this Item Code' });
    }
    next(error);
  }
});

// POST /api/curtains/:id/stock/add - Add stock meters (+)
router.post('/:id/stock/add', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metersToAdd = Number(req.body.length_meters || req.body.meters || req.body.amount);
    if (isNaN(metersToAdd) || metersToAdd <= 0) {
      return res.status(400).json({ message: 'Please specify a valid length in meters greater than 0' });
    }

    const curtainRes = await query(`
      SELECT id, stock_amount::float FROM curtains WHERE id::text = $1 OR item_code = $1
    `, [req.params.id]);

    if (!curtainRes.rowCount) {
      return res.status(404).json({ message: 'Curtain not found' });
    }
    const curtain = curtainRes.rows[0];

    await query(`
      INSERT INTO curtain_stock_items(curtain_id, length_meters, status)
      VALUES($1, $2, 'in_stock')
    `, [curtain.id, metersToAdd]);

    const updatedRes = await query(`
      UPDATE curtains 
      SET stock_amount = stock_amount + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, item_code, item_color, purchase_price_per_meter::float, price_per_meter::float, stock_amount::float, item_image, updated_at
    `, [metersToAdd, curtain.id]);

    res.json(updatedRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/curtains/:id/stock/deduct - Record sale & subtract stock (-)
router.post('/:id/stock/deduct', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const metersSold = Number(req.body.meters_sold || req.body.meters || req.body.length_meters);
    const pricePerMeter = Number(req.body.price_per_meter || req.body.price);
    const stockItemId = req.body.stock_item_id; // NEW: id of the specific sealed roll being sold

    if (isNaN(metersSold) || metersSold <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Please specify a valid curtain length in meters' });
    }
    if (isNaN(pricePerMeter) || pricePerMeter < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Please specify a valid price per meter' });
    }

    const curtainRes = await client.query(`
      SELECT id, item_code, purchase_price_per_meter::float, stock_amount::float
      FROM curtains WHERE id::text = $1 OR item_code = $1
      FOR UPDATE
    `, [req.params.id]);

    if (!curtainRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Curtain not found' });
    }
    const curtain = curtainRes.rows[0];

    if (stockItemId) {
      // A specific sealed roll was picked — only ever touch this one row.
      const rollRes = await client.query(`
        SELECT id, length_meters::float, status
        FROM curtain_stock_items
        WHERE id = $1 AND curtain_id = $2
        FOR UPDATE
      `, [stockItemId, curtain.id]);

      if (!rollRes.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Selected roll not found' });
      }
      const roll = rollRes.rows[0];

      if (roll.status !== 'in_stock') {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'This roll was already sold. Please refresh and pick another.' });
      }

      // Sealed rolls are sold whole — no partial deduction. The meters sold
      // must exactly match this roll's length; anything else is rejected.
      if (Number(roll.length_meters) !== Number(metersSold)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `This roll is sealed at ${roll.length_meters}m and must be sold in full. Requested: ${metersSold}m`
        });
      }

      await client.query(`UPDATE curtain_stock_items SET status = 'sold' WHERE id = $1`, [roll.id]);
    } else {
      // No specific roll chosen — fall back to old FIFO behavior across all rolls.
      if (curtain.stock_amount < metersSold) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Insufficient stock. Requested: ${metersSold}m, Available: ${curtain.stock_amount}m`
        });
      }

      const rollsRes = await client.query(`
        SELECT id, length_meters::float FROM curtain_stock_items
        WHERE curtain_id = $1 AND status = 'in_stock'
        ORDER BY length_meters ASC
        FOR UPDATE
      `, [curtain.id]);
    }

    const purchasePricePerMeter = Number(curtain.purchase_price_per_meter || 0);
    const totalPrice = Number((metersSold * pricePerMeter).toFixed(2));

    // Record Sale with purchase_price_per_meter
    const saleRes = await client.query(`
      INSERT INTO curtain_sales(curtain_id, meters_sold, purchase_price_per_meter, price_per_meter, total_price)
      VALUES($1, $2, $3, $4, $5)
      RETURNING id, meters_sold::float, purchase_price_per_meter::float, price_per_meter::float, total_price::float, sale_date
    `, [curtain.id, metersSold, purchasePricePerMeter, pricePerMeter, totalPrice]);

    // Update curtain aggregate stock
    const updatedRes = await client.query(`
      UPDATE curtains
      SET stock_amount = GREATEST(0, stock_amount - $1), updated_at = NOW()
      WHERE id = $2
      RETURNING id, item_code, item_color, purchase_price_per_meter::float, price_per_meter::float, stock_amount::float, item_image, updated_at
    `, [metersSold, curtain.id]);

    // Insert income record into ledger entries
    const userId = (req as any).user?.id || null;
    await client.query(`
      INSERT INTO ledger_entries(kind, description, amount, created_by)
      VALUES('income', $1, $2, $3)
    `, [`Curtain Sale (${curtain.item_code} - ${metersSold}m @ ${pricePerMeter}/m)`, totalPrice, userId]);

    // Handle optional credit debit record creation if customer used credit
    let createdDebit = null;
    if (req.body.is_credit && (req.body.customer_name || req.body.customerName)) {
      const customerName = String(req.body.customer_name || req.body.customerName).trim();
      const customerPhone = req.body.customer_phone || req.body.customerPhone || null;
      const reqCreditTotal = Number(req.body.credit_amount ?? req.body.creditAmount);
      const creditTotalAmount = (!isNaN(reqCreditTotal) && reqCreditTotal > 0) ? reqCreditTotal : totalPrice;
      const creditPaidAmount = Math.max(0, Number(req.body.paid_amount ?? req.body.paidAmount ?? 0));
      const remainingDebt = Math.max(0, creditTotalAmount - creditPaidAmount);
      const status = remainingDebt <= 0 ? 'paid' : 'open';
      const itemDesc = `Credit Sale - ${curtain.item_code} (${metersSold}m @ ${pricePerMeter}/m)`;

      const debitRes = await client.query(`
        INSERT INTO debits(customer_name, customer_phone, item_description, total_amount, paid_amount, status)
        VALUES($1, $2, $3, $4, $5, $6)
        RETURNING *, (total_amount - paid_amount)::float AS balance
      `, [customerName, customerPhone, itemDesc, creditTotalAmount, creditPaidAmount, status]);
      createdDebit = debitRes.rows[0];
    }

    await client.query('COMMIT');

    res.json({
      curtain: updatedRes.rows[0],
      sale: saleRes.rows[0],
      debit: createdDebit
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// POST /api/curtains/import - Excel Uploader
router.post('/import', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    if (!workbook.SheetNames.length) {
      return res.status(400).json({ message: 'Excel workbook is empty' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let imported = 0;
    const errors: string[] = [];

    for (const [index, row] of rawRows.entries()) {
      const getVal = (possibleKeys: string[]) => {
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null) return row[key];
          const lower = key.toLowerCase();
          for (const k of Object.keys(row)) {
            if (k.toLowerCase() === lower || k.toLowerCase().replace(/[^a-z0-9]/g, '') === lower.replace(/[^a-z0-9]/g, '')) {
              return row[k];
            }
          }
        }
        return undefined;
      };

      const itemCode = String(getVal(['item_code', 'itemcode', 'sku', 'code', 'item_code']) || '').trim();
      const itemColor = String(getVal(['item_color', 'itemcolor', 'color', 'colour']) || '').trim();
      const purchasePricePerMeter = Number(getVal(['purchase_price_per_meter', 'purchaseprice', 'buy_price', 'purchased_price']) || 0);
      const pricePerMeter = Number(getVal(['price_per_meter', 'pricepermeter', 'unit_price', 'selling_price', 'price']) || 0);
      const stockAmount = Number(getVal(['stock_amount', 'stockamount', 'quantity', 'meters', 'stock']) || 0);
      const itemImage = String(getVal(['item_image', 'itemimage', 'image_url', 'image']) || '').trim() || null;

      if (!itemCode) {
        errors.push(`Row ${index + 2}: Item code is required`);
        continue;
      }

      const curtainRes = await query(`
        INSERT INTO curtains(item_code, item_color, purchase_price_per_meter, price_per_meter, stock_amount, item_image)
        VALUES($1, $2, $3, $4, $5, $6)
        ON CONFLICT(item_code) DO UPDATE SET
          item_color = EXCLUDED.item_color,
          purchase_price_per_meter = EXCLUDED.purchase_price_per_meter,
          price_per_meter = EXCLUDED.price_per_meter,
          stock_amount = EXCLUDED.stock_amount,
          item_image = COALESCE(EXCLUDED.item_image, curtains.item_image),
          updated_at = NOW()
        RETURNING id
      `, [itemCode, itemColor, Math.max(0, purchasePricePerMeter), Math.max(0, pricePerMeter), Math.max(0, stockAmount), itemImage]);

      const curtainId = curtainRes.rows[0].id;
      if (stockAmount > 0) {
        await query(`
          INSERT INTO curtain_stock_items(curtain_id, length_meters, status)
          VALUES($1, $2, 'in_stock')
        `, [curtainId, Math.max(0, stockAmount)]);
      }

      imported++;
    }

    const allCurtains = await query(`
      SELECT 
        c.id, c.item_code, c.item_color, c.purchase_price_per_meter::float, c.price_per_meter::float, c.stock_amount::float, c.item_image, c.updated_at
      FROM curtains c ORDER BY c.updated_at DESC
    `);

    res.json({
      imported,
      errors,
      curtains: allCurtains.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
