'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileDown,
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  X,
  Eye,
  CheckCircle2,
  Package,
  Tag,
  Search,
  Check,
  CreditCard
} from 'lucide-react';
import { api, downloadFile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type Curtain = {
  id: string;
  item_code: string;
  item_color: string | null;
  purchase_price_per_meter: number;
  price_per_meter: number;
  stock_amount: number;
  item_image: string | null;
  created_at?: string;
  updated_at?: string;
  rolls_count?: number;
  total_sold_meters?: number;
};

type StockItem = {
  id: string;
  length_meters: number;
  status: string;
  created_at: string;
};

type SaleItem = {
  id: string;
  meters_sold: number;
  purchase_price_per_meter?: number;
  price_per_meter: number;
  total_price: number;
  sale_date: string;
};

function defaultImageFor(itemCode: string) {
  return `https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80&sig=${encodeURIComponent(itemCode)}`;
}

export function CurtainsInventory() {
  const [items, setItems] = useState<Curtain[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Auth User & Role State
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }
    api<{ id: string; email: string; full_name: string; role: string }>('/auth/me')
      .then(u => {
        setCurrentUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => {});
  }, []);

  const isAdmin = !currentUser || currentUser.role === 'admin';

  // Add Curtain Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [addForm, setAddForm] = useState({
    item_code: '',
    item_color: '',
    purchase_price_per_meter: '',
    price_per_meter: ''
  });
  const [addImageFile, setAddImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Edit Curtain Modal State
  const [editModalCurtain, setEditModalCurtain] = useState<Curtain | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    item_code: '',
    item_color: '',
    purchase_price_per_meter: '',
    price_per_meter: ''
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  // Plus (+) Modal State
  const [plusModalCurtain, setPlusModalCurtain] = useState<Curtain | null>(null);
  const [plusMeters, setPlusMeters] = useState('');
  const [plusSaving, setPlusSaving] = useState(false);
  const [plusError, setPlusError] = useState('');

  // Minus (-) Sell Stock Modal State (Grid menu selection of meter variants & credit toggle)
  const [minusModalCurtain, setMinusModalCurtain] = useState<Curtain | null>(null);
  const [minusVariants, setMinusVariants] = useState<StockItem[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);
  const [minusPrice, setMinusPrice] = useState('');
  const [minusSaving, setMinusSaving] = useState(false);
  const [minusError, setMinusError] = useState('');

  // Credit Toggle State
  const [isCreditUsed, setIsCreditUsed] = useState(false);
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [creditTotalAmount, setCreditTotalAmount] = useState('');
  const [creditPaidAmount, setCreditPaidAmount] = useState('');

  // Detail Modal State
  const [detailCurtain, setDetailCurtain] = useState<Curtain | null>(null);
  const [detailTab, setDetailTab] = useState<'instock' | 'sold'>('instock');
  const [detailInStock, setDetailInStock] = useState<StockItem[]>([]);
  const [detailSales, setDetailSales] = useState<SaleItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Toast snackbar state
  const [toastMessage, setToastMessage] = useState('');

  // Load curtains list
  const loadCurtains = async () => {
    try {
      setLoading(true);
      const data = await api<Curtain[]>('/curtains');
      setItems(data);
    } catch (err: any) {
      setGlobalError(err.message || 'Could not load curtains inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurtains();
  }, []);

  // Export DB to Excel
  const handleExportExcel = async () => {
    try {
      await downloadFile('/curtains/export', 'curtains_inventory_export.xlsx');
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  // Image Selection Handlers
  const handleAddFileChange = (file: File | null) => {
    setAddImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleEditFileChange = (file: File | null) => {
    setEditImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Add Curtain Form Submission
  const handleAddCurtainSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    setAddError('');

    try {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('item_code', addForm.item_code.trim());
      formData.append('item_color', addForm.item_color.trim());
      formData.append('purchase_price_per_meter', addForm.purchase_price_per_meter || '0');
      formData.append('price_per_meter', addForm.price_per_meter);
      formData.append('stock_amount', '0');
      if (addImageFile) {
        formData.append('image', addImageFile);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/curtains`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Could not add curtain');
      }

      setItems(prev => [resData, ...prev]);
      setAddModalOpen(false);
      setAddForm({ item_code: '', item_color: '', purchase_price_per_meter: '', price_per_meter: '' });
      setAddImageFile(null);
      setImagePreview(null);
      setToastMessage('Curtain added successfully');
      setTimeout(() => setToastMessage(''), 4000);
      loadCurtains();
    } catch (err: any) {
      setAddError(err.message || 'Could not create curtain item');
    } finally {
      setAddSaving(false);
    }
  };

  // Edit Curtain Form Submission
  const openEditModal = (curtain: Curtain) => {
    setEditModalCurtain(curtain);
    setEditForm({
      item_code: curtain.item_code,
      item_color: curtain.item_color || '',
      purchase_price_per_meter: String(curtain.purchase_price_per_meter || 0),
      price_per_meter: String(curtain.price_per_meter || 0)
    });
    setEditImageFile(null);
    setEditImagePreview(curtain.item_image || null);
    setEditError('');
  };

  const handleEditCurtainSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModalCurtain) return;
    setEditSaving(true);
    setEditError('');

    try {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('item_code', editForm.item_code.trim());
      formData.append('item_color', editForm.item_color.trim());
      formData.append('purchase_price_per_meter', editForm.purchase_price_per_meter || '0');
      formData.append('price_per_meter', editForm.price_per_meter);
      if (editImageFile) {
        formData.append('image', editImageFile);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/curtains/${editModalCurtain.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const updated = await response.json();
      if (!response.ok) {
        throw new Error(updated.message || 'Could not update curtain');
      }

      setItems(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setEditModalCurtain(null);
      setToastMessage('Curtain updated successfully');
      setTimeout(() => setToastMessage(''), 4000);
      loadCurtains();
    } catch (err: any) {
      setEditError(err.message || 'Could not update curtain item');
    } finally {
      setEditSaving(false);
    }
  };

  // Plus (+) Add Stock Submit Handler
  const handlePlusSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!plusModalCurtain) return;
    setPlusSaving(true);
    setPlusError('');

    try {
      const meters = Number(plusMeters);
      if (isNaN(meters) || meters <= 0) {
        throw new Error('Please enter a valid length in meters');
      }

      const updated = await api<Curtain>(`/curtains/${plusModalCurtain.id}/stock/add`, {
        method: 'POST',
        body: JSON.stringify({ length_meters: meters })
      });

      setItems(prev => prev.map(c => c.id === updated.id ? { 
        ...c, 
        stock_amount: updated.stock_amount,
        rolls_count: (c.rolls_count || 0) + 1 
      } : c));
      setPlusModalCurtain(null);
      setPlusMeters('');
      setToastMessage('Stock added successfully');
      setTimeout(() => setToastMessage(''), 4000);
      loadCurtains();
    } catch (err: any) {
      setPlusError(err.message || 'Could not add stock');
    } finally {
      setPlusSaving(false);
    }
  };

  // Open Minus (-) Modal (fetches available meter variants to choose from in 3-column grid)
  const openMinusModal = async (curtain: Curtain) => {
    setMinusModalCurtain(curtain);
    setMinusPrice(String(curtain.price_per_meter || 0));
    setMinusError('');
    setSelectedVariant(null);
    setIsCreditUsed(false);
    setCreditCustomerName('');
    setCreditCustomerPhone('');
    setCreditTotalAmount('');
    setCreditPaidAmount('');

    try {
      const detail = await api<{ curtain: Curtain; inStock: StockItem[] }>(`/curtains/${curtain.id}`);
      setMinusVariants(detail.inStock || []);
      if (detail.inStock && detail.inStock.length > 0) {
        setSelectedVariant(detail.inStock[0]);
      }
    } catch (err) {
      setMinusVariants([]);
    }
  };

  // Minus (-) Sell Stock Mini Form Handler
  const handleMinusSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!minusModalCurtain) return;
    setMinusSaving(true);
    setMinusError('');

    try {
      const meters = selectedVariant ? Number(selectedVariant.length_meters) : 0;
      const price = Number(minusPrice);

      if (isNaN(meters) || meters <= 0) {
        throw new Error('Please select an available curtain meter variant');
      }
      if (isNaN(price) || price < 0) {
        throw new Error('Please enter a valid price sold per meter');
      }

      if (isCreditUsed && !creditCustomerName.trim()) {
        throw new Error('Customer Name is required when using credit');
      }

      const totalSaleVal = Number((meters * price).toFixed(2));

      const payload: any = {
        meters_sold: meters,
        price_per_meter: price,
        stock_item_id: selectedVariant?.id
      };

      if (isCreditUsed) {
        payload.is_credit = true;
        payload.customer_name = creditCustomerName.trim();
        payload.customer_phone = creditCustomerPhone.trim();
        payload.credit_amount = Number(creditTotalAmount) || totalSaleVal;
        payload.paid_amount = Number(creditPaidAmount) || 0;
      }

      const res = await api<{ curtain: Curtain; sale: SaleItem }>(`/curtains/${minusModalCurtain.id}/stock/deduct`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.curtain) {
        setItems(prev => prev.map(c => c.id === res.curtain.id ? { 
          ...c, 
          stock_amount: res.curtain.stock_amount 
        } : c));
      }

      setMinusModalCurtain(null);
      setSelectedVariant(null);
      setToastMessage('Sale made successfully');
      setTimeout(() => setToastMessage(''), 4000);
      loadCurtains();
    } catch (err: any) {
      setMinusError(err.message || 'Could not process sale');
    } finally {
      setMinusSaving(false);
    }
  };

  // Open Detail Modal
  const openDetail = async (curtain: Curtain) => {
    setDetailCurtain(curtain);
    setDetailTab('instock');
    setDetailLoading(true);
    try {
      const data = await api<{ curtain: Curtain; inStock: StockItem[]; sales: SaleItem[] }>(`/curtains/${curtain.id}`);
      setDetailInStock(data.inStock || []);
      setDetailSales(data.sales || []);
    } catch (err: any) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter curtains catalogue by search query (highlights matching item_code & places at top)
  const filteredItems = [...items].sort((a, b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return 0;
    const aMatch = a.item_code.toLowerCase().includes(q);
    const bMatch = b.item_code.toLowerCase().includes(q);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  }).filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.item_code.toLowerCase().includes(q) || (item.item_color && item.item_color.toLowerCase().includes(q));
  });

  const totalVariantStockCount = items.reduce((sum, item) => {
    const count = Number(item.rolls_count ?? (item.stock_amount > 0 ? 1 : 0));
    return sum + count;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            CURTAINS CATALOGUE
          </h1>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          <Button
            variant="quiet"
            onClick={handleExportExcel}
            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm"
          >
            <FileDown size={16} className="text-emerald-600" />
            EXPORT EXCEL
          </Button>

          <Button
            onClick={() => {
              setAddModalOpen(true);
              setAddForm({ item_code: '', item_color: '', purchase_price_per_meter: '', price_per_meter: '' });
              setAddImageFile(null);
              setImagePreview(null);
              setAddError('');
            }}
            className="flex items-center gap-2 bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold shadow"
          >
            <Plus size={17} />
            ADD CURTAIN
          </Button>
        </div>
      </div>

      {/* Search Input Bar at top */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search curtain by item code..."
          className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 shadow-2xs focus:border-[#1976d2] focus:outline-none"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* KPI Summary Cards (Removed total stock available in meters box) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Curtain Items</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{items.length}</span>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-[#1976d2]">Products</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Variant Stock Count</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900">{totalVariantStockCount}</span>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Pieces</span>
          </div>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {globalError}
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm font-bold text-slate-500">
          Loading curtains catalogue...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => {
            const purchaseVal = Number(item.purchase_price_per_meter || 0);
            const priceVal = Number(item.price_per_meter || 0);
            const imgSrc = item.item_image || defaultImageFor(item.item_code);
            const variantCount = Number(item.rolls_count ?? (item.stock_amount > 0 ? 1 : 0));
            const stockMeters = Number(item.stock_amount || 0);
            const isSearched = searchQuery && item.item_code.toLowerCase().includes(searchQuery.toLowerCase().trim());

            return (
              <Card
                key={item.id}
                className={`group overflow-hidden border shadow-sm transition-all hover:shadow-md ${
                  isSearched ? 'border-[#1976d2] ring-2 ring-[#1976d2]/20' : 'border-slate-200/90'
                }`}
              >
                {/* Product Image */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <img
                    src={imgSrc}
                    alt={item.item_code}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-md">
                    <Tag size={13} className="text-blue-400" />
                    {item.item_code}
                  </div>
                  {item.item_color && (
                    <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-slate-800 shadow backdrop-blur-sm">
                      {item.item_color}
                    </div>
                  )}

                  {/* Edit Button Overlay */}
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white shadow backdrop-blur-md hover:bg-slate-900"
                    title="Edit Curtain Fields"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                </div>

                {/* Card Content */}
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Item Code</p>
                      <h3 className="font-display text-xl font-black text-slate-900">{item.item_code}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      className="flex items-center gap-1 text-xs font-bold text-[#1976d2] hover:underline"
                    >
                      <Eye size={15} />
                      View Details
                    </button>
                  </div>

                  {/* Price Section */}
                  <div className="mt-4 border-y border-slate-100 py-3">
                    {isAdmin ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Purchased Price
                          </span>
                          <span className="text-sm font-black text-slate-700 block">
                            {purchaseVal.toLocaleString()} birr/m
                          </span>
                        </div>

                        <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                            Selling Price
                          </span>
                          <span className="text-sm font-black text-emerald-700 block">
                            {priceVal.toLocaleString()} birr/m
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between">
                        <div className="text-left">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block text-left">
                            Selling Price / Meter
                          </span>
                          <span className="text-lg font-black text-slate-900 block text-left">
                            {priceVal.toLocaleString()} birr / m
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block text-right">
                            Item Color
                          </span>
                          <span className="text-sm font-bold text-slate-700 block text-right">
                            {item.item_color || '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock count + Controls */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">Stock Count</span>
                      <strong className={variantCount === 0 ? 'text-sm font-bold text-red-600' : 'text-base font-black text-slate-900'}>
                        {variantCount} {variantCount === 1 ? 'piece' : 'pieces'} ({stockMeters.toFixed(1)}m)
                      </strong>
                    </div>

                    {/* Plus (+) & Minus (-) Buttons */}
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        aria-label={`Sell stock for ${item.item_code}`}
                        disabled={stockMeters === 0}
                        onClick={() => openMinusModal(item)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 transition"
                        title="Minus (-) Record sale"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="px-2 text-xs font-extrabold text-slate-600">Stock</span>

                      <button
                        type="button"
                        aria-label={`Add stock for ${item.item_code}`}
                        onClick={() => {
                          setPlusModalCurtain(item);
                          setPlusMeters('');
                          setPlusError('');
                        }}
                        className="rounded p-1.5 text-[#1976d2] hover:bg-blue-50 transition"
                        title="Plus (+) Add stock meters"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!filteredItems.length && (
            <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Package size={36} className="mx-auto text-slate-300" />
              <h3 className="mt-3 text-base font-extrabold text-slate-800">No curtains found</h3>
              <p className="mt-1 text-xs text-slate-500">
                {searchQuery ? `No curtain item matching "${searchQuery}"` : 'Click "Add Curtain" to add your first product.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add Curtain Form */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">New Product</span>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900">ADD CURTAIN</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  setImagePreview(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddCurtainSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Item Image
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    <ImagePlus size={16} />
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleAddFileChange(e.target.files?.[0] || null)}
                  />

                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    <Camera size={16} className="text-[#1976d2]" />
                    Take Photo
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleAddFileChange(e.target.files?.[0] || null)}
                  />
                </div>

                {imagePreview && (
                  <div className="mt-3 relative h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setAddImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. CRT-001"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={addForm.item_code}
                  onChange={e => setAddForm(f => ({ ...f, item_code: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item Color
                </label>
                <input
                  placeholder="e.g. Navy Blue"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={addForm.item_color}
                  onChange={e => setAddForm(f => ({ ...f, item_color: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Purchased Price / Meter (birr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 300.00"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                    value={addForm.purchase_price_per_meter}
                    onChange={e => setAddForm(f => ({ ...f, purchase_price_per_meter: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Selling Price / Meter (birr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 450.00"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                    value={addForm.price_per_meter}
                    onChange={e => setAddForm(f => ({ ...f, price_per_meter: e.target.value }))}
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs font-bold text-red-600">{addError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => {
                    setAddModalOpen(false);
                    setImagePreview(null);
                  }}
                  className="text-slate-600 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold"
                >
                  {addSaving ? 'Saving...' : 'Add Curtain'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Curtain Item Fields */}
      {editModalCurtain && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Edit Item</span>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900">
                  EDIT CURTAIN ({editModalCurtain.item_code})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModalCurtain(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditCurtainSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Update Item Image
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    <ImagePlus size={16} />
                    Choose New File
                  </Button>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleEditFileChange(e.target.files?.[0] || null)}
                  />

                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => editCameraInputRef.current?.click()}
                    className="flex items-center gap-2 border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                  >
                    <Camera size={16} className="text-[#1976d2]" />
                    Take New Photo
                  </Button>
                  <input
                    ref={editCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleEditFileChange(e.target.files?.[0] || null)}
                  />
                </div>

                {editImagePreview && (
                  <div className="mt-3 relative h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <img src={editImagePreview} alt="Edit Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item Code <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={editForm.item_code}
                  onChange={e => setEditForm(f => ({ ...f, item_code: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Item Color
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                  value={editForm.item_color}
                  onChange={e => setEditForm(f => ({ ...f, item_color: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Purchased Price / Meter (birr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                    value={editForm.purchase_price_per_meter}
                    onChange={e => setEditForm(f => ({ ...f, purchase_price_per_meter: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                    Selling Price / Meter (birr) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold focus:border-[#1976d2] focus:outline-none"
                    value={editForm.price_per_meter}
                    onChange={e => setEditForm(f => ({ ...f, price_per_meter: e.target.value }))}
                  />
                </div>
              </div>

              {editError && (
                <p className="text-xs font-bold text-red-600">{editError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setEditModalCurtain(null)}
                  className="text-slate-600 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold"
                >
                  {editSaving ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plus (+) Add Stock Modal */}
      {plusModalCurtain && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Add Stock</span>
                <h3 className="mt-1 font-display text-xl font-black text-slate-900">
                  {plusModalCurtain.item_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlusModalCurtain(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePlusSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Curtain in Meters to Add <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  autoFocus
                  placeholder="e.g. 25.00"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-base font-black text-slate-900 focus:border-[#1976d2] focus:outline-none"
                  value={plusMeters}
                  onChange={e => setPlusMeters(e.target.value)}
                />
              </div>

              {plusError && (
                <p className="text-xs font-bold text-red-600">{plusError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setPlusModalCurtain(null)}
                  className="text-slate-600 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={plusSaving}
                  className="bg-[#1976d2] hover:bg-[#1565c0] text-white text-xs font-extrabold"
                >
                  {plusSaving ? 'Adding...' : 'Add Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minus (-) Record Sale Modal (with 3-Column Grid Variant Menu Selection & Credit Toggle) */}
      {minusModalCurtain && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-red-600 uppercase tracking-wider">Record Sale</span>
                <h3 className="mt-1 font-display text-xl font-black text-slate-900">
                  {minusModalCurtain.item_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMinusModalCurtain(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMinusSubmit} className="mt-5 space-y-4">
              {/* Variant Choice Selection (3-Column Grid Menu) */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Select In-Stock Meter Variant Piece <span className="text-red-500">*</span>
                </label>
                {minusVariants.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {minusVariants.map((v, idx) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariant(v);
                          const meters = Number(v.length_meters || 0);
                          const price = Number(minusPrice || 0);
                          setCreditTotalAmount(String(Number((meters * price).toFixed(2))));
                        }}
                        className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition ${
                          selectedVariant?.id === v.id
                            ? 'border-[#1976d2] bg-blue-50 text-[#1976d2] font-black ring-2 ring-[#1976d2]/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Piece #{idx + 1}</span>
                        <span className="text-base font-black mt-0.5">{Number(v.length_meters).toFixed(1)}m</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900 text-center">
                    Using total available stock: {Number(minusModalCurtain.stock_amount).toFixed(1)} meters
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  Price Sold Per Meter (birr) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 450.00"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-red-500 focus:outline-none"
                  value={minusPrice}
                  onChange={e => {
                    const val = e.target.value;
                    setMinusPrice(val);
                    const meters = selectedVariant ? Number(selectedVariant.length_meters) : Number(minusModalCurtain?.stock_amount || 0);
                    const price = Number(val || 0);
                    setCreditTotalAmount(String(Number((meters * price).toFixed(2))));
                  }}
                />
              </div>

              {/* Total Revenue Preview Box */}
              {selectedVariant && Number(minusPrice) >= 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex justify-between items-center text-sm font-bold text-emerald-900">
                  <span>Selected Piece ({selectedVariant.length_meters.toFixed(1)}m * {minusPrice} birr/m):</span>
                  <span className="text-base font-black">
                    {(Number(selectedVariant.length_meters) * Number(minusPrice)).toLocaleString()} birr
                  </span>
                </div>
              )}

              {/* Credit Toggle Switch */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-[#1976d2]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Has the customer used credit?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isCreditUsed;
                      setIsCreditUsed(nextState);
                      if (nextState) {
                        const meters = selectedVariant ? Number(selectedVariant.length_meters) : Number(minusModalCurtain?.stock_amount || 0);
                        const price = Number(minusPrice || 0);
                        setCreditTotalAmount(String(Number((meters * price).toFixed(2))));
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      isCreditUsed ? 'bg-[#1976d2]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        isCreditUsed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isCreditUsed && (
                  <div className="pt-2 space-y-3 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        placeholder="e.g. Maya Thompson"
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
                        value={creditCustomerName}
                        onChange={e => setCreditCustomerName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                        Customer Phone Number
                      </label>
                      <input
                        placeholder="e.g. 0911 234 567"
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
                        value={creditCustomerPhone}
                        onChange={e => setCreditCustomerPhone(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Total Credit Value (birr)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 1500.00"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-rose-600 focus:border-[#1976d2] focus:outline-none"
                          value={creditTotalAmount}
                          onChange={e => setCreditTotalAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Amount Paid Today (birr)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 500.00"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-black text-emerald-700 focus:border-[#1976d2] focus:outline-none"
                          value={creditPaidAmount}
                          onChange={e => setCreditPaidAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Live Unpaid Debt Summary */}
                    <div className="rounded-lg bg-slate-100 p-2.5 text-xs font-bold text-slate-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Sale Value:</span>
                        <span className="text-slate-900 font-black">
                          {(Number(creditTotalAmount) || (selectedVariant ? Number(selectedVariant.length_meters) * Number(minusPrice || 0) : 0)).toLocaleString()} birr
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Cash Paid Today:</span>
                        <span className="font-black">{(Number(creditPaidAmount) || 0).toLocaleString()} birr</span>
                      </div>
                      <div className="flex justify-between text-rose-600 border-t border-slate-200/80 pt-1">
                        <span>Net Unpaid Debt Added:</span>
                        <span className="font-black">
                          {Math.max(0, (Number(creditTotalAmount) || (selectedVariant ? Number(selectedVariant.length_meters) * Number(minusPrice || 0) : 0)) - (Number(creditPaidAmount) || 0)).toLocaleString()} birr
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {minusError && (
                <p className="text-xs font-bold text-red-600">{minusError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setMinusModalCurtain(null)}
                  className="text-slate-600 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={minusSaving}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold"
                >
                  {minusSaving ? 'Processing...' : 'Confirm Sale & Subtract Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {detailCurtain && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs" role="dialog">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#1976d2] uppercase tracking-wider">Item Variants & Sales</span>
                <h2 className="mt-1 font-display text-2xl font-black text-slate-900">
                  {detailCurtain.item_code}
                </h2>
                {detailCurtain.item_color && (
                  <p className="text-xs font-bold text-slate-500 mt-0.5">Color: {detailCurtain.item_color}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailCurtain(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setDetailTab('instock')}
                className={`border-b-2 px-4 py-2.5 text-sm font-black transition ${
                  detailTab === 'instock'
                    ? 'border-[#1976d2] text-[#1976d2]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                In-Stock Meter Variants ({detailInStock.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('sold')}
                className={`border-b-2 px-4 py-2.5 text-sm font-black transition ${
                  detailTab === 'sold'
                    ? 'border-[#1976d2] text-[#1976d2]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Sold History ({detailSales.length})
              </button>
            </div>

            <div className="mt-5">
              {detailLoading ? (
                <p className="py-8 text-center text-sm font-bold text-slate-500">Loading details...</p>
              ) : detailTab === 'instock' ? (
                <div className="space-y-3">
                  {detailInStock.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Variant Piece</th>
                            <th className="px-4 py-3">Length (Meters)</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date Added</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {detailInStock.map((stock, idx) => (
                            <tr key={stock.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-extrabold text-slate-900">
                                Variant Piece #{idx + 1}
                              </td>
                              <td className="px-4 py-3 font-black text-[#1976d2]">
                                {stock.length_meters.toFixed(2)} m
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-700">
                                  <CheckCircle2 size={12} />
                                  Available
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {new Date(stock.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                      No active meter variants in stock. Press (+) on the item card to add stock.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {detailSales.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Sale Date</th>
                            <th className="px-4 py-3">Meters Sold</th>
                            {isAdmin && <th className="px-4 py-3">Purchased / Meter</th>}
                            <th className="px-4 py-3">Selling / Meter</th>
                            <th className="px-4 py-3">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {detailSales.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {new Date(sale.sale_date).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 font-black text-slate-900">
                                {sale.meters_sold.toFixed(2)} m
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3 font-bold text-slate-500">
                                  {Number(sale.purchase_price_per_meter || 0).toLocaleString()} birr
                                </td>
                              )}
                              <td className="px-4 py-3 font-extrabold text-slate-700">
                                {sale.price_per_meter.toLocaleString()} birr
                              </td>
                              <td className="px-4 py-3 font-black text-emerald-700">
                                {sale.total_price.toLocaleString()} birr
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                      No sales recorded for this curtain yet. Press (-) on the item card to record a sale.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Snackbar */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-emerald-900 text-white px-5 py-3.5 shadow-2xl border border-emerald-700 animate-bounce">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="ml-2 rounded p-1 text-emerald-300 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
