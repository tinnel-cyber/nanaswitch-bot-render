'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Globe,
  MailCheck,
  MousePointerClick,
  Eye,
  AlertTriangle,
  UserX,
  RefreshCw,
  Plus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  FlaskConical,
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface CampaignRow {
  id: string;
  subject: string;
  ab_variant_b_subject?: string | null;
  recipient_count: number;
  suppressed_count?: number;
  batch_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
  bounced_count?: number;
  spam_count?: number;
  unsubscribed_count?: number;
  status: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
}

interface SuppressedRow {
  email: string;
  reason: string;
  unsubscribed_at: string;
}

interface DomainRow {
  id?: string;
  domain: string;
  spf_record: string;
  dkim_record?: string;
  dmarc_record: string;
  verification_status: string;
}

export interface CampaignAnalyticsHubProps {
  tenantId?: string;
}

export function CampaignAnalyticsHub({ tenantId }: CampaignAnalyticsHubProps) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [suppressedList, setSuppressedList] = useState<SuppressedRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newDomain, setNewDomain] = useState<string>('');
  const [isAddingDomain, setIsAddingDomain] = useState<boolean>(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const [histRes, domRes] = await Promise.all([
        fetch(`/api/campaigns/history${qs}`, { headers }).then((r) => r.json()).catch(() => null),
        fetch(`/api/campaigns/domains${qs}`, { headers }).then((r) => r.json()).catch(() => null),
      ]);

      if (histRes?.success) {
        setCampaigns(histRes.campaigns || []);
        setSuppressedList(histRes.suppressedList || []);
      }
      if (domRes?.success) {
        setDomains(domRes.domains || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError(null);
    if (!newDomain.trim()) return;
    setIsAddingDomain(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const res = await fetch('/api/campaigns/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tenantId, domain: newDomain.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setNewDomain('');
        await loadData();
      } else {
        setDomainError(data.error || 'Impossible de configurer ce domaine.');
      }
    } catch {
      setDomainError('Erreur réseau lors de la configuration du domaine.');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const copyValue = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedText(val);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const totals = campaigns.reduce(
    (acc, c) => {
      acc.sent += Number(c.recipient_count) || 0;
      acc.delivered += Number(c.delivered_count) || 0;
      acc.opened += Number(c.opened_count) || 0;
      acc.clicked += Number(c.clicked_count) || 0;
      acc.bounced += Number(c.bounced_count) || 0;
      return acc;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
  );

  const openRate = totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : '0.0';
  const clickRate = totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(1) : '0.0';
  const webhookUrl = 'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run/api/webhooks/brevo';

  return (
    <div className="space-y-6">
      {/* 1. KPI RÉELS TEMPS RÉEL (BREVO WEBHOOKS + SUPABASE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Analytics Temps Réel &amp; Délivrabilité Pro
              </h2>
              <p className="text-[11px] text-slate-500">
                Données réelles issues de Supabase et des webhooks Brevo (ouvertures, clics, rebonds, désinscriptions).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#FBF9F5] border border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <MailCheck className="w-3.5 h-3.5 text-blue-600" /> Envoyés
            </p>
            <p className="text-xl font-black text-slate-900 mt-1">{totals.sent.toLocaleString('fr-FR')}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
            <p className="text-[10px] font-bold uppercase text-blue-700 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Ouvertures
            </p>
            <p className="text-xl font-black text-blue-900 mt-1">{openRate}%</p>
            <p className="text-[10px] text-blue-600 font-semibold">{totals.opened} ouvertures</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <p className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
              <MousePointerClick className="w-3.5 h-3.5" /> Clics
            </p>
            <p className="text-xl font-black text-emerald-900 mt-1">{clickRate}%</p>
            <p className="text-[10px] text-emerald-600 font-semibold">{totals.clicked} clics</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
            <p className="text-[10px] font-bold uppercase text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Rebonds
            </p>
            <p className="text-xl font-black text-amber-900 mt-1">{totals.bounced}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase text-rose-700 flex items-center gap-1">
              <UserX className="w-3.5 h-3.5" /> Liste Suppression
            </p>
            <p className="text-xl font-black text-rose-900 mt-1">{suppressedList.length}</p>
            <p className="text-[10px] text-rose-600 font-semibold">exclus auto</p>
          </div>
        </div>

        {/* Historique réel des campagnes */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
            Historique des Campagnes ({campaigns.length})
          </h3>
          {campaigns.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
              Aucune campagne enregistrée pour ce compte. Envoyez ou programmez votre première campagne depuis l'onglet 2.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Objet</th>
                    <th className="px-3.5 py-2.5">Statut</th>
                    <th className="px-3.5 py-2.5">Destinataires</th>
                    <th className="px-3.5 py-2.5">Ouverts</th>
                    <th className="px-3.5 py-2.5">Clics</th>
                    <th className="px-3.5 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[240px]">{c.subject}</span>
                          {c.ab_variant_b_subject && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black">
                              <FlaskConical className="w-2.5 h-2.5" /> A/B
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            c.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.status === 'sent' ? 'Envoyée' : c.status === 'scheduled' ? 'Programmée' : c.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold">{c.recipient_count || 0}</td>
                      <td className="px-3.5 py-2.5 text-blue-700 font-bold">{c.opened_count || 0}</td>
                      <td className="px-3.5 py-2.5 text-emerald-700 font-bold">{c.clicked_count || 0}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">
                        {c.sent_at
                          ? new Date(c.sent_at).toLocaleString('fr-FR')
                          : c.scheduled_at
                          ? `Prévue : ${new Date(c.scheduled_at).toLocaleString('fr-FR')}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 2. AUTHENTIFICATION DE DOMAINE EXPÉDITEUR (SPF / DKIM / DMARC) & WEBHOOK BREVO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Domaines Expéditeurs Authentifiés (SPF / DKIM / DMARC)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Authentifiez votre propre nom de domaine (ex: <strong>maboutique.com</strong>) pour envoyer depuis votre adresse officielle et protéger votre réputation anti-spam.
          </p>

          <form onSubmit={handleAddDomain} className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="ex: maboutique.com"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={isAddingDomain}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingDomain ? 'Ajout...' : 'Ajouter'}</span>
            </button>
          </form>

          {domainError && <p className="text-xs font-bold text-rose-600">{domainError}</p>}

          <div className="space-y-3">
            {domains.map((d) => (
              <div key={d.domain} className="p-3.5 rounded-2xl bg-[#FBF9F5] border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{d.domain}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      d.verification_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {d.verification_status === 'verified' ? 'Vérifié DNS' : 'DNS en attente'}
                  </span>
                </div>
                {[
                  { label: 'TXT (SPF)', value: d.spf_record },
                  { label: 'TXT (DKIM)', value: d.dkim_record || '' },
                  { label: 'TXT (DMARC)', value: d.dmarc_record },
                ]
                  .filter((r) => r.value)
                  .map((rec) => (
                    <div key={rec.label} className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-blue-700 block">{rec.label}</span>
                        <span className="text-[10px] font-mono text-slate-600 block truncate">{rec.value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue(rec.value)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer shrink-0"
                        title="Copier l'enregistrement DNS"
                      >
                        {copiedText === rec.value ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* 3. CONFORMITÉ RGPD, LISTE DE SUPPRESSION & WEBHOOK BREVO */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Protection Anti-Spam &amp; Webhook Brevo
            </h3>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
            <p className="text-[11px] font-black text-blue-900">URL Webhook Brevo (Ouvertures, Clics, Rebonds)</p>
            <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-blue-200">
              <span className="text-[11px] font-mono text-slate-700 truncate">{webhookUrl}</span>
              <button
                type="button"
                onClick={() => copyValue(webhookUrl)}
                className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedText === webhookUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText === webhookUrl ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
            <p className="text-[10px] text-blue-800/80">
              Collez cette URL dans Brevo → Transactionnel → Paramètres → Webhooks pour remonter automatiquement les ouvertures, clics, hard bounces et plaintes spam.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
              Liste de Suppression Automatique ({suppressedList.length})
            </h4>
            {suppressedList.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                Aucune adresse désinscrite ou en rebond dur pour le moment. Les liens de désinscription RFC 8058 en 1 clic sont injectés automatiquement dans chaque e-mail.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {suppressedList.map((s) => (
                  <div
                    key={s.email}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-mono text-slate-700 truncate">{s.email}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase shrink-0">
                      {s.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
