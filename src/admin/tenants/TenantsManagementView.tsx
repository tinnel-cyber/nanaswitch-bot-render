import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Crown, 
  ShieldCheck, 
  MoreVertical, 
  UserX, 
  UserCheck, 
  Eye, 
  ExternalLink,
  RefreshCw,
  Mail,
  Phone
} from 'lucide-react';
import { 
  getSuperAdminSettingsLocal, 
  saveSuperAdminSettings, 
  fetchSuperAdminSettingsFromFirebase,
  SuperAdminSettings
} from '../../services/superAdminService';
import { SaasStore, StoreApprovalStatus } from '../../types';
import { 
  fetchOrganizationsAsStoresFromSupabase,
  syncStoreApprovalToSupabase 
} from '../../services/superAdminSupabaseService';
import { updateStoreApprovalStatus } from '../../utils/firestoreService';

export const TenantsManagementView: React.FC = () => {
  const [settings, setSettings] = useState<SuperAdminSettings>(() => getSuperAdminSettingsLocal() || {});
  const [liveSupabaseStores, setLiveSupabaseStores] = useState<SaasStore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Lecture directe depuis les tables SQL Supabase
    fetchOrganizationsAsStoresFromSupabase().then((stores) => {
      if (stores && stores.length > 0) {
        setLiveSupabaseStores(stores);
      }
    });

    fetchSuperAdminSettingsFromFirebase().then((data) => {
      if (data) setSettings(data);
    });

    const handleUpdate = () => {
      setSettings(getSuperAdminSettingsLocal() || {});
    };
    window.addEventListener('superAdminUpdated', handleUpdate);
    return () => window.removeEventListener('superAdminUpdated', handleUpdate);
  }, []);

  const allStores: SaasStore[] = useMemo(() => {
    const list = liveSupabaseStores.length > 0 
      ? liveSupabaseStores 
      : (settings.stores && settings.stores.length > 0 ? settings.stores : []);
    return list.map((store) => {
      const liveStatus = settings.approvalStatuses?.[store.id] || store.approvalStatus || 'APPROVED';
      return { ...store, approvalStatus: liveStatus };
    });
  }, [liveSupabaseStores, settings]);

  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      const matchesSearch = 
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = statusFilter === 'ALL' || store.approvalStatus === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [allStores, searchTerm, statusFilter]);

  const handleUpdateStatus = async (storeId: string, newStatus: StoreApprovalStatus) => {
    setIsSaving(true);
    try {
      const currentStatuses = { ...(settings.approvalStatuses || {}) };
      currentStatuses[storeId] = newStatus;

      // Sauvegarde Supabase SQL & Cloud & Locale
      await syncStoreApprovalToSupabase(storeId, newStatus);
      await updateStoreApprovalStatus(storeId, newStatus);
      await saveSuperAdminSettings({ approvalStatuses: currentStatuses });

      setSettings((prev) => ({
        ...prev,
        approvalStatuses: currentStatuses
      }));
    } catch (err) {
      console.error('Erreur mise à jour statut boutique:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Store className="w-7 h-7 text-indigo-400" />
            <span>Gestion des Marchands & Boutiques</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gouvernance complète des boutiques connectées : validation KYC, approbations, suspensions et attribution de forfaits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            {allStores.length} Boutiques au Total
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom de boutique, identifiant ou email marchand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'APPROVED', 'PENDING', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tous' : st === 'APPROVED' ? 'Approuvés' : st === 'PENDING' ? 'En Attente' : 'Suspendus'}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Boutique & Propriétaire</th>
                <th className="py-3.5 px-4">Forfait Actif</th>
                <th className="py-3.5 px-4">Statut Approbation</th>
                <th className="py-3.5 px-4">Ventes & Volume</th>
                <th className="py-3.5 px-4 text-right">Actions de Modération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-white uppercase text-xs shrink-0">
                        {store.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{store.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({store.id})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {store.ownerEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {store.ownerEmail}
                            </span>
                          )}
                          {store.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {store.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-[11px] uppercase">
                      <Crown className="w-3 h-3" />
                      {store.plan || 'Commerçant'}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase ${
                      store.approvalStatus === 'APPROVED'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : store.approvalStatus === 'PENDING'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {store.approvalStatus === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                      {store.approvalStatus === 'PENDING' && <AlertTriangle className="w-3 h-3" />}
                      {store.approvalStatus === 'SUSPENDED' && <XCircle className="w-3 h-3" />}
                      {store.approvalStatus}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {store.salesCount || 0} ventes
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {store.approvalStatus !== 'APPROVED' && (
                        <button
                          disabled={isSaving}
                          onClick={() => handleUpdateStatus(store.id, 'APPROVED')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approuver</span>
                        </button>
                      )}

                      {store.approvalStatus !== 'SUSPENDED' && (
                        <button
                          disabled={isSaving}
                          onClick={() => handleUpdateStatus(store.id, 'SUSPENDED')}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Suspendre</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStores.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucune boutique ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantsManagementView;
