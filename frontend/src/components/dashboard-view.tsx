// @ts-nocheck
'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Eye,
  Pencil,
  Phone,
  PieChart as PieChartIcon,
  Plus,
  WalletCards,
  X,
  Boxes,
  ArrowRight,
  ReceiptText,
  ArrowUpDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api';

// Visual Pie Chart Component for Daily Revenue vs Debt
function DailyReportPieChart({ revenue, debt }: { revenue: number; debt: number }) {
  if (revenue === 0 && debt === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
        <PieChartIcon size={48} className="text-slate-200 mb-2" />
        No sales or debt recorded for today yet.
      </div>
    );
  }

  // Base total is maximum of revenue and debt to guarantee valid 100% scale
  const baseTotal = Math.max(revenue, debt);
  
  // Debt percentage of total revenue base
  const debtPct = baseTotal > 0 ? Math.min(100, Math.round((debt / baseTotal) * 100)) : 0;
  const paidPct = Math.max(0, 100 - debtPct);

  const C = 251.327; // 2 * PI * 40
  const paidDash = (paidPct / 100) * C;
  const debtDash = (debtPct / 100) * C;

  const paidAmount = Math.max(0, baseTotal - debt);

  return (
    <div className="flex flex-col items-center space-y-5">
      <div className="relative h-48 w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          {/* Paid Cash Revenue Portion (Green Arc) */}
          {paidPct > 0 && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="16"
              strokeDasharray={`${paidDash} ${C}`}
              strokeDashoffset="0"
            />
          )}
          {/* Debt Portion of Revenue (Red Arc) */}
          {debtPct > 0 && (
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="16"
              strokeDasharray={`${debtDash} ${C}`}
              strokeDashoffset={`-${paidDash}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-extrabold uppercase text-slate-400">Total Revenue</span>
          <span className="text-lg font-black text-slate-900">{baseTotal.toLocaleString()} birr</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 pt-2 text-sm font-bold">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-800 uppercase font-black">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            Paid Cash ({paidPct}%)
          </div>
          <div className="mt-1 text-base font-black text-emerald-700">
            {paidAmount.toLocaleString()} birr
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-800 uppercase font-black">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
            In Debt ({debtPct}%)
          </div>
          <div className="mt-1 text-base font-black text-rose-700">
            {debt.toLocaleString()} birr
          </div>
        </div>
      </div>
    </div>
  );
}

// 1. OVERVIEW COMPONENT
function Overview({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [remindersToday, setRemindersToday] = useState<any[]>([]);
  const [todaySalesData, setTodaySalesData] = useState<any[]>([]);
  const [allCurtains, setAllCurtains] = useState<any[]>([]);
  const [allStockItems, setAllStockItems] = useState<any[]>([]);
  const [allSalesHistory, setAllSalesHistory] = useState<any[]>([]);
  const [debitsSummary, setDebitsSummary] = useState<any[]>([]);
  const [todayDebtTotal, setTodayDebtTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modals & Sort Option for Card 1
  const [curtainModalOpen, setCurtainModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'code-asc' | 'code-desc' | 'date-desc' | 'date-asc'>('date-desc');

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const [remindersRes, salesRes, curtainsRes, debitsRes, todayDebitsRes] = await Promise.all([
        api<any[]>('/debits/reminders/today').catch(() => []),
        api<{ sales: any[]; total_sales_today: number }>('/curtains/sales/today').catch(() => ({ sales: [], total_sales_today: 0 })),
        api<any[]>('/curtains').catch(() => []),
        api<any[]>('/debits').catch(() => []),
        api<{ debits: any[]; total_today_debt: number }>('/debits/today').catch(() => ({ debits: [], total_today_debt: 0 }))
      ]);

      setRemindersToday(remindersRes || []);
      setTodaySalesData(salesRes.sales || []);
      setAllCurtains(curtainsRes || []);
      setDebitsSummary(debitsRes || []);
      setTodayDebtTotal(todayDebitsRes.total_today_debt || 0);

      // Fetch joint details for curtains modal
      const jointStockPromises = (curtainsRes || []).map((c: any) =>
        api<{ curtain: any; inStock: any[]; sales: any[] }>(`/curtains/${c.id}`).catch(() => ({ curtain: c, inStock: [], sales: [] }))
      );
      const jointResults = await Promise.all(jointStockPromises);

      const stockAcc: any[] = [];
      const salesAcc: any[] = [];
      jointResults.forEach(res => {
        if (res.inStock) {
          res.inStock.forEach(item => stockAcc.push({ ...item, item_code: res.curtain?.item_code, item_color: res.curtain?.item_color, type: 'instock' }));
        }
        if (res.sales) {
          res.sales.forEach(sale => salesAcc.push({ ...sale, item_code: res.curtain?.item_code, item_color: res.curtain?.item_color, type: 'sold' }));
        }
      });
      setAllStockItems(stockAcc);
      setAllSalesHistory(salesAcc);

    } catch (err) {
      console.error('Error loading overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, []);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const todayRevenue = todaySalesData.reduce((sum, s) => sum + Number(s.total_price || 0), 0);

  const totalVariantStockCount = allCurtains.reduce((sum, item) => {
    const count = Number(item.rolls_count ?? (item.stock_amount > 0 ? 1 : 0));
    return sum + count;
  }, 0);

  const topSoldItemsMap: Record<string, { item_code: string; item_color: string; meters: number; revenue: number }> = {};
  allCurtains.forEach(c => {
    topSoldItemsMap[c.item_code] = {
      item_code: c.item_code,
      item_color: c.item_color || '',
      meters: Number(c.total_sold_meters || 0),
      revenue: Number(c.total_sold_meters || 0) * Number(c.price_per_meter || 0)
    };
  });
  const topSoldList = Object.values(topSoldItemsMap).sort((a, b) => b.meters - a.meters);

  // Combined and sorted curtain items for Card 1 modal
  const combinedCurtainItems = [
    ...allStockItems.map(item => ({
      id: `stock-${item.id}`,
      item_code: item.item_code || '',
      item_color: item.item_color || '',
      meters: Number(item.length_meters || 0),
      status: 'Available',
      priceInfo: '',
      date: item.created_at,
      isSold: false
    })),
    ...allSalesHistory.map(sale => ({
      id: `sale-${sale.id}`,
      item_code: sale.item_code || '',
      item_color: sale.item_color || '',
      meters: Number(sale.meters_sold || 0),
      status: 'Sold',
      priceInfo: `(${Number(sale.total_price || 0).toLocaleString()} birr)`,
      date: sale.sale_date,
      isSold: true
    }))
  ];

  const sortedCurtainItems = [...combinedCurtainItems].sort((a, b) => {
    if (sortOption === 'code-asc') {
      return a.item_code.localeCompare(b.item_code);
    }
    if (sortOption === 'code-desc') {
      return b.item_code.localeCompare(a.item_code);
    }
    if (sortOption === 'date-asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">{todayDateStr}</span>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            Overview
          </h1>
        </div>
      </div>

      {/* Reminder Section at top */}
      {remindersToday.length > 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200/70 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-amber-500 p-1.5 text-white animate-bounce">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="font-display text-base font-black text-amber-950">
                  TODAY'S REMINDERS & DUE DEBITS ({remindersToday.length})
                </h3>
                <p className="text-xs font-bold text-amber-800">
                  Customer debits scheduled for reminder today or overdue
                </p>
              </div>
            </div>
            <span className="rounded-md bg-amber-200/80 px-2.5 py-1 text-xs font-black text-amber-950">
              ACTION REQUIRED
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {remindersToday.map(r => (
              <div key={r.id} className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900">{r.customer_name}</h4>
                    {r.customer_phone && (
                      <p className="flex items-center gap-1 text-xs font-bold text-slate-500 mt-0.5">
                        <Phone size={12} className="text-[#1976d2]" />
                        {r.customer_phone}
                      </p>
                    )}
                  </div>
                  <Badge className={r.status === 'overdue' ? 'bg-rose-600 text-white font-black' : 'bg-amber-500 text-white font-black'}>
                    {r.status === 'overdue' ? 'OVERDUE' : 'DUE TODAY'}
                  </Badge>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-2 text-xs">
                  <span className="font-bold text-slate-500">{r.item_description}</span>
                  <span className="font-black text-rose-600 text-sm">{Number(r.balance).toLocaleString()} birr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <span className="text-sm font-bold text-slate-700">No customer debits due for reminder today.</span>
          </div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">All clear</span>
        </div>
      )}

      {/* QUICK MANAGEMENT BOARD */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-black uppercase text-slate-900">
          Quick management board
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Curtain datas */}
          <Card className="border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Curtain Datas</span>
                <Boxes size={20} className="text-[#1976d2]" />
              </div>
              <div className="mt-3 font-display text-3xl font-black text-slate-900">
                {allCurtains.length} <span className="text-sm font-extrabold text-slate-500">Items</span>
              </div>
              <p className="mt-1 text-xs font-black text-[#1976d2]">
                Total Stock Variants: {totalVariantStockCount} pieces
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setCurtainModalOpen(true)}
                className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
              >
                <Eye size={15} />
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Finance data */}
          <Card className="border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Finance Data</span>
                <CircleDollarSign size={20} className="text-emerald-600" />
              </div>
              <div className="mt-3 font-display text-3xl font-black text-emerald-700">
                {todayRevenue.toLocaleString()} birr
              </div>
              <p className="mt-1 text-xs font-extrabold text-slate-500">
                Today's Revenue vs Debt Ratio
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setFinanceModalOpen(true)}
                className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
              >
                <Eye size={15} />
                View Details
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Daily debt chart */}
          <Card className="border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Daily Debt Chart</span>
                <WalletCards size={20} className="text-rose-600" />
              </div>
              <div className="mt-3 font-display text-3xl font-black text-rose-600">
                {todayDebtTotal.toLocaleString()} birr
              </div>
              <p className="mt-1 text-xs font-extrabold text-rose-600">
                Total Debt Recorded Today
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => onNavigate ? onNavigate('debits') : (window.location.hash = 'debits')}
                className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
              >
                <Eye size={15} />
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Sold Curtains Section */}
      <Card className="border border-slate-200/90 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Catalogue Ranking</p>
              <h3 className="mt-1 font-display text-xl font-black text-slate-900">Top Sold Curtains</h3>
            </div>
            <Award size={22} className="text-amber-500" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {topSoldList.slice(0, 5).map((item, idx) => (
              <div key={item.item_code} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 font-black text-xs text-white">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900">{item.item_code}</h4>
                    {item.item_color && (
                      <p className="text-xs font-bold text-slate-500">{item.item_color}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 block">
                    {item.revenue.toLocaleString()} birr
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {item.meters.toFixed(1)} meters sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MODAL FOR CARD 1: All Curtains Joint Table with ASC & DSC Sort controls */}
      {curtainModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Quick Management Database</span>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900">ALL CURTAINS IN-STOCK & SOLD TABLE</h2>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-extrabold text-slate-600">
                  <ArrowUpDown size={15} className="text-[#1976d2]" />
                  <span>Sort By:</span>
                </div>
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value as any)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800 shadow-2xs focus:border-[#1976d2] focus:outline-none"
                >
                  <option value="date-desc">Date: Newest First</option>
                  <option value="date-asc">Date: Oldest First</option>
                  <option value="code-asc">Item Code: A → Z (ASC)</option>
                  <option value="code-desc">Item Code: Z → A (DSC)</option>
                </select>

                <button type="button" onClick={() => setCurtainModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Item Code</th>
                      <th className="px-4 py-3">Color</th>
                      <th className="px-4 py-3">Meters</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Date Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {sortedCurtainItems.map((item) => (
                      <tr
                        key={item.id}
                        className={item.isSold ? 'bg-rose-50/40 hover:bg-rose-50' : 'bg-emerald-50/40 hover:bg-emerald-50'}
                      >
                        <td className="px-4 py-3 font-extrabold text-slate-900">{item.item_code}</td>
                        <td className="px-4 py-3 text-slate-600">{item.item_color || '—'}</td>
                        <td className={`px-4 py-3 font-black ${item.isSold ? 'text-rose-800' : 'text-emerald-800'}`}>
                          {item.meters.toFixed(2)} m
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2.5 py-1 text-xs font-black ${
                              item.isSold ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.status} {item.priceInfo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button type="button" onClick={() => setCurtainModalOpen(false)} className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR CARD 2: Daily Revenue & Debt Pie Chart */}
      {financeModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">{todayDateStr}</span>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900">DAILY REVENUE VS DEBT CHART</h2>
              </div>
              <button type="button" onClick={() => setFinanceModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6">
              <DailyReportPieChart revenue={todayRevenue} debt={todayDebtTotal} />
            </div>

            <div className="flex justify-end pt-6">
              <Button type="button" onClick={() => setFinanceModalOpen(false)} className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold text-xs">
                Close Chart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Curtains() {
  return null;
}

// 2. FINANCES DASHBOARD COMPONENT
function Finance() {
  const [subTab, setSubTab] = useState<'preview' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('preview');

  // Data States
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const [dailyData, setDailyData] = useState<any | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [weeklyData, setWeeklyData] = useState<any | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const [monthlyData, setMonthlyData] = useState<any | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const [yearlyData, setYearlyData] = useState<any | null>(null);
  const [loadingYearly, setLoadingYearly] = useState(false);

  // Preview Modals
  const [netProfitModalOpen, setNetProfitModalOpen] = useState(false);
  const [instockModalOpen, setInstockModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);

  // Load preview financials
  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      const data = await api<any>('/finance/preview');
      setPreviewData(data);
    } catch (err) {
      console.error('Error loading preview financials:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadDaily = async () => {
    try {
      setLoadingDaily(true);
      const data = await api<any>('/finance/daily');
      setDailyData(data);
    } catch (err) {
      console.error('Error loading daily financials:', err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const loadWeekly = async () => {
    try {
      setLoadingWeekly(true);
      const data = await api<any>('/finance/weekly');
      setWeeklyData(data);
    } catch (err) {
      console.error('Error loading weekly financials:', err);
    } finally {
      setLoadingWeekly(false);
    }
  };

  const loadMonthly = async () => {
    try {
      setLoadingMonthly(true);
      const data = await api<any>('/finance/monthly');
      setMonthlyData(data);
    } catch (err) {
      console.error('Error loading monthly financials:', err);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const loadYearly = async () => {
    try {
      setLoadingYearly(true);
      const data = await api<any>('/finance/yearly');
      setYearlyData(data);
    } catch (err) {
      console.error('Error loading yearly financials:', err);
    } finally {
      setLoadingYearly(false);
    }
  };

  useEffect(() => {
    loadPreview();
    loadDaily();
    loadWeekly();
    loadMonthly();
    loadYearly();
  }, []);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">STORE FINANCIAL MANAGEMENT</span>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            FINANCES DASHBOARD
          </h1>
        </div>
      </div>

      {/* 5 Sub-Tabs Bar: Finance Preview, Daily, Weekly, Monthly, Yearly */}
      <div className="flex items-center overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
        {[
          { id: 'preview', label: 'FINANCE PREVIEW' },
          { id: 'daily', label: 'DAILY' },
          { id: 'weekly', label: 'WEEKLY' },
          { id: 'monthly', label: 'MONTHLY' },
          { id: 'yearly', label: 'YEARLY' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-black transition ${
              subTab === tab.id
                ? 'bg-[#1976d2] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: PREVIEW (FINANCE PREVIEW DASHBOARD) */}
      {subTab === 'preview' && (
        <div className="space-y-6">
          {loadingPreview ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Loading financial calculations...</div>
          ) : (
            <>
              {/* 3 Financial Metric Boards/Boxes */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Board 1: Net Profit */}
                <Card className="border border-emerald-200 bg-emerald-50/40 shadow-sm transition hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">NET PROFIT</span>
                      <Coins size={20} className="text-emerald-600" />
                    </div>
                    <div className="mt-2 font-display text-3xl font-black text-emerald-700">
                      {Number(previewData?.net_profit_summary?.total_net_profit || 0).toLocaleString()} birr
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-emerald-700">
                      Profit Margin: {previewData?.net_profit_summary?.profit_margin_percent || 0}%
                    </p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button
                      onClick={() => setNetProfitModalOpen(true)}
                      className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                    >
                      <Eye size={15} />
                      View Details
                    </Button>
                  </CardContent>
                </Card>

                {/* Board 2: In-Stock Items Finance */}
                <Card className="border border-blue-200 bg-blue-50/40 shadow-sm transition hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#1976d2]">IN-STOCK ITEMS FINANCE</span>
                      <Boxes size={20} className="text-[#1976d2]" />
                    </div>
                    <div className="mt-2 font-display text-3xl font-black text-slate-900">
                      {Number(previewData?.instock_summary?.total_capital_cost || 0).toLocaleString()} birr
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-[#1976d2]">
                      Capital Cost Tied in {Number(previewData?.instock_summary?.total_instock_meters || 0).toFixed(1)}m Stock
                    </p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button
                      onClick={() => setInstockModalOpen(true)}
                      className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                    >
                      <Eye size={15} />
                      View Details
                    </Button>
                  </CardContent>
                </Card>

                {/* Board 3: Sold Items Finance */}
                <Card className="border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">SOLD ITEMS FINANCE</span>
                      <CircleDollarSign size={20} className="text-slate-700" />
                    </div>
                    <div className="mt-2 font-display text-3xl font-black text-slate-900">
                      {Number(previewData?.sold_summary?.total_revenue || 0).toLocaleString()} birr
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-[#1976d2]">
                      Total Revenue ({Number(previewData?.sold_summary?.total_sold_meters || 0).toFixed(1)}m Sold)
                    </p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Button
                      onClick={() => setSoldModalOpen(true)}
                      className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                    >
                      <Eye size={15} />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* MODAL 1: Net Profit Details Table */}
          {netProfitModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
              <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Itemized Sales Calculation</span>
                    <h2 className="mt-1 font-display text-2xl font-black text-slate-900">NET PROFIT DETAILS TABLE</h2>
                  </div>
                  <button type="button" onClick={() => setNetProfitModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Sale Date</th>
                          <th className="px-4 py-3">Item Code</th>
                          <th className="px-4 py-3">Meters Sold</th>
                          <th className="px-4 py-3">Purchased Price/m</th>
                          <th className="px-4 py-3">Selling Price/m</th>
                          <th className="px-4 py-3">COGS (Purchase)</th>
                          <th className="px-4 py-3">Revenue (Selling)</th>
                          <th className="px-4 py-3 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {previewData?.net_profit_details?.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-xs text-slate-500">{new Date(row.sale_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-900">{row.item_code} {row.item_color ? `(${row.item_color})` : ''}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{row.meters_sold.toFixed(2)} m</td>
                            <td className="px-4 py-3 font-semibold text-slate-600">{row.purchase_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-semibold text-slate-600">{row.selling_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-bold text-rose-600">{row.cogs.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.revenue.toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{row.net_profit.toLocaleString()} birr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button type="button" onClick={() => setNetProfitModalOpen(false)} className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold text-xs">
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: In-Stock Valuation Details Table */}
          {instockModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
              <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Inventory Valuation</span>
                    <h2 className="mt-1 font-display text-2xl font-black text-slate-900">IN-STOCK ITEMS FINANCE DETAILS TABLE</h2>
                  </div>
                  <button type="button" onClick={() => setInstockModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Item Code</th>
                          <th className="px-4 py-3">Item Color</th>
                          <th className="px-4 py-3">Stock Available</th>
                          <th className="px-4 py-3">Purchased Price/m</th>
                          <th className="px-4 py-3">Capital Cost (Tied)</th>
                          <th className="px-4 py-3">Selling Price/m</th>
                          <th className="px-4 py-3">Potential Revenue</th>
                          <th className="px-4 py-3 text-right">Potential Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {previewData?.instock_details?.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-extrabold text-slate-900">{row.item_code}</td>
                            <td className="px-4 py-3 text-slate-600">{row.item_color || '—'}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.stock_amount.toFixed(2)} m</td>
                            <td className="px-4 py-3 text-slate-600">{row.purchase_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.capital_cost.toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-slate-600">{row.selling_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-bold text-[#1976d2]">{row.potential_revenue.toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{row.potential_profit.toLocaleString()} birr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button type="button" onClick={() => setInstockModalOpen(false)} className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold text-xs">
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 3: Sold Items COGS Details Table */}
          {soldModalOpen && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
              <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Completed Sales & Cost of Goods</span>
                    <h2 className="mt-1 font-display text-2xl font-black text-slate-900">SOLD ITEMS FINANCE DETAILS TABLE</h2>
                  </div>
                  <button type="button" onClick={() => setSoldModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Sale Date</th>
                          <th className="px-4 py-3">Item Code</th>
                          <th className="px-4 py-3">Meters Sold</th>
                          <th className="px-4 py-3">Purchased Price/m</th>
                          <th className="px-4 py-3">COGS Total</th>
                          <th className="px-4 py-3">Selling Price/m</th>
                          <th className="px-4 py-3 text-right">Revenue Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {previewData?.sold_details?.map((row: any) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-xs text-slate-500">{new Date(row.sale_date).toLocaleString()}</td>
                            <td className="px-4 py-3 font-extrabold text-slate-900">{row.item_code} {row.item_color ? `(${row.item_color})` : ''}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.meters_sold.toFixed(2)} m</td>
                            <td className="px-4 py-3 text-slate-600">{row.purchase_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-bold text-rose-600">{row.cogs.toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-slate-600">{row.selling_price_per_meter.toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{row.revenue.toLocaleString()} birr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button type="button" onClick={() => setSoldModalOpen(false)} className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold text-xs">
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DAILY */}
      {subTab === 'daily' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">{todayDateStr}</span>
              <h2 className="mt-1 font-display text-2xl font-black text-slate-900">TODAY'S DAILY TRANSACTIONS & SALES</h2>
            </div>
          </div>

          <Card className="border border-slate-200/90 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#1976d2]">{todayDateStr}</p>
                  <h3 className="mt-1 font-display text-xl font-black text-slate-900">Today's Curtain Sales Breakdown</h3>
                </div>
                <Button
                  onClick={loadDaily}
                  disabled={loadingDaily}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold shadow"
                >
                  <Calculator size={16} />
                  {loadingDaily ? 'Refreshing...' : 'Refresh Today\'s Sales'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {dailyData?.sales?.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3">Meters Sold</th>
                        <th className="px-4 py-3">Price / Meter</th>
                        <th className="px-4 py-3 text-right">Subtotal (Meters * Price)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {dailyData.sales.map((sale: any) => {
                        const subtotal = Number(sale.meters_sold || 0) * Number(sale.selling_price_per_meter || sale.price_per_meter || 0);
                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-extrabold text-slate-900">
                              {sale.item_code} {sale.item_color ? `(${sale.item_color})` : ''}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {Number(sale.meters_sold).toFixed(2)} m
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600">
                              {Number(sale.selling_price_per_meter || sale.price_per_meter).toLocaleString()} birr
                            </td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">
                              {subtotal.toLocaleString()} birr
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                  No curtain sales recorded today yet. Click (-) on any curtain card to record a sale.
                </div>
              )}

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                <span className="text-sm font-extrabold text-emerald-900 uppercase">Total Sale of the Day:</span>
                <span className="text-2xl font-black text-emerald-700">
                  {Number(dailyData?.total_sales_today || 0).toLocaleString()} birr
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 3: WEEKLY */}
      {subTab === 'weekly' && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">WEEKLY FINANCIAL REPORT</span>
            <h2 className="mt-1 font-display text-2xl font-black text-slate-900">CURRENT WEEK PERFORMANCE (MON - SUN)</h2>
          </div>

          {loadingWeekly ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Loading weekly financials...</div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Weekly Revenue</span>
                  <div className="mt-2 font-display text-3xl font-black text-slate-900">
                    {Number(weeklyData?.total_revenue || 0).toLocaleString()} birr
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Weekly Inventory Cost (COGS)</span>
                  <div className="mt-2 font-display text-3xl font-black text-rose-600">
                    {Number(weeklyData?.total_cogs || 0).toLocaleString()} birr
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Weekly Net Profit</span>
                  <div className="mt-2 font-display text-3xl font-black text-emerald-700">
                    {Number(weeklyData?.total_net_profit || 0).toLocaleString()} birr
                  </div>
                </div>
              </div>

              <Card className="border border-slate-200/90 shadow-sm">
                <CardHeader>
                  <h3 className="font-display text-xl font-black text-slate-900">Day-by-Day Financial Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Day</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Meters Sold</th>
                          <th className="px-4 py-3">Sales Revenue</th>
                          <th className="px-4 py-3">Cost of Goods (COGS)</th>
                          <th className="px-4 py-3 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {weeklyData?.days?.map((day: any) => (
                          <tr key={day.date} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-black text-[#1976d2]">{day.day_name?.trim()}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{new Date(day.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{Number(day.meters_sold).toFixed(2)} m</td>
                            <td className="px-4 py-3 font-black text-slate-900">{Number(day.revenue).toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-extrabold text-rose-600">{Number(day.cogs).toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-right font-black text-emerald-700">{Number(day.net_profit).toLocaleString()} birr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 4: MONTHLY */}
      {subTab === 'monthly' && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">MONTHLY FINANCIAL REPORT</span>
            <h2 className="mt-1 font-display text-2xl font-black text-slate-900">ANNUAL MONTH-BY-MONTH REVIEW (JAN - DEC)</h2>
          </div>

          {loadingMonthly ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Loading monthly financials...</div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Year Revenue</span>
                  <div className="mt-2 font-display text-3xl font-black text-slate-900">
                    {Number(monthlyData?.total_revenue || 0).toLocaleString()} birr
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Year COGS</span>
                  <div className="mt-2 font-display text-3xl font-black text-rose-600">
                    {Number(monthlyData?.total_cogs || 0).toLocaleString()} birr
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Total Year Net Profit</span>
                  <div className="mt-2 font-display text-3xl font-black text-emerald-700">
                    {Number(monthlyData?.total_net_profit || 0).toLocaleString()} birr
                  </div>
                </div>
              </div>

              <Card className="border border-slate-200/90 shadow-sm">
                <CardHeader>
                  <h3 className="font-display text-xl font-black text-slate-900">Monthly Performance Table</h3>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Month</th>
                          <th className="px-4 py-3">Meters Sold</th>
                          <th className="px-4 py-3">Sales Revenue</th>
                          <th className="px-4 py-3">Cost of Goods (COGS)</th>
                          <th className="px-4 py-3">Net Profit</th>
                          <th className="px-4 py-3 text-right">Profit Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        {monthlyData?.months?.map((m: any) => {
                          const marginPct = m.revenue > 0 ? ((m.net_profit / m.revenue) * 100).toFixed(1) : 0;
                          return (
                            <tr key={m.date} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-black text-[#1976d2]">{m.month_name?.trim()}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">{Number(m.meters_sold).toFixed(2)} m</td>
                              <td className="px-4 py-3 font-black text-slate-900">{Number(m.revenue).toLocaleString()} birr</td>
                              <td className="px-4 py-3 font-extrabold text-rose-600">{Number(m.cogs).toLocaleString()} birr</td>
                              <td className="px-4 py-3 font-black text-emerald-700">{Number(m.net_profit).toLocaleString()} birr</td>
                              <td className="px-4 py-3 text-right font-extrabold text-slate-700">{marginPct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 5: YEARLY */}
      {subTab === 'yearly' && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">ANNUAL FINANCIAL STATEMENTS</span>
            <h2 className="mt-1 font-display text-2xl font-black text-slate-900">MULTI-YEAR FINANCIAL COMPARISON</h2>
          </div>

          {loadingYearly ? (
            <div className="py-12 text-center text-sm font-bold text-slate-500">Loading yearly financials...</div>
          ) : (
            <Card className="border border-slate-200/90 shadow-sm">
              <CardHeader>
                <h3 className="font-display text-xl font-black text-slate-900">Yearly Financial Summary Table</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Year</th>
                        <th className="px-4 py-3">Total Meters Sold</th>
                        <th className="px-4 py-3">Annual Revenue</th>
                        <th className="px-4 py-3">Annual Cost of Goods (COGS)</th>
                        <th className="px-4 py-3">Annual Net Profit</th>
                        <th className="px-4 py-3 text-right">Annual Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {yearlyData?.years?.map((y: any) => {
                        const marginPct = y.revenue > 0 ? ((y.net_profit / y.revenue) * 100).toFixed(1) : 0;
                        return (
                          <tr key={y.year} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 font-black text-2xl text-[#1976d2]">{y.year}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{Number(y.meters_sold).toFixed(2)} m</td>
                            <td className="px-4 py-3 font-black text-slate-900">{Number(y.revenue).toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-extrabold text-rose-600">{Number(y.cogs).toLocaleString()} birr</td>
                            <td className="px-4 py-3 font-black text-emerald-700">{Number(y.net_profit).toLocaleString()} birr</td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-700">{marginPct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// 3. DEBIT TRACKER COMPONENT
function Debits() {
  const [debitsList, setDebitsList] = useState<any[]>([]);
  const [todayDebitsList, setTodayDebitsList] = useState<any[]>([]);
  const [dailyDebitAmount, setDailyDebitAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Add Debt Modal State
  const [addDebtModalOpen, setAddDebtModalOpen] = useState(false);
  const [debtForm, setDebtForm] = useState({
    customer_name: '',
    customer_phone: '',
    item_description: '',
    total_amount: ''
  });
  const [debtSaving, setDebtSaving] = useState(false);
  const [debtError, setDebtError] = useState('');

  // Edit Debt Modal State
  const [editModalDebit, setEditModalDebit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    item_description: '',
    total_amount: '',
    paid_amount: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Reminder Modal State
  const [reminderModalDebit, setReminderModalDebit] = useState<any | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState('');

  const loadDebits = async () => {
    try {
      setLoading(true);
      const [allData, todayData] = await Promise.all([
        api<any[]>('/debits'),
        api<{ debits: any[]; total_today_debt: number }>('/debits/today')
      ]);

      setDebitsList(allData || []);
      setTodayDebitsList(todayData.debits || []);
      setDailyDebitAmount(todayData.total_today_debt || 0);
    } catch (err: any) {
      console.error('Failed to load debits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebits();
  }, []);

  // Add Debt Submit Handler
  const handleAddDebtSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDebtSaving(true);
    setDebtError('');

    try {
      const amount = Number(debtForm.total_amount);
      if (!debtForm.customer_name.trim() || isNaN(amount) || amount <= 0) {
        throw new Error('Please enter customer name and valid total debt amount');
      }

      await api('/debits', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: debtForm.customer_name.trim(),
          customer_phone: debtForm.customer_phone.trim(),
          item_description: debtForm.item_description.trim() || 'Daily Debt',
          total_amount: amount,
          paid_amount: 0
        })
      });

      setAddDebtModalOpen(false);
      setDebtForm({ customer_name: '', customer_phone: '', item_description: '', total_amount: '' });
      loadDebits();
    } catch (err: any) {
      setDebtError(err.message || 'Could not record debt');
    } finally {
      setDebtSaving(false);
    }
  };

  // Edit Debt Submit Handler
  const openEditModal = (debit: any) => {
    setEditModalDebit(debit);
    setEditForm({
      customer_name: debit.customer_name || '',
      customer_phone: debit.customer_phone || '',
      item_description: debit.item_description || '',
      total_amount: String(debit.total_amount || 0),
      paid_amount: String(debit.paid_amount || 0)
    });
    setEditError('');
  };

  const handleEditDebtSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModalDebit) return;
    setEditSaving(true);
    setEditError('');

    try {
      const totalVal = Number(editForm.total_amount);
      const paidVal = Number(editForm.paid_amount);

      if (!editForm.customer_name.trim() || isNaN(totalVal) || totalVal <= 0) {
        throw new Error('Customer name and valid total debt amount are required');
      }

      await api(`/debits/${editModalDebit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          customer_name: editForm.customer_name.trim(),
          customer_phone: editForm.customer_phone.trim(),
          item_description: editForm.item_description.trim(),
          total_amount: totalVal,
          paid_amount: isNaN(paidVal) ? 0 : paidVal
        })
      });

      setEditModalDebit(null);
      loadDebits();
    } catch (err: any) {
      setEditError(err.message || 'Could not update debit record');
    } finally {
      setEditSaving(false);
    }
  };

  // Close Debt Handler (deducts from total outstanding and deducts from daily debt if created today)
  const handleCloseDebt = async (debit: any) => {
    try {
      await api(`/debits/${debit.id}/close`, { method: 'PATCH' });

      // Check if created_at date == today
      const todayStr = new Date().toISOString().substring(0, 10);
      const createdStr = new Date(debit.created_at).toISOString().substring(0, 10);
      if (createdStr === todayStr) {
        const remaining = Number(debit.balance || debit.total_amount || 0);
        setDailyDebitAmount(prev => Math.max(0, prev - remaining));
      }

      loadDebits();
    } catch (err: any) {
      alert(err.message || 'Could not close debt');
    }
  };

  // Set Reminder Submit Handler
  const handleReminderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reminderModalDebit) return;
    setReminderSaving(true);
    setReminderError('');

    try {
      if (!reminderDate) {
        throw new Error('Please select a reminder date');
      }

      await api(`/debits/${reminderModalDebit.id}/reminder`, {
        method: 'PATCH',
        body: JSON.stringify({ due_date: reminderDate })
      });

      setReminderModalDebit(null);
      setReminderDate('');
      loadDebits();
    } catch (err: any) {
      setReminderError(err.message || 'Could not save reminder');
    } finally {
      setReminderSaving(false);
    }
  };

  // Total Outstanding Calculation
  const totalOutstanding = debitsList.reduce((sum, item) => {
    if (item.status === 'paid') return sum;
    return sum + Number(item.balance || (Number(item.total_amount || 0) - Number(item.paid_amount || 0)));
  }, 0);

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#1976d2]">CUSTOMER ACCOUNTS</span>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            DEBIT TRACKER
          </h1>
        </div>

        {/* Add Daily Debt Button */}
        <div>
          <Button
            onClick={() => setAddDebtModalOpen(true)}
            className="flex items-center gap-2 bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold shadow"
          >
            <Plus size={16} />
            ADD DAILY DEBT
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border border-slate-200/90 shadow-sm">
          <CardContent className="pt-5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Outstanding</span>
            <div className="mt-2 font-display text-3xl font-black text-slate-900">
              {totalOutstanding.toLocaleString()} birr
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">Sum of all open and overdue accounts</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90 shadow-sm">
          <CardContent className="pt-5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Daily Debt Amount (Today)</span>
            <div className="mt-2 font-display text-3xl font-black text-rose-600">
              {dailyDebitAmount.toLocaleString()} birr
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">Debits added today (resets at midnight)</p>
          </CardContent>
        </Card>
      </div>

      {/* Debits List */}
      <Card className="mt-6 border border-slate-200/90 shadow-sm">
        <CardHeader>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Accounts Receivable</p>
          <h2 className="mt-1 font-display text-xl font-black text-slate-900">Customer Debits List</h2>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm font-bold text-slate-500">Loading customer debits...</div>
          ) : debitsList.length > 0 ? (
            <div className="space-y-3">
              {debitsList.map(item => {
                const balanceVal = Number(item.balance || (Number(item.total_amount || 0) - Number(item.paid_amount || 0)));
                const phoneVal = item.customer_phone || 'No phone recorded';

                let badgeColor = 'bg-slate-100 text-slate-700';
                let badgeLabel = 'OPEN';
                if (item.status === 'due_today') {
                  badgeColor = 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse';
                  badgeLabel = 'DUE TODAY';
                } else if (item.status === 'overdue') {
                  badgeColor = 'bg-rose-100 text-rose-900 border border-rose-300 font-black';
                  badgeLabel = 'OVERDUE';
                } else if (item.status === 'paid') {
                  badgeColor = 'bg-emerald-100 text-emerald-800';
                  badgeLabel = 'PAID';
                } else if (item.due_date) {
                  badgeColor = 'bg-blue-100 text-blue-800';
                  badgeLabel = `REMINDER: ${new Date(item.due_date).toLocaleDateString()}`;
                }

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:border-slate-300 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-black text-slate-900">{item.customer_name}</h3>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-[#1976d2]">
                        <Phone size={13} className="text-[#1976d2]" />
                        <span>{phoneVal}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.item_description}</p>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Debit Money</span>
                      <strong className="text-base font-black text-slate-900">{balanceVal.toLocaleString()} birr</strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`px-2.5 py-1 text-xs font-extrabold rounded-lg ${badgeColor}`}>
                        {badgeLabel}
                      </Badge>

                      {/* Edit Button */}
                      <Button
                        variant="quiet"
                        onClick={() => openEditModal(item)}
                        className="flex items-center gap-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs"
                        title="Edit Debit Info"
                      >
                        <Pencil size={13} />
                        Edit
                      </Button>

                      {item.status !== 'paid' && (
                        <Button
                          variant="quiet"
                          onClick={() => {
                            setReminderModalDebit(item);
                            setReminderDate(item.due_date ? item.due_date.substring(0, 10) : '');
                            setReminderError('');
                          }}
                          className="flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 shadow-2xs"
                        >
                          <Bell size={14} className="text-[#1976d2]" />
                          Add Reminder
                        </Button>
                      )}

                      {item.status !== 'paid' && (
                        <Button
                          onClick={() => handleCloseDebt(item)}
                          className="flex items-center gap-1 bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold shadow-2xs"
                          title="Mark debt as paid / closed"
                        >
                          <Check size={14} />
                          Close Debt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              No debits recorded yet. Click "Add Daily Debt" or record a credit sale on the curtains page to add a record.
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Add Daily Debt */}
      {addDebtModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Debt Record</span>
                <h3 className="mt-1 font-display text-xl font-black text-slate-900">ADD DAILY DEBT</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddDebtModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDebtSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. Maya Thompson"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={debtForm.customer_name}
                  onChange={e => setDebtForm(f => ({ ...f, customer_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Phone Number
                </label>
                <input
                  placeholder="e.g. 0911 234 567"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={debtForm.customer_phone}
                  onChange={e => setDebtForm(f => ({ ...f, customer_phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item / Debt Description
                </label>
                <input
                  placeholder="e.g. Velvet living room curtain set"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={debtForm.item_description}
                  onChange={e => setDebtForm(f => ({ ...f, item_description: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Total Debt Amount (birr) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1200.00"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-base font-black text-slate-900 focus:border-[#1976d2] focus:outline-none"
                  value={debtForm.total_amount}
                  onChange={e => setDebtForm(f => ({ ...f, total_amount: e.target.value }))}
                />
              </div>

              {debtError && (
                <p className="text-xs font-bold text-red-600">{debtError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setAddDebtModalOpen(false)}
                  className="text-slate-600 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={debtSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                >
                  {debtSaving ? 'Saving...' : 'Add Debt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Debit Record */}
      {editModalDebit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Update Account</span>
                <h3 className="mt-1 font-display text-xl font-black text-slate-900">EDIT DEBIT RECORD</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalDebit(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditDebtSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={editForm.customer_name}
                  onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Customer Phone Number
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={editForm.customer_phone}
                  onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item Description
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={editForm.item_description}
                  onChange={e => setEditForm(f => ({ ...f, item_description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Total Amount (birr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                    value={editForm.total_amount}
                    onChange={e => setEditForm(f => ({ ...f, total_amount: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Paid Amount (birr)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-emerald-700 focus:border-[#1976d2] focus:outline-none"
                    value={editForm.paid_amount}
                    onChange={e => setEditForm(f => ({ ...f, paid_amount: e.target.value }))}
                  />
                </div>
              </div>

              {editError && (
                <p className="text-xs font-bold text-red-600">{editError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setEditModalDebit(null)}
                  className="text-slate-600 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Set Reminder */}
      {reminderModalDebit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Schedule Notification</span>
                <h3 className="mt-1 font-display text-xl font-black text-slate-900">
                  Set Reminder for {reminderModalDebit.customer_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderModalDebit(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Phone:</span>
                <span className="text-slate-900 font-extrabold">{reminderModalDebit.customer_phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Debit Balance:</span>
                <span className="text-rose-600 font-black">{Number(reminderModalDebit.balance || reminderModalDebit.total_amount).toLocaleString()} birr</span>
              </div>
            </div>

            <form onSubmit={handleReminderSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Reminder Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                />
              </div>

              {reminderError && (
                <p className="text-xs font-bold text-red-600">{reminderError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setReminderModalDebit(null)}
                  className="text-slate-600 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reminderSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                >
                  {reminderSaving ? 'Saving...' : 'Save Reminder'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SettingsView() {
  return (
    <Card className="max-w-2xl border border-slate-200/90 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#90caf9]/40 text-xl font-bold text-[#1976d2]">
            ZO
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Zion Owner</h2>
            <p className="text-sm text-[#607d8b]">owner@zioncurtains.com · Administrator</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="eyebrow block">
            Full Name
            <input className="field mt-2" defaultValue="Zion Owner" />
          </label>
          <label className="eyebrow block">
            Email Address
            <input className="field mt-2" defaultValue="owner@zioncurtains.com" />
          </label>
        </div>
        <Button className="mt-6 bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold">Save changes</Button>
      </CardContent>
    </Card>
  );
}

export function DashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [view, setView] = useState('overview');
  return (
    <div data-dashboard-view={view}>
      <Overview onNavigate={onNavigate} />
    </div>
  );
}

export { Overview, Curtains, Finance, Debits, SettingsView };
