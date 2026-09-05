import { Router } from 'express';
import { query } from '../database/client';

const router = Router();

// GET /api/finance/preview
router.get('/preview', async (req, res, next) => {
  try {
    const salesRes = await query(`
      SELECT 
        s.id,
        s.curtain_id,
        s.meters_sold,
        s.purchase_price_per_meter,
        s.price_per_meter AS selling_price_per_meter,
        s.total_price AS revenue,
        (s.meters_sold * s.purchase_price_per_meter) AS cogs,
        (s.total_price - (s.meters_sold * s.purchase_price_per_meter)) AS net_profit,
        s.sale_date,
        c.item_code,
        c.item_color
      FROM curtain_sales s
      JOIN curtains c ON s.curtain_id = c.id
      ORDER BY s.sale_date DESC
    `);

    const instockRes = await query(`
      SELECT 
        c.id,
        c.item_code,
        c.item_color,
        c.stock_amount,
        c.purchase_price_per_meter,
        c.price_per_meter AS selling_price_per_meter,
        (c.stock_amount * c.purchase_price_per_meter) AS capital_cost,
        (c.stock_amount * c.price_per_meter) AS potential_revenue,
        ((c.stock_amount * c.price_per_meter) - (c.stock_amount * c.purchase_price_per_meter)) AS potential_profit
      FROM curtains c
      ORDER BY c.item_code ASC
    `);

    const sales = salesRes.rows;
    const instock = instockRes.rows;

    const totalSoldMeters = sales.reduce((sum: number, s: any) => sum + Number(s.meters_sold || 0), 0);
    const totalSoldRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.revenue || 0), 0);
    const totalSoldCOGS = sales.reduce((sum: number, s: any) => sum + Number(s.cogs || 0), 0);
    const totalNetProfit = totalSoldRevenue - totalSoldCOGS;
    const profitMarginPercent = totalSoldRevenue > 0 ? ((totalNetProfit / totalSoldRevenue) * 100).toFixed(1) : 0;

    const totalInstockMeters = instock.reduce((sum: number, c: any) => sum + Number(c.stock_amount || 0), 0);
    const totalCapitalCost = instock.reduce((sum: number, c: any) => sum + Number(c.capital_cost || 0), 0);
    const totalPotentialRevenue = instock.reduce((sum: number, c: any) => sum + Number(c.potential_revenue || 0), 0);
    const totalPotentialProfit = totalPotentialRevenue - totalCapitalCost;

    res.json({
      net_profit_summary: {
        total_net_profit: totalNetProfit,
        profit_margin_percent: Number(profitMarginPercent),
        total_revenue: totalSoldRevenue,
        total_cogs: totalSoldCOGS
      },
      instock_summary: {
        total_instock_meters: totalInstockMeters,
        total_capital_cost: totalCapitalCost,
        total_potential_revenue: totalPotentialRevenue,
        total_potential_profit: totalPotentialProfit
      },
      sold_summary: {
        total_sold_meters: totalSoldMeters,
        total_revenue: totalSoldRevenue,
        total_cogs: totalSoldCOGS,
        net_profit: totalNetProfit
      },
      net_profit_details: sales.map((s: any) => ({
        id: s.id,
        sale_date: s.sale_date,
        item_code: s.item_code,
        item_color: s.item_color,
        meters_sold: Number(s.meters_sold),
        purchase_price_per_meter: Number(s.purchase_price_per_meter),
        selling_price_per_meter: Number(s.selling_price_per_meter),
        cogs: Number(s.cogs),
        revenue: Number(s.revenue),
        net_profit: Number(s.net_profit)
      })),
      instock_details: instock.map((c: any) => ({
        id: c.id,
        item_code: c.item_code,
        item_color: c.item_color,
        stock_amount: Number(c.stock_amount),
        purchase_price_per_meter: Number(c.purchase_price_per_meter),
        selling_price_per_meter: Number(c.selling_price_per_meter),
        capital_cost: Number(c.capital_cost),
        potential_revenue: Number(c.potential_revenue),
        potential_profit: Number(c.potential_profit)
      })),
      sold_details: sales.map((s: any) => ({
        id: s.id,
        sale_date: s.sale_date,
        item_code: s.item_code,
        item_color: s.item_color,
        meters_sold: Number(s.meters_sold),
        purchase_price_per_meter: Number(s.purchase_price_per_meter),
        cogs: Number(s.cogs),
        selling_price_per_meter: Number(s.selling_price_per_meter),
        revenue: Number(s.revenue)
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/finance/daily
router.get('/daily', async (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);

    const salesRes = await query(`
      SELECT 
        s.id,
        s.meters_sold,
        s.purchase_price_per_meter,
        s.price_per_meter AS selling_price_per_meter,
        s.total_price AS revenue,
        (s.meters_sold * s.purchase_price_per_meter) AS cogs,
        (s.total_price - (s.meters_sold * s.purchase_price_per_meter)) AS net_profit,
        s.sale_date,
        c.item_code,
        c.item_color
      FROM curtain_sales s
      JOIN curtains c ON s.curtain_id = c.id
      WHERE DATE(s.sale_date) = $1
      ORDER BY s.sale_date DESC
    `, [today]);

    const debitsRes = await query(`
      SELECT * FROM debits
      WHERE DATE(created_at) = $1
      ORDER BY created_at DESC
    `, [today]);

    const sales = salesRes.rows;
    const debits = debitsRes.rows;

    const totalSalesToday = sales.reduce((sum: number, s: any) => sum + Number(s.revenue || 0), 0);
    const totalCOGSToday = sales.reduce((sum: number, s: any) => sum + Number(s.cogs || 0), 0);
    const totalNetProfitToday = totalSalesToday - totalCOGSToday;
    const totalTodayDebt = debits.reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0);

    res.json({
      date: today,
      sales: sales.map((s: any) => ({
        ...s,
        meters_sold: Number(s.meters_sold),
        purchase_price_per_meter: Number(s.purchase_price_per_meter),
        selling_price_per_meter: Number(s.selling_price_per_meter),
        revenue: Number(s.revenue),
        cogs: Number(s.cogs),
        net_profit: Number(s.net_profit)
      })),
      total_sales_today: totalSalesToday,
      total_cogs_today: totalCOGSToday,
      total_net_profit_today: totalNetProfitToday,
      debits,
      total_today_debt: totalTodayDebt
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/finance/weekly
router.get('/weekly', async (req, res, next) => {
  try {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMon = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMon);

    const days: any[] = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalNetProfit = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().substring(0, 10);

      const daySales = await query(`
        SELECT 
          COALESCE(SUM(meters_sold), 0) AS meters_sold,
          COALESCE(SUM(total_price), 0) AS revenue,
          COALESCE(SUM(meters_sold * purchase_price_per_meter), 0) AS cogs
        FROM curtain_sales
        WHERE DATE(sale_date) = $1
      `, [dateStr]);

      const meters = Number(daySales.rows[0]?.meters_sold || 0);
      const rev = Number(daySales.rows[0]?.revenue || 0);
      const cogs = Number(daySales.rows[0]?.cogs || 0);
      const net = rev - cogs;

      totalRevenue += rev;
      totalCOGS += cogs;
      totalNetProfit += net;

      days.push({
        day_name: dayNames[i],
        date: dateStr,
        meters_sold: meters,
        revenue: rev,
        cogs: cogs,
        net_profit: net
      });
    }

    res.json({
      days,
      total_revenue: totalRevenue,
      total_cogs: totalCOGS,
      total_net_profit: totalNetProfit
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/finance/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentYear = new Date().getFullYear();

    const months: any[] = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalNetProfit = 0;

    for (let m = 1; m <= 12; m++) {
      const monthSales = await query(`
        SELECT 
          COALESCE(SUM(meters_sold), 0) AS meters_sold,
          COALESCE(SUM(total_price), 0) AS revenue,
          COALESCE(SUM(meters_sold * purchase_price_per_meter), 0) AS cogs
        FROM curtain_sales
        WHERE EXTRACT(YEAR FROM sale_date) = $1 AND EXTRACT(MONTH FROM sale_date) = $2
      `, [currentYear, m]);

      const meters = Number(monthSales.rows[0]?.meters_sold || 0);
      const rev = Number(monthSales.rows[0]?.revenue || 0);
      const cogs = Number(monthSales.rows[0]?.cogs || 0);
      const net = rev - cogs;

      totalRevenue += rev;
      totalCOGS += cogs;
      totalNetProfit += net;

      months.push({
        month_name: monthNames[m - 1],
        month_number: m,
        year: currentYear,
        meters_sold: meters,
        revenue: rev,
        cogs: cogs,
        net_profit: net
      });
    }

    res.json({
      year: currentYear,
      months,
      total_revenue: totalRevenue,
      total_cogs: totalCOGS,
      total_net_profit: totalNetProfit
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/finance/yearly
router.get('/yearly', async (req, res, next) => {
  try {
    const yearlyRes = await query(`
      SELECT 
        EXTRACT(YEAR FROM sale_date)::INTEGER AS year,
        COALESCE(SUM(meters_sold), 0) AS meters_sold,
        COALESCE(SUM(total_price), 0) AS revenue,
        COALESCE(SUM(meters_sold * purchase_price_per_meter), 0) AS cogs,
        (COALESCE(SUM(total_price), 0) - COALESCE(SUM(meters_sold * purchase_price_per_meter), 0)) AS net_profit
      FROM curtain_sales
      GROUP BY EXTRACT(YEAR FROM sale_date)
      ORDER BY year DESC
    `);

    res.json({
      years: yearlyRes.rows.map((r: any) => ({
        year: r.year,
        meters_sold: Number(r.meters_sold),
        revenue: Number(r.revenue),
        cogs: Number(r.cogs),
        net_profit: Number(r.net_profit)
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
