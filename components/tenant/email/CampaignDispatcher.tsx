'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Zap, 
  Mail, 
  ArrowRight,
  Plus,
  Search,
  Filter,
  Check,
  CheckSquare,
  Square,
  Trash2,
  Upload,
  UserPlus,
  Phone,
  Crown,
  ShoppingBag,
  Clock,
  ChevronDown,
  X,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

import { supabase } from '@/src/lib/supabase';

export interface EmailContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'buyer' | 'lead' | 'vip' | 'subscriber';
  totalSpentCFA?: number;
  ordersCount?: number;
  lastActivity?: string;
  city?: string;
}

export interface CampaignDispatcherProps {
  tenantId?: string;
  emailCredits: number;
  onCreditsDrained: (amount: number, remainingCredits?: number) => void;
  savedTemplateHtml?: string;
  savedSubject?: string;
  savedSenderName?: string;
  savedSenderEmail?: string;
  onNavigateToStudio?: () => void;
  onNavigateToStore?: () => void;
}

export function CampaignDispatcher({
  tenantId,
  emailCredits,
  onCreditsDrained,
  savedTemplateHtml,
  savedSubject,
  savedSenderName,
  savedSenderEmail,
  onNavigateToStudio,
  onNavigateToStore
}: CampaignDispatcherProps) {
  // Vrais contacts réels (chargés depuis Supabase `customers` & `orders` — zéro contact mock)
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(true);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Filtres & Recherche
  const [filterType, setFilterType] = useState<'all' | 'buyer' | 'vip' | 'lead'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // États Envoi & Retours
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modale Ajout de Contact
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<EmailContact['type']>('buyer');
  const [newCity, setNewCity] = useState('');

  // Modale Import Massif (Coller liste)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkEmailsText, setBulkEmailsText] = useState('');

  // Chargement réel des contacts depuis Supabase (`customers` + acheteurs `orders`) + cache local propre
  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoadingContacts(true);
      const mapByEmail = new Map<string, EmailContact>();

      // 1. Contacts réels enregistrés dans Supabase `customers`
      if (tenantId) {
        try {
          const { data: dbCustomers } = await supabase
            .from('customers')
            .select('id, email, first_name, last_name, phone, city, status, created_at')
            .eq('tenant_id', tenantId)
            .limit(500);

          for (const c of dbCustomers || []) {
            const email = String(c.email || '').trim().toLowerCase();
            if (!email || !email.includes('@')) continue;
            mapByEmail.set(email, {
              id: String(c.id || `cust_${email}`),
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || email.split('@')[0],
              email,
              phone: c.phone || undefined,
              city: c.city || undefined,
              type: c.status === 'vip' ? 'vip' : c.status === 'active' ? 'buyer' : 'lead',
              ordersCount: 0,
              totalSpentCFA: 0,
              lastActivity: c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : undefined,
            });
          }
        } catch {}

        // 2. Acheteurs réels issus des commandes Supabase `orders`
        try {
          const { data: dbOrders } = await supabase
            .from('orders')
            .select('id, customer_name, customer_email, customer_phone, total_amount, created_at')
            .eq('store_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(500);

          for (const o of dbOrders || []) {
            const email = String(o.customer_email || '').trim().toLowerCase();
            if (!email || !email.includes('@')) continue;
            const prev = mapByEmail.get(email);
            const ordersCount = (prev?.ordersCount || 0) + 1;
            const totalSpentCFA = (prev?.totalSpentCFA || 0) + (Number(o.total_amount) || 0);
            mapByEmail.set(email, {
              id: prev?.id || `ord_${o.id}`,
              name: prev?.name || o.customer_name || email.split('@')[0],
              email,
              phone: prev?.phone || o.customer_phone || undefined,
              city: prev?.city,
              type: ordersCount >= 3 || totalSpentCFA >= 50000 ? 'vip' : 'buyer',
              ordersCount,
              totalSpentCFA,
              lastActivity: o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : prev?.lastActivity,
            });
          }
        } catch {}
      }

      // 3. Contacts ajoutés manuellement par le marchand dans ce navigateur (hors anciens mocks ct-1..ct-8)
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(`nana_real_email_contacts_${tenantId || 'user'}`);
          if (stored) {
            const parsed: EmailContact[] = JSON.parse(stored);
            for (const c of parsed) {
              const email = String(c.email || '').trim().toLowerCase();
              if (email && email.includes('@') && !mapByEmail.has(email)) {
                mapByEmail.set(email, c);
              }
            }
          }
        }
      } catch {}

      if (active) {
        const list = Array.from(mapByEmail.values());
        setContacts(list);
        setSelectedContactIds(list.map((c) => c.id));
        setIsLoadingContacts(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [tenantId]);

  // Persistance des contacts réels du marchand
  useEffect(() => {
    if (isLoadingContacts) return;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`nana_real_email_contacts_${tenantId || 'user'}`, JSON.stringify(contacts));
      }
    } catch {}
  }, [contacts, tenantId, isLoadingContacts]);

  // Filtrage intelligent des contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchType = filterType === 'all' || contact.type === filterType;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery = !query || 
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        (contact.phone && contact.phone.includes(query)) ||
        (contact.city && contact.city.toLowerCase().includes(query));

      return matchType && matchQuery;
    });
  }, [contacts, filterType, searchQuery]);

  // Gestion des sélections (Cocher / Décocher)
  const isAllFilteredSelected = filteredContacts.length > 0 && 
    filteredContacts.every(c => selectedContactIds.includes(c.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredContacts.map(c => c.id));
      setSelectedContactIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedContactIds, ...filteredContacts.map(c => c.id)]);
      setSelectedContactIds(Array.from(newIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  // Coût calculé en temps réel
  const requiredCredits = selectedContactIds.length;
  const hasEnoughCredits = emailCredits >= requiredCredits;

  // Ajout manuel d'un contact réel (sans inventer de fausses commandes)
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    const fullName = newName.trim() || cleanEmail.split('@')[0];
    const created: EmailContact = {
      id: `ct-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      phone: newPhone.trim() || undefined,
      type: newType,
      city: newCity.trim() || undefined,
      ordersCount: 0,
      totalSpentCFA: 0,
      lastActivity: "Ajouté aujourd'hui"
    };

    if (tenantId) {
      supabase
        .from('customers')
        .upsert({
          tenant_id: tenantId,
          email: cleanEmail,
          first_name: fullName.split(' ')[0] || fullName,
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          phone: created.phone || null,
          city: created.city || null,
          status: newType === 'vip' ? 'vip' : newType === 'buyer' ? 'active' : 'lead',
        })
        .then(() => {})
        .catch(() => {});
    }

    setContacts(prev => [created, ...prev.filter(c => c.email !== cleanEmail)]);
    setSelectedContactIds(prev => [created.id, ...prev]);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewCity('');
    setIsAddModalOpen(false);
  };

  // Import massif (texte avec e-mails séparés par virgule, retour chariot ou espace)
  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const rawList = bulkEmailsText
      .split(/[\n,;\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

    if (rawList.length === 0) {
      alert("Aucune adresse e-mail valide détectée.");
      return;
    }

    const uniqueEmails = Array.from(new Set(rawList));
    const existingEmails = new Set(contacts.map(c => c.email.toLowerCase()));
    const newContacts: EmailContact[] = uniqueEmails
      .filter(email => !existingEmails.has(email))
      .map((email, idx) => ({
        id: `bulk-${Date.now()}-${idx}`,
        name: email.split('@')[0].replace(/[._-]/g, ' '),
        email,
        type: 'subscriber',
        ordersCount: 0,
        totalSpentCFA: 0,
        lastActivity: 'Import récent'
      }));

    if (tenantId && newContacts.length > 0) {
      supabase
        .from('customers')
        .insert(
          newContacts.map(c => ({
            tenant_id: tenantId,
            email: c.email,
            first_name: c.name,
            last_name: '',
            status: 'lead',
          }))
        )
        .then(() => {})
        .catch(() => {});
    }

    setContacts(prev => [...newContacts, ...prev]);
    setSelectedContactIds(prev => [...newContacts.map(c => c.id), ...prev]);
    setBulkEmailsText('');
    setIsImportModalOpen(false);
  };

  // Suppression des contacts sélectionnés
  const handleDeleteSelected = () => {
    if (selectedContactIds.length === 0) return;
    if (confirm(`Supprimer définitivement ${selectedContactIds.length} contact(s) sélectionné(s) ?`)) {
      setContacts(prev => prev.filter(c => !selectedContactIds.includes(c.id)));
      setSelectedContactIds([]);
    }
  };

  // Lancement réel de la campagne vers les destinataires sélectionnés (JWT Supabase obligatoire)
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (requiredCredits === 0) {
      setErrorMsg("Veuillez cocher au moins un contact destinataire dans la liste ci-dessous.");
      return;
    }

    if (!hasEnoughCredits) {
      setErrorMsg(`Solde insuffisant : vous tentez d'envoyer à ${requiredCredits} contacts mais votre solde actuel est de ${emailCredits} crédits.`);
      return;
    }

    setIsSending(true);

    try {
      const selectedContactsData = contacts.filter(c => selectedContactIds.includes(c.id));
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenantId: tenantId || undefined,
          subject: savedSubject || 'Campagne E-mailing',
          senderName: savedSenderName || 'Ma Boutique Pro',
          senderEmail: savedSenderEmail || 'contact@nanasore.com',
          htmlContent: savedTemplateHtml || '<p>Bonjour {{FIRSTNAME}}, découvrez nos nouveautés.</p>',
          segment: filterType,
          recipientCount: requiredCredits,
          recipients: selectedContactsData.map(c => ({
            email: c.email,
            first_name: c.name.split(' ')[0] || '',
            last_name: c.name.split(' ').slice(1).join(' ') || ''
          }))
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const sentCount = data.sentCount || requiredCredits;
        onCreditsDrained(sentCount, data.remainingCredits);
        setSuccessMsg(
          `Campagne diffusée avec succès à ${sentCount} contact(s) via Brevo Pro ! ${
            data.remainingCredits !== undefined ? `(Crédits restants : ${data.remainingCredits})` : ''
          }`
        );
      } else {
        const errorDetail = data.error || (data.details ? JSON.stringify(data.details) : "Erreur lors de la diffusion de la campagne.");
        setErrorMsg(errorDetail);
      }
    } catch (networkErr: any) {
      console.error('[CAMPAIGN_DISPATCH] Erreur réseau:', networkErr);
      setErrorMsg("Erreur réseau : impossible de joindre le serveur d'envoi Pro.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-6">
      
      {/* En-tête Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              Ciblage & Audience Temps Réel
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Diffusion & Sélection des Destinataires
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cochez individuellement vos contacts, filtrez par comportement d'achat et déclenchez l'envoi.
          </p>
        </div>

        {/* Boutons d'action Contact */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 bg-[#FBF9F5] hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Importer une liste d'adresses e-mails"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Importer</span> E-mails
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer hover:shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouveau Contact</span>
          </button>
        </div>
      </div>

      {/* Messages Succès & Erreur */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-sm shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-900 text-sm shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          {onNavigateToStore && (
            <button
              type="button"
              onClick={onNavigateToStore}
              className="text-xs font-black text-blue-600 hover:text-blue-800 underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Acheter des crédits <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Filtres par Catégorie de Contacts */}
      <div className="space-y-3">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
          1. Trier & Filtrer par Segment
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'all', title: 'Tous les contacts', count: contacts.length, icon: Users, color: 'text-slate-600' },
            { id: 'vip', title: 'Clients VIP (> 50k)', count: contacts.filter(c => c.type === 'vip').length, icon: Crown, color: 'text-amber-500' },
            { id: 'buyer', title: 'Acheteurs Récents', count: contacts.filter(c => c.type === 'buyer').length, icon: ShoppingBag, color: 'text-blue-600' },
            { id: 'lead', title: 'Prospects Froids', count: contacts.filter(c => c.type === 'lead').length, icon: History, color: 'text-indigo-600' }
          ].map((tab) => {
            const isCurrent = filterType === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`p-3.5 rounded-2xl border-2 transition-all text-left flex flex-col justify-between cursor-pointer ${
                  isCurrent 
                    ? 'border-blue-600 bg-blue-50/30 shadow-xs ring-2 ring-blue-500/10' 
                    : 'border-slate-200 bg-[#FBF9F5] hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">{tab.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tab.id === 'vip' ? 'Gros paniers' : tab.id === 'buyer' ? 'Commandes validées' : tab.id === 'lead' ? 'Sans achat' : 'Base intégrale'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre de Recherche & Actions de Masse */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBF9F5] p-3 rounded-2xl border border-slate-200">
          
          {/* Champ recherche */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, e-mail, téléphone, ville..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Tout Cocher / Décocher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Tout désélectionner</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Tout cocher ({filteredContacts.length})</span>
                </>
              )}
            </button>

            {selectedContactIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Supprimer les contacts cochés"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            )}
          </div>
        </div>

        {/* LISTE DES CONTACTS AVEC CASES À COCHER */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[380px] overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Aucun contact ne correspond à votre filtre actuel.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FBF9F5] border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Contact / Destinataire</th>
                  <th className="py-3 px-4 hidden md:table-cell">Téléphone & Ville</th>
                  <th className="py-3 px-4">Statut / Type</th>
                  <th className="py-3 px-4 hidden sm:table-cell text-right">Volume Achat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => {
                  const isChecked = selectedContactIds.includes(contact.id);
                  return (
                    <tr 
                      key={contact.id} 
                      onClick={() => toggleSelectOne(contact.id)}
                      className={`hover:bg-blue-50/30 transition cursor-pointer select-none ${
                        isChecked ? 'bg-blue-50/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(contact.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{contact.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{contact.email}</div>
                      </td>

                      <td className="py-3 px-4 hidden md:table-cell text-slate-600">
                        {contact.phone || 'Non renseigné'}
                        {contact.city && (
                          <span className="block text-[10px] text-slate-400">{contact.city}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {contact.type === 'vip' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <Crown className="w-2.5 h-2.5" /> VIP
                          </span>
                        )}
                        {contact.type === 'buyer' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                            Acheteur ({contact.ordersCount || 1})
                          </span>
                        )}
                        {contact.type === 'lead' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Prospect
                          </span>
                        )}
                        {contact.type === 'subscriber' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Inscrit
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell text-right font-black text-slate-900">
                        {contact.totalSpentCFA ? `${contact.totalSpentCFA.toLocaleString('fr-FR')} F` : '0 F'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Résumé de l'Envoi & Bouton de Déclenchement */}
      <form onSubmit={handleDispatch} className="pt-2">
        <div className="p-5 bg-[#FBF9F5] border border-slate-200 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Destinataires Sélectionnés</span>
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                {selectedContactIds.length} contact(s) coché(s)
              </span>
            </div>
            
            <p className="text-sm font-semibold text-slate-900">
              Coût total de diffusion : <strong className="text-blue-600">{requiredCredits} crédits</strong>{' '}
              <span className="text-slate-500 font-normal">(Solde disponible : <strong>{emailCredits}</strong> crédits)</span>
            </p>

            {savedSubject && (
              <p className="text-xs text-slate-500 truncate max-w-md">
                Modèle : <span className="font-bold text-slate-700">« {savedSubject} »</span>
                {savedSenderEmail && (
                  <span className="ml-1 text-slate-400">
                    • De : <strong className="text-slate-600">{savedSenderName || 'Ma Boutique'}</strong> &lt;{savedSenderEmail}&gt;
                  </span>
                )}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSending || requiredCredits === 0 || !hasEnoughCredits}
            className={`px-8 py-4 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSending || requiredCredits === 0 || !hasEnoughCredits
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Diffusion en cours...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Diffuser à {selectedContactIds.length} contact(s)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* MODALE : AJOUTER UN CONTACT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Nouveau Contact
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="Ex: Aïcha Kaboré"
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse E-mail *</label>
                <input 
                  type="email" 
                  required
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  placeholder="Ex: client@gmail.com"
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone</label>
                  <input 
                    type="tel" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                    placeholder="+226 XX..."
                    className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ville</label>
                  <input 
                    type="text" 
                    value={newCity} 
                    onChange={(e) => setNewCity(e.target.value)} 
                    placeholder="Ouagadougou..."
                    className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie Client</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="buyer">Acheteur (Commande déjà passée)</option>
                  <option value="vip">Client VIP (Gros volume)</option>
                  <option value="lead">Prospect Froid (En attente)</option>
                  <option value="subscriber">Simple Inscrit Newsletter</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Ajouter au carnet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : IMPORT MASSIF D'EMAILS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Import Massif d'Adresses E-mails
              </h3>
              <button 
                type="button" 
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Collez directement votre liste d'e-mails ci-dessous. Le système extrait et valide automatiquement les adresses valides (séparées par une ligne, une virgule ou un point-virgule).
              </p>

              <textarea 
                rows={6}
                value={bulkEmailsText}
                onChange={(e) => setBulkEmailsText(e.target.value)}
                placeholder="contact@client.com&#10;marie.kouassi@yahoo.fr, ibrahim@outlook.com"
                className="w-full p-3 bg-[#FBF9F5] border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Valider l'importation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
