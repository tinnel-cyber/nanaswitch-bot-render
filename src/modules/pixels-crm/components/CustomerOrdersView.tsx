import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Share2,
  Trash2,
  Edit,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  ShoppingCart,
  MessageCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  Package,
  FileCheck,
  AlertCircle,
  PenTool,
  Loader2
} from 'lucide-react';
import {
  CustomerOrder,
  OrderItem,
  OrderDocumentType,
  OrderStatus,
  InventoryProduct,
  DebtCustomer,
  StoreUser,
  CartItem
} from '../../../types';
import {
  formatOrderCFA,
  getDocumentTypeLabel,
  generateOrderWhatsAppMessage,
  getWhatsAppShareUrl,
  downloadOrderDocumentPdf,
  cleanPhoneForWhatsApp
} from '../../../utils/orderDocumentGenerator';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

interface CustomerOrdersViewProps {
  orders: CustomerOrder[];
  inventory: InventoryProduct[];
  customers: DebtCustomer[];
  currentUser?: StoreUser | null;
  onBackToRegister: () => void;
  onSaveOrder: (order: CustomerOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onLoadOrderIntoCart?: (items: CartItem[]) => void;
  onOpenDocuSign?: (orderTitle?: string) => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  orders,
  inventory,
  customers,
  currentUser,
  onBackToRegister,
  onSaveOrder,
  onDeleteOrder,
  onLoadOrderIntoCart,
  onOpenDocuSign,
}) => {
  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | OrderDocumentType>('ALL');

  // WhatsApp Preview Modal State
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<CustomerOrder | null>(null);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatingPdfOrderId, setGeneratingPdfOrderId] = useState<string | null>(null);

  // Form State for Create / Edit
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderDocumentType>('BON_COMMANDE');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('EN_ATTENTE');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  
  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Items in Order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [inventorySearch, setInventorySearch] = useState('');

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<string>('Espèces à la livraison');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate unique order number
  const generateNewOrderNumber = (type: OrderDocumentType): string => {
    const prefix = type === 'BON_COMMANDE' ? 'BC' : type === 'BON_LIVRAISON' ? 'BL' : 'DEV';
    const yearMonth = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${yearMonth}-${randomNum}`;
  };

  // Open creation form clean
  const handleOpenCreateForm = () => {
    playTapBeep();
    setEditingOrderId(null);
    setOrderType('BON_COMMANDE');
    setOrderStatus('EN_ATTENTE');
    setOrderNumber(generateNewOrderNumber('BON_COMMANDE'));
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderItems([]);
    setDiscount(0);
    setDepositAmount(0);
    setPaymentTerms('Espèces à la livraison');
    setNotes('');
    setFormError(null);
    setActiveTab('CREATE');
  };

  // Open edit form for existing order
  const handleOpenEditForm = (order: CustomerOrder) => {
    playTapBeep();
    setEditingOrderId(order.id);
    setOrderType(order.type);
    setOrderStatus(order.status);
    setOrderNumber(order.orderNumber);
    setOrderDate(order.date);
    setDeliveryDate(order.deliveryDate || '');
    setSelectedCustomerId(order.customerId || '');
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || '');
    setCustomerAddress(order.customerAddress || '');
    setOrderItems([...order.items]);
    setDiscount(order.discount);
    setDepositAmount(order.depositAmount);
    setPaymentTerms(order.paymentTerms || '');
    setNotes(order.notes || '');
    setFormError(null);
    setActiveTab('CREATE');
  };

  // When customer is selected from dropdown
  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      return;
    }
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  // Add product from inventory
  const handleAddProductFromInventory = (product: InventoryProduct) => {
    playTapBeep();
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          total: product.sellingPrice,
        },
      ];
    });
  };

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const price = Number(customItemPrice) || 0;
    const qty = Math.max(1, customItemQty || 1);

    playTapBeep();
    setOrderItems((prev) => [
      ...prev,
      {
        id: `item-custom-${Date.now()}`,
        name: customItemName.trim(),
        quantity: qty,
        unitPrice: price,
        total: price * qty,
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
  };

  // Update item quantity
  const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setOrderItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setOrderItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, quantity: newQty, total: newQty * i.unitPrice }
            : i
        )
      );
    }
  };

  // Update item unit price
  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, unitPrice: newPrice, total: i.quantity * newPrice }
          : i
      )
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    playTapBeep();
    setOrderItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Calculated totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const netTotal = Math.max(0, subtotal - (Number(discount) || 0));
  const remainingBalance = Math.max(0, netTotal - (Number(depositAmount) || 0));

  // Open WhatsApp Share Modal
  const openWhatsAppModal = (order: CustomerOrder) => {
    setWhatsappModalOrder(order);
    setWhatsappPhoneInput(order.customerPhone || '');
    setCopiedSuccess(false);
  };

  // Save handler
  const handleSaveCurrentOrder = (andAction?: 'PDF' | 'WHATSAPP'): CustomerOrder | null => {
    if (!customerName.trim()) {
      setFormError('Veuillez renseigner le nom du client');
      return null;
    }
    if (orderItems.length === 0) {
      setFormError('Ajoutez au moins un article dans la commande');
      return null;
    }

    const currentStoreId = currentUser?.storeId || 'store-nana-1';
    const orderToSave: CustomerOrder = {
      id: editingOrderId || `order-${Date.now()}`,
      orderNumber: orderNumber.trim() || generateNewOrderNumber(orderType),
      storeId: currentStoreId,
      type: orderType,
      status: orderStatus,
      date: orderDate || new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate.trim() || undefined,
      customerId: selectedCustomerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      items: orderItems,
      subtotal,
      discount: Number(discount) || 0,
      total: netTotal,
      depositAmount: Number(depositAmount) || 0,
      remainingBalance,
      paymentTerms: paymentTerms.trim() || undefined,
      notes: notes.trim() || undefined,
      createdByName: currentUser?.name || 'Gérant',
      createdAt: editingOrderId
        ? orders.find((o) => o.id === editingOrderId)?.createdAt || Date.now()
        : Date.now(),
    };

    playValidationBeep();
    onSaveOrder(orderToSave);
    setFormError(null);

    if (andAction === 'PDF') {
      setIsGeneratingPdf(true);
      setTimeout(() => {
        downloadOrderDocumentPdf(orderToSave, currentUser);
        setIsGeneratingPdf(false);
      }, 100);
    } else if (andAction === 'WHATSAPP') {
      openWhatsAppModal(orderToSave);
    } else {
      setActiveTab('LIST');
    }

    return orderToSave;
  };

  // Send WhatsApp message
  const handleLaunchWhatsApp = () => {
    if (!whatsappModalOrder) return;
    playTapBeep();
    const message = generateOrderWhatsAppMessage(whatsappModalOrder, currentUser);
    const url = getWhatsAppShareUrl(whatsappPhoneInput, message);
    window.open(url, '_blank');
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWhatsAppText = () => {
    if (!whatsappModalOrder) return;
    const message = generateOrderWhatsAppMessage(whatsappModalOrder, currentUser);
    navigator.clipboard.writeText(message);
    setCopiedSuccess(true);
    playTapBeep();
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customerPhone && o.customerPhone.includes(searchQuery));

      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || o.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  // Overall Statistics
  const totalOrdersAmount = orders.reduce((sum, o) => sum + o.total, 0);
  const totalDeposits = orders.reduce((sum, o) => sum + o.depositAmount, 0);
  const totalRemaining = orders.reduce((sum, o) => sum + o.remainingBalance, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'EN_ATTENTE' || o.status === 'CONFIRME').length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <header className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            id="btn-back-from-orders"
            type="button"
            onClick={onBackToRegister}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Retour à la caisse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <h1 className="text-sm font-black tracking-wide text-white">Bons & Commandes Clients</h1>
            </div>
            <p className="text-[10px] text-slate-400">
              Devis, bons de commande & de livraison avec export PDF & WhatsApp
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Liste / Nouveau / Signer) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-orders-list"
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('LIST');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bons ({orders.length})
          </button>
          <button
            id="tab-orders-create"
            type="button"
            onClick={handleOpenCreateForm}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CREATE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer</span>
          </button>
          {onOpenDocuSign && (
            <button
              id="tab-orders-sign"
              type="button"
              onClick={() => {
                playTapBeep();
                onOpenDocuSign('Document Commercial');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40"
              title="Signature électronique de document"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
              <span>Signer</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 scrollbar-thin scrollbar-thumb-slate-700">
        {activeTab === 'LIST' ? (
          /* =================== VUE LISTE DES COMMANDES =================== */
          <div className="space-y-3">
            {/* Quick Summary KPIs */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
                <div className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider">Total Bons</div>
                <div className="text-xs font-black text-white mt-0.5">{orders.length}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
                <div className="text-[9.5px] text-amber-400 font-semibold uppercase tracking-wider">En cours</div>
                <div className="text-xs font-black text-amber-300 mt-0.5">{pendingOrdersCount}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
                <div className="text-[9.5px] text-emerald-400 font-semibold uppercase tracking-wider">Acomptes</div>
                <div className="text-xs font-black text-emerald-300 mt-0.5 truncate">{formatOrderCFA(totalDeposits)}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-center">
                <div className="text-[9.5px] text-rose-400 font-semibold uppercase tracking-wider">Reste Dû</div>
                <div className="text-xs font-black text-rose-300 mt-0.5 truncate">{formatOrderCFA(totalRemaining)}</div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher client, N° bon, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 border-amber-400 text-amber-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('EN_ATTENTE')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'EN_ATTENTE'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  En attente
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CONFIRME')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'CONFIRME'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  Confirmé
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LIVRE')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'LIVRE'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  Livré
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PAYE')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer shrink-0 ${
                    statusFilter === 'PAYE'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  Payé
                </button>
              </div>
            </div>

            {/* Orders Cards List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-300">Aucun bon trouvé</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'Modifiez vos critères de recherche ou filtre.'
                      : 'Créez votre premier bon de commande ou devis pour un client.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateForm}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau Bon de Commande</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredOrders.map((order) => {
                  const isPaid = order.status === 'PAYE';
                  const isDelivered = order.status === 'LIVRE';
                  const isProforma = order.type === 'DEVIS_PROFORMA';
                  const isDeliveryNote = order.type === 'BON_LIVRAISON';

                  return (
                    <div
                      key={order.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 space-y-2.5 transition-all shadow-md"
                    >
                      {/* Top Row: Type, Number, Date, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isDeliveryNote
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : isProforma
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {getDocumentTypeLabel(order.type)}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-200">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {order.date}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            order.status === 'PAYE'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : order.status === 'LIVRE'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : order.status === 'CONFIRME'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Customer Info Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center border border-slate-700 shrink-0">
                            {order.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white leading-tight">{order.customerName}</div>
                            <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 mt-0.5">
                              {order.customerPhone && (
                                <a
                                  href={`tel:${cleanPhoneForWhatsApp(order.customerPhone)}`}
                                  className="flex items-center gap-1 text-emerald-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{order.customerPhone}</span>
                                </a>
                              )}
                              {((order as any).deliveryAddress || order.customerAddress) && (
                                <span className="flex items-center gap-1 text-slate-300">
                                  <MapPin className="w-2.5 h-2.5 text-rose-400" />
                                  <span>{(order as any).deliveryAddress || order.customerAddress}</span>
                                </span>
                              )}
                              {(order as any).customerEmail && (
                                <span className="text-slate-400">
                                  ✉️ {(order as any).customerEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {order.deliveryDate && (
                          <div className="text-right">
                            <div className="text-[9.5px] text-slate-400">Livraison prévue</div>
                            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1 justify-end">
                              <Truck className="w-3 h-3 text-amber-400" />
                              <span>{order.deliveryDate}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Statut Paiement & Changement rapide de statut */}
                      {(() => {
                        const anyOrder = order as any;
                        const isPaid = (anyOrder.paymentStatus || '').includes('PAYÉ') || order.status === 'PAYE';
                        const isDelivering = anyOrder.deliveryStatus === 'En cours de livraison' || order.status === 'CONFIRME';
                        const isDelivered = anyOrder.deliveryStatus === 'Livrée' || order.status === 'LIVRE';
                        const amount = anyOrder.totalAmount || order.total;

                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-800">
                            <div>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-black">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>✅ PAYÉ {anyOrder.paymentOperator ? `(${anyOrder.paymentOperator})` : ''}</span>
                                  {anyOrder.transactionId && (
                                    <span className="font-mono text-[9px] bg-emerald-950 px-1 rounded border border-emerald-500/30">
                                      ID: {anyOrder.transactionId}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-black">
                                  <Truck className="w-3 h-3 text-amber-400" />
                                  <span>🚚 PAIEMENT À LA LIVRAISON — Encaisser {formatOrderCFA(amount)}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {!isDelivering && !isDelivered && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playTapBeep();
                                    onSaveOrder({
                                      ...order,
                                      status: 'CONFIRME',
                                      deliveryStatus: 'En cours de livraison'
                                    } as any);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-[10px] transition cursor-pointer"
                                >
                                  🛵 En livraison
                                </button>
                              )}
                              {!isDelivered && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playValidationBeep();
                                    onSaveOrder({
                                      ...order,
                                      status: 'LIVRE',
                                      deliveryStatus: 'Livrée'
                                    } as any);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-[10px] transition cursor-pointer"
                                >
                                  ✅ Livrée
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Items Summary */}
                      <div className="text-[11px] text-slate-400 space-y-0.5 px-0.5">
                        <div className="font-semibold text-slate-300 flex items-center justify-between">
                          <span>{order.items.length} article(s) :</span>
                          <span className="text-white font-mono font-bold">{formatOrderCFA(order.total)}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(' • ')}
                        </div>
                      </div>

                      {/* Financial Detail Bar: Total, Deposit, Remaining */}
                      <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-800/80">
                        <div className="text-slate-400">
                          Acompte :{' '}
                          <span className="font-bold text-emerald-400">
                            {formatOrderCFA(order.depositAmount)}
                          </span>
                        </div>
                        <div>
                          Reste dû :{' '}
                          <span
                            className={`font-black font-mono text-xs ${
                              order.remainingBalance === 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatOrderCFA(order.remainingBalance)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row: PDF, WhatsApp, Signer, Livreur, Caisse, Edit, Delete */}
                      <div className="grid grid-cols-6 gap-1.5 pt-1">
                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            setGeneratingPdfOrderId(order.id);
                            setTimeout(() => {
                              downloadOrderDocumentPdf(order, currentUser);
                              setGeneratingPdfOrderId(null);
                            }, 100);
                          }}
                          disabled={generatingPdfOrderId === order.id}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          title="Télécharger le bon en PDF A4"
                        >
                          {generatingPdfOrderId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden xs:inline">
                            {generatingPdfOrderId === order.id ? 'PDF...' : 'PDF'}
                          </span>
                        </button>

                        {/* Send WhatsApp */}
                        <button
                          type="button"
                          onClick={() => {
                            playTapBeep();
                            openWhatsAppModal(order);
                          }}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          title="Envoyer le bon par WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden xs:inline">WA</span>
                        </button>

                        {/* Partager au livreur sur WhatsApp */}
                        <a
                          href={(() => {
                            const anyOrder = order as any;
                            const address = anyOrder.deliveryAddress || order.customerAddress || 'Non précisée';
                            const amount = anyOrder.totalAmount || order.total || 0;
                            const isPaid = (anyOrder.paymentStatus || '').includes('PAYÉ') || order.status === 'PAYE';
                            const msg = encodeURIComponent(
                              `🛵 *COURSE DE LIVRAISON • ${(currentUser?.storeName || 'BOUTIQUE').toUpperCase()}*\n\n` +
                              `📋 *Réf Commande :* ${order.orderNumber}\n` +
                              `👤 *Client :* ${order.customerName}\n` +
                              `📞 *Téléphone Client :* ${order.customerPhone || 'Non renseigné'}\n` +
                              `📍 *Quartier / Adresse :* ${address}\n\n` +
                              `📦 *Articles à livrer :*\n` +
                              order.items.map((i) => `  • ${i.quantity}x ${i.name}`).join('\n') +
                              `\n\n💰 *MONTANT TOTAL :* ${formatOrderCFA(amount)}\n` +
                              `💳 *STATUT PAIEMENT :* ${
                                isPaid
                                  ? '✅ DÉJÀ PAYÉ EN LIGNE (Ne rien encaisser)'
                                  : `⚠️ À ENCAISSER EN ESPÈCES AU CLIENT : ${formatOrderCFA(amount)}`
                              }\n\nMerci de livrer au plus vite !`
                            );
                            return `https://wa.me/?text=${msg}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => playTapBeep()}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          title="Partager les coordonnées et articles au livreur sur WhatsApp"
                        >
                          <Truck className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden xs:inline">Livreur</span>
                        </a>

                        {/* Signer le bon (DocuSignHub) */}
                        {onOpenDocuSign && (
                          <button
                            type="button"
                            onClick={() => {
                              playTapBeep();
                              onOpenDocuSign(`Bon ${order.orderNumber} - ${order.customerName}`);
                            }}
                            className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                            title="Signer électroniquement ce bon (DocuSign)"
                          >
                            <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden xs:inline">Signer</span>
                          </button>
                        )}

                        {/* Load into register/caisse (if handler available) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onLoadOrderIntoCart) {
                              playValidationBeep();
                              const cartItems: CartItem[] = order.items.map((i) => ({
                                id: i.productId || i.id,
                                name: i.name,
                                price: i.unitPrice,
                                quantity: i.quantity,
                              }));
                              onLoadOrderIntoCart(cartItems);
                            }
                          }}
                          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                          title="Injecter dans la caisse pour encaissement direct"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden xs:inline">Caisse</span>
                        </button>

                        {/* Edit / More actions */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(order)}
                            className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
                            title="Modifier ce bon"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Supprimer le bon ${order.orderNumber} ?`)) {
                                playTapBeep();
                                onDeleteOrder(order.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs active:scale-95 transition-all cursor-pointer"
                            title="Supprimer ce bon"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* =================== FORMULAIRE CRÉATION / MODIFICATION =================== */
          <div className="space-y-3 pb-8">
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-black text-white">
                  {editingOrderId ? 'Modifier le Bon' : 'Créer un Nouveau Bon'}
                </h2>
                <p className="text-[10px] text-slate-400">Remplissez les détails pour générer le PDF & WhatsApp</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                Annuler
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Document Type Selector (Bon de Commande / Bon de Livraison / Devis) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type de Document</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setOrderType('BON_COMMANDE');
                    if (!editingOrderId) setOrderNumber(generateNewOrderNumber('BON_COMMANDE'));
                  }}
                  className={`py-2 px-1 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'BON_COMMANDE'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Bon de Commande
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setOrderType('BON_LIVRAISON');
                    if (!editingOrderId) setOrderNumber(generateNewOrderNumber('BON_LIVRAISON'));
                  }}
                  className={`py-2 px-1 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'BON_LIVRAISON'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Bon de Livraison
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setOrderType('DEVIS_PROFORMA');
                    if (!editingOrderId) setOrderNumber(generateNewOrderNumber('DEVIS_PROFORMA'));
                  }}
                  className={`py-2 px-1 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                    orderType === 'DEVIS_PROFORMA'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Devis Proforma
                </button>
              </div>
            </div>

            {/* Document Reference & Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400">N° de Bon / Réf</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400">Date d'émission</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-400">Livraison prévue (Optionnel)</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Customer Selection & Details */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Informations Client</span>
                </span>
                {customers.length > 0 && (
                  <span className="text-[10px] text-slate-400">Ou choisir client existant :</span>
                )}
              </div>

              {/* Fast Pick from Existing Customers */}
              {customers.length > 0 && (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white outline-none"
                >
                  <option value="">-- Sélectionner un client enregistré --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Nom du client *</label>
                  <input
                    type="text"
                    placeholder="ex: Mamadou Koné, Superette Yopougon..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Téléphone WhatsApp (pour envoi direct)</label>
                  <div className="relative mt-1">
                    <Phone className="w-3 h-3 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="ex: +225 07 12 34 56 78"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400">Adresse / Lieu de livraison</label>
                  <input
                    type="text"
                    placeholder="ex: Treichville Rue 12, devant la pharmacie..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Articles Selection: From Inventory or Custom */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Articles du Bon ({orderItems.length})</span>
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  Total : {formatOrderCFA(subtotal)}
                </span>
              </div>

              {/* Quick search in inventory to add */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">
                  Ajout rapide depuis l'inventaire boutique :
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer un produit de l'inventaire..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                  />
                </div>

                {/* Filtered Inventory Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {inventory
                    .filter((p) =>
                      inventorySearch
                        ? p.name.toLowerCase().includes(inventorySearch.toLowerCase())
                        : true
                    )
                    .slice(0, 8)
                    .map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddProductFromInventory(prod)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left shrink-0 transition-all cursor-pointer active:scale-95"
                      >
                        <div className="text-[11px] font-bold text-slate-200 truncate max-w-[120px]">{prod.name}</div>
                        <div className="text-[9.5px] text-amber-400 font-mono">
                          {formatOrderCFA(prod.sellingPrice)} • <span className="text-slate-400">Stock: {prod.stock}</span>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Add Custom Item form */}
              <form onSubmit={handleAddCustomItem} className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">
                  Ou ajouter un article personnalisé / hors stock :
                </label>
                <div className="grid grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    placeholder="Désignation article..."
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="col-span-5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qté"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(parseInt(e.target.value) || 1)}
                    className="col-span-2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none text-center"
                  />
                  <input
                    type="number"
                    placeholder="Prix U."
                    min="0"
                    step="25"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value ? parseInt(e.target.value) : '')}
                    className="col-span-3 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="col-span-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                  >
                    + Ajout
                  </button>
                </div>
              </form>

              {/* Items Table List in Form */}
              {orderItems.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Articles sélectionnés :
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/90 text-xs"
                      >
                        <div className="flex-1 pr-2 truncate">
                          <div className="font-bold text-white truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatOrderCFA(item.unitPrice)} l'unité
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 shrink-0 mr-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold font-mono text-white text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right font-mono font-bold text-white shrink-0 min-w-[70px]">
                          {formatOrderCFA(item.total)}
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="ml-2 text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary & Settlement Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Règlement & Conditions</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Remise accordée (F CFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-400">Acompte déjà versé (F CFA)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Net Total & Remaining Balance Display */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Sous-total :</span>
                  <span className="font-mono text-slate-300">{formatOrderCFA(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-xs text-rose-400">
                    <span>Remise :</span>
                    <span className="font-mono">- {formatOrderCFA(discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-black text-white pt-1 border-t border-slate-800">
                  <span>TOTAL NET :</span>
                  <span className="font-mono text-amber-300">{formatOrderCFA(netTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Reste à payer :</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      remainingBalance === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatOrderCFA(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Status & Terms */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Statut du bon</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                  >
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="CONFIRME">Confirmé</option>
                    <option value="LIVRE">Livré</option>
                    <option value="PAYE">Payé</option>
                    <option value="ANNULE">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400">Modalités de règlement</label>
                  <input
                    type="text"
                    placeholder="ex: Wave, Espèces à la livraison..."
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                  />
                  <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-0.5 text-[9.5px]">
                    <button
                      type="button"
                      onClick={() => setPaymentTerms('Espèces à la livraison')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer shrink-0"
                    >
                      Espèces à la livraison
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTerms('Mobile Money (Wave / Orange)')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer shrink-0"
                    >
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTerms('Lien WhatsApp')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer shrink-0"
                    >
                      Lien WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400">Remarques & Notes client</label>
                <textarea
                  rows={2}
                  placeholder="ex: Marchandise emballée sous film, appeler avant de livrer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons: Save, Download PDF, Send WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSaveCurrentOrder()}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Enregistrer</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveCurrentOrder('PDF')}
                disabled={isGeneratingPdf}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Génération du PDF en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Enregistrer & PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSaveCurrentOrder('WHATSAPP')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enregistrer & WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================== MODAL PRÉVISUALISATION WHATSAPP =================== */}
      {whatsappModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Partage WhatsApp</h3>
                  <p className="text-[10px] text-slate-400">{whatsappModalOrder.orderNumber} • {whatsappModalOrder.customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Phone Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">Numéro WhatsApp du destinataire :</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="ex: +225 07 00 00 00 00"
                  value={whatsappPhoneInput}
                  onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400">Aperçu du texte généré :</label>
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSuccess ? '✓ Copié !' : 'Copier texte'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                {generateOrderWhatsAppMessage(whatsappModalOrder, currentUser)}
              </div>
            </div>

            {/* Send CTA */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleLaunchWhatsApp}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir dans WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrdersView;
