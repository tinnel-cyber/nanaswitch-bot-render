import React, { useState, useEffect, useCallback } from 'react';
import { DebtCustomer } from '../../../types';
import { formatCFA, playCashChime, playValidationBeep } from '../../../utils/audio';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Banknote,
  MessageSquare,
  Copy,
  ExternalLink,
  Send,
  X,
  Clock,
  Check
} from 'lucide-react';

interface DebtBookViewProps {
  customers: DebtCustomer[];
  onBackToRegister: () => void;
  onRecordPayment: (customerId: string, amount: number) => void;
  onAddCustomerDebt: (customerName: string, phone: string, amount: number, description: string) => void;
  initialCustomerId?: string | null;
}

export const DebtBookView: React.FC<DebtBookViewProps> = ({
  customers,
  onBackToRegister,
  onRecordPayment,
  onAddCustomerDebt,
  initialCustomerId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<DebtCustomer | null>(() => {
    if (initialCustomerId) {
      return customers.find(c => c.id === initialCustomerId || c.shortName?.toLowerCase().includes('mamadou')) || null;
    }
    return null;
  });

  useEffect(() => {
    if (initialCustomerId) {
      const match = customers.find(c => c.id === initialCustomerId || c.shortName?.toLowerCase().includes('mamadou'));
      if (match) setSelectedCustomer(match);
    }
  }, [initialCustomerId, customers]);
  
  // Modals inside debt book
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);

  // SMS Relance Modal
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsCustomer, setSmsCustomer] = useState<DebtCustomer | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Add Debt Modal
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDesc, setNewDebtDesc] = useState('');

  // Total global dû à la boutique
  const totalGlobalDebt = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalDebtorsCount = customers.filter(c => c.totalDebt > 0).length;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  // Open 'Régler la dette' modal
  const handleOpenPay = (customer: DebtCustomer) => {
    setSelectedCustomer(customer);
    setPayAmount(customer.totalDebt);
    setIsPayModalOpen(true);
  };

  // Open 'SMS Relance' modal
  const handleOpenSms = (customer: DebtCustomer) => {
    setSmsCustomer(customer);
    setIsSmsModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (selectedCustomer && payAmount > 0) {
      playCashChime();
      onRecordPayment(selectedCustomer.id, payAmount);
      setIsPayModalOpen(false);
      
      const updated = customers.find(c => c.id === selectedCustomer.id);
      if (updated) {
        setSelectedCustomer({
          ...updated,
          totalDebt: Math.max(0, updated.totalDebt - payAmount)
        });
      }
    }
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(newDebtAmount, 10);
    if (!newCustomerName.trim() || isNaN(amount) || amount <= 0) return;

    playValidationBeep();
    onAddCustomerDebt(
      newCustomerName.trim(),
      newCustomerPhone.trim(),
      amount,
      newDebtDesc.trim() || 'Crédit divers'
    );
    setIsAddDebtModalOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewDebtAmount('');
    setNewDebtDesc('');
  };

  const getSmsMessage = (customer: DebtCustomer) => {
    return `Bonjour ${customer.name}, rappel amical de votre solde dû de ${formatCFA(customer.totalDebt)} chez la boutique Nana. Merci de passer pour la régularisation.`;
  };

  const handleCopySms = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const handleSendNativeSms = (customer: DebtCustomer) => {
    const text = getSmsMessage(customer);
    const cleanPhone = customer.phone?.replace(/[^0-9+]/g, '') || '';
    const smsUrl = cleanPhone 
      ? `sms:${cleanPhone}?body=${encodeURIComponent(text)}`
      : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  const handleSendWhatsApp = (customer: DebtCustomer) => {
    const text = getSmsMessage(customer);
    const cleanPhone = customer.phone?.replace(/[^0-9]/g, '') || '';
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white select-none">
      {/* Top Header Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            id="btn-back-to-caisse"
            type="button"
            onClick={onBackToRegister}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Retour à la caisse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Cahier de Dettes Client</span>
            </h1>
            <p className="text-[11px] text-slate-400">Suivi des ardoises et relances</p>
          </div>
        </div>

        <button
          id="btn-nouveau-credit"
          type="button"
          onClick={() => setIsAddDebtModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau Crédit</span>
        </button>
      </div>

      {/* EN-TÊTE : Affiche le Total global dû à la boutique en ROUGE (ex: 145 000 F CFA) */}
      <div className="p-4 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-red-900/30 shrink-0">
        <div className="rounded-2xl bg-red-950/30 border border-red-800/40 p-3 shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-red-300/90 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Total global dû à la boutique
              </span>
              {/* Le Total global dû à la boutique EN ROUGE */}
              <div 
                id="total-global-dette"
                className="text-3xl sm:text-4xl font-black text-red-500 font-mono tracking-tight drop-shadow-[0_2px_12px_rgba(239,68,68,0.35)] mt-0.5"
              >
                {formatCFA(totalGlobalDebt)}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 font-medium block">Clients débiteurs</span>
              <div className="text-lg sm:text-xl font-extrabold text-white font-mono bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700/60 inline-block mt-0.5">
                {totalDebtorsCount} {totalDebtorsCount > 1 ? 'clients' : 'client'}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un client (nom, téléphone)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* LISTE DES DETTES : Chaque carte client */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center">
            <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-semibold text-sm text-slate-400">Aucun client trouvé</p>
            <p className="text-xs text-slate-500">Ajoutez un nouveau crédit avec le bouton en haut</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isOverdue = customer.status === 'OVERDUE';
            const isSettled = customer.totalDebt === 0;

            return (
              <div
                key={customer.id}
                id={`customer-debt-card-${customer.shortName.toLowerCase()}`}
                className={`rounded-2xl p-3.5 border transition-all ${
                  isSettled
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-70'
                    : isOverdue
                    ? 'bg-slate-900/90 border-red-900/40 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header card: Photo + Name + Badge Ancienneté + Montant Dû */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Photo / Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full overflow-hidden border-2 flex items-center justify-center text-white font-black text-sm shadow-md ${
                          isSettled
                            ? 'border-emerald-500/40'
                            : isOverdue
                            ? 'border-red-500 ring-2 ring-red-500/20'
                            : 'border-emerald-500 ring-2 ring-emerald-500/20'
                        } ${customer.avatarColor || 'bg-blue-600'}`}
                      >
                        {customer.avatarUrl ? (
                          <img
                            src={customer.avatarUrl}
                            alt={customer.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-xs pointer-events-none">
                          {customer.initials}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-white text-sm sm:text-base">
                          {customer.name}
                        </h3>

                        {/* BADGE DE COULEUR SELON L'ANCIENNETÉ : Vert = Récent, Rouge = Retard */}
                        {!isSettled && (
                          isOverdue ? (
                            <span 
                              id={`badge-status-${customer.shortName.toLowerCase()}`}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shrink-0"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Retard ({customer.daysOverdue}j)
                            </span>
                          ) : (
                            <span 
                              id={`badge-status-${customer.shortName.toLowerCase()}`}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Récent
                            </span>
                          )
                        )}

                        {isSettled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            Réglé
                          </span>
                        )}
                      </div>

                      {customer.phone && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Dernier crédit : {customer.lastPurchaseDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* MONTANT DÛ DE LA CARTE CLIENT */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Montant dû</span>
                    <div 
                      id={`montant-du-${customer.shortName.toLowerCase()}`}
                      className={`text-lg sm:text-xl font-black font-mono tracking-tight ${
                        isSettled
                          ? 'text-emerald-400'
                          : isOverdue
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {formatCFA(customer.totalDebt)}
                    </div>
                  </div>
                </div>

                {/* Historique des derniers articles enregistrés */}
                {customer.entries.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1 bg-slate-950/40 p-2 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Détail des ardoises :</span>
                    </div>
                    {customer.entries.slice(-2).map((entry) => (
                      <div key={entry.id} className="flex justify-between items-center text-[11px] text-slate-400">
                        <span className="truncate max-w-[200px] sm:max-w-[260px] text-slate-300 font-medium">
                          {entry.description}
                        </span>
                        <span className="font-mono text-slate-200 shrink-0 ml-2 font-bold">
                          {formatCFA(entry.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* DEUX BOUTONS : 'SMS Relance' et 'Régler la dette' */}
                {customer.totalDebt > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                    {/* Bouton 1 : 'SMS Relance' */}
                    <button
                      id={`btn-sms-relance-${customer.shortName.toLowerCase()}`}
                      type="button"
                      onClick={() => handleOpenSms(customer)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm hover:border-amber-400"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>SMS Relance</span>
                    </button>

                    {/* Bouton 2 : 'Régler la dette' */}
                    <button
                      id={`btn-regler-dette-${customer.shortName.toLowerCase()}`}
                      type="button"
                      onClick={() => handleOpenPay(customer)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black active:scale-95 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      <Banknote className="w-4 h-4 shrink-0" />
                      <span>Régler la dette</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: SMS Relance */}
      {isSmsModalOpen && smsCustomer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    SMS Relance : {smsCustomer.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">Destinataire : {smsCustomer.phone || 'Non renseigné'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSmsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                <span>Message préparé :</span>
                <span className="text-red-400 font-mono font-bold">{formatCFA(smsCustomer.totalDebt)}</span>
              </div>
              
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans relative">
                {getSmsMessage(smsCustomer)}
              </div>

              {copiedToast && (
                <div className="mt-2 text-center text-xs text-emerald-400 font-bold animate-in fade-in duration-150 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Message copié dans le presse-papier !</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                {/* Send via native SMS app */}
                <button
                  type="button"
                  onClick={() => handleSendNativeSms(smsCustomer)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer SMS</span>
                </button>

                {/* Send via WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(smsCustomer)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Copy text button */}
              <button
                type="button"
                onClick={() => handleCopySms(getSmsMessage(smsCustomer))}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all cursor-pointer border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le texte du message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Régler la dette */}
      {isPayModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">
                  Régler la dette
                </h3>
                <p className="text-xs text-blue-400 font-semibold">{selectedCustomer.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="text-xs text-slate-400">Total de la dette actuelle :</div>
              <div className="text-3xl font-black font-mono text-red-400 mt-0.5">
                {formatCFA(selectedCustomer.totalDebt)}
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-300">Montant encaissé (F CFA)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xl font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Raccourcis rapides */}
              <div className="flex gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedCustomer.totalDebt)}
                  className="flex-1 py-1.5 text-xs rounded-xl bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-700/50 font-bold active:scale-95 transition-all"
                >
                  Tout solder ({formatCFA(selectedCustomer.totalDebt)})
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount(Math.round(selectedCustomer.totalDebt / 2))}
                  className="py-1.5 px-3 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
                >
                  50%
                </button>
              </div>

              {selectedCustomer.totalDebt - payAmount > 0 && (
                <div className="mt-2 text-[11px] text-amber-400 font-medium">
                  Reste dû après paiement : {formatCFA(selectedCustomer.totalDebt - payAmount)}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              >
                Valider le Règlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nouveau Crédit Manuel */}
      {isAddDebtModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
          <form
            onSubmit={handleCreateDebt}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Nouveau Crédit Client</h3>
              <button
                type="button"
                onClick={() => setIsAddDebtModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nom du client *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Moussa Ouattara"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Numéro Téléphone / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Ex: +225 07..."
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Montant du crédit (F CFA) *</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 1500"
                  value={newDebtAmount}
                  onChange={(e) => setNewDebtAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-base font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Détail des articles</label>
                <input
                  type="text"
                  placeholder="Ex: 3 Pains et 2 Laits"
                  value={newDebtDesc}
                  onChange={(e) => setNewDebtDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddDebtModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Enregistrer le Crédit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DebtBookView;
