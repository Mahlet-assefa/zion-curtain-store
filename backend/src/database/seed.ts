import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { query, pool } from './client';

async function seed() {
  const schemaSql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schemaSql);

  const password = await bcrypt.hash('zion-demo-password', 12);
  const user = await query(
    `INSERT INTO users(email, password_hash, full_name, role) 
     VALUES('owner@zioncurtains.com', $1, 'Zion Owner', 'admin') 
     ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash 
     RETURNING id`,
    [password]
  );

  const sampleCurtains = [
    {
      item_code: 'CRT-LIN-001',
      item_color: 'Ivory White',
      purchase_price_per_meter: 280.00,
      price_per_meter: 480.00,
      stock_amount: 85.50,
      item_image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80',
      rolls: [25.0, 30.5, 30.0],
      sales: [
        { meters_sold: 10.0, purchase_price_per_meter: 280.00, price_per_meter: 480.00, total_price: 4800.00 },
        { meters_sold: 5.5, purchase_price_per_meter: 280.00, price_per_meter: 480.00, total_price: 2640.00 }
      ]
    },
    {
      item_code: 'CRT-BLK-014',
      item_color: 'Midnight Blue',
      purchase_price_per_meter: 420.00,
      price_per_meter: 650.00,
      stock_amount: 45.00,
      item_image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=700&q=80',
      rolls: [20.0, 25.0],
      sales: [
        { meters_sold: 15.0, purchase_price_per_meter: 420.00, price_per_meter: 650.00, total_price: 9750.00 }
      ]
    },
    {
      item_code: 'CRT-VEL-008',
      item_color: 'Sage Green',
      purchase_price_per_meter: 550.00,
      price_per_meter: 820.00,
      stock_amount: 60.00,
      item_image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=700&q=80',
      rolls: [30.0, 30.0],
      sales: []
    }
  ];

  for (const c of sampleCurtains) {
    const curtainRes = await query(
      `INSERT INTO curtains(item_code, item_color, purchase_price_per_meter, price_per_meter, stock_amount, item_image)
       VALUES($1, $2, $3, $4, $5, $6)
       ON CONFLICT(item_code) DO UPDATE SET 
         item_color=EXCLUDED.item_color,
         purchase_price_per_meter=EXCLUDED.purchase_price_per_meter,
         price_per_meter=EXCLUDED.price_per_meter,
         stock_amount=EXCLUDED.stock_amount,
         item_image=EXCLUDED.item_image
       RETURNING id`,
      [c.item_code, c.item_color, c.purchase_price_per_meter, c.price_per_meter, c.stock_amount, c.item_image]
    );
    const curtainId = curtainRes.rows[0].id;

    // Clear existing rolls and sales for re-seeding cleanly
    await query(`DELETE FROM curtain_stock_items WHERE curtain_id = $1`, [curtainId]);
    await query(`DELETE FROM curtain_sales WHERE curtain_id = $1`, [curtainId]);

    for (const rollLength of c.rolls) {
      await query(
        `INSERT INTO curtain_stock_items(curtain_id, length_meters, status) VALUES($1, $2, 'in_stock')`,
        [curtainId, rollLength]
      );
    }

    for (const sale of c.sales) {
      await query(
        `INSERT INTO curtain_sales(curtain_id, meters_sold, purchase_price_per_meter, price_per_meter, total_price) VALUES($1, $2, $3, $4, $5)`,
        [curtainId, sale.meters_sold, sale.purchase_price_per_meter, sale.price_per_meter, sale.total_price]
      );
    }
  }

  await query(
    `INSERT INTO ledger_entries(kind, description, amount, created_by) 
     VALUES('income', 'Opening curtain sales', 17190, $1), ('expense', 'Curtain fabric import', 4500, $1)`,
    [user.rows[0].id]
  );

  await query(
    `INSERT INTO debits(customer_name, customer_phone, item_description, total_amount, paid_amount, due_date, status) 
     VALUES('Maya Thompson', '555 0148', 'Living room linen set', 4800, 1800, CURRENT_DATE+7, 'open') 
     ON CONFLICT DO NOTHING`
  );

  console.log('Seed complete with purchased price per meter schema.');
  await pool.end();
}

seed().catch(error => {
  console.error('Seed failed:', error);
  process.exit(1);
});
