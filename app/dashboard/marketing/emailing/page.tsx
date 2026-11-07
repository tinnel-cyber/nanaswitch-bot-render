'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Layout,
  Send,
  CreditCard,
  Sparkles,
  Zap,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';
import { EmailBuilderStudio } from '@/components/tenant/email/EmailBuilderStudio';
import { CampaignDispatcher } from '@/components/tenant/email/CampaignDispatcher';
import { QuotaMonetizationStore } from '@/components/tenant/email/QuotaMonetizationStore';

type TabType = 'studio' | 'dispatch' | 'store';

export default function TenantEmailingDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('studio');
  const [emailCredits, setEmailCredits] = useState<number>(1500);
  const [savedTemplateHtml, setSavedTemplateHtml] = useState<string>('');
  const [savedSubject, setSavedSubject] = useState<string>('Offre Spéciale Nanasore 🎁');
  const [savedSenderName, setSavedSenderName] = useState<string>('Ma Boutique Pro');
  const [savedSenderEmail, setSavedSenderEmail] = useState<string>('contact@maboutique.com');
  const [flashBanner, setFlashBanner] = useState<string | null>(null);

  // Charger le solde depuis le localStorage si existant
  useEffect(() => {
    try {
      const storedCredits = localStorage.getItem('tenant_email_credits');
      if (storedCredits) {
        setEmailCredits(parseInt(storedCredits, 10));
      }
    } catch {
      // Ignorer
    }
  }, []);

  const handleUpdateCredits = (newCredits: number) => {
    setEmailCredits(newCredits);
    try {
      localStorage.setItem('tenant_email_credits', newCredits.toString());
    } catch {
      // Ignorer
    }
  };

  const handleTemplateSave = (html: string, subject: string, senderName?: string, senderEmail?: string) => {
    setSavedTemplateHtml(html);
    setSavedSubject(subject);
    if (senderName) setSavedSenderName(senderName);
    if (senderEmail) setSavedSenderEmail(senderEmail);
    setFlashBanner(`✨ Modèle "${subject || 'Sans titre'}" enregistré avec succès ! Vous pouvez maintenant le diffuser.`);
    setTimeout(() => setFlashBanner(null), 5000);
  };

  const handleCreditsDrained = (amount: number) => {
    const remaining = Math.max(0, emailCredits - amount);
    handleUpdateCredits(remaining);
  };

  const handleRecharge = (amount: number, packName: string) => {
    const updated = emailCredits + amount;
    handleUpdateCredits(updated);
    setFlashBanner(`🎉 Félicitations ! Votre recharge de ${amount.toLocaleString('fr-FR')} crédits (${packName}) a été activée.`);
    setTimeout(() => setFlashBanner(null), 6000);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 pb-20">
      {/* Barre de navigation supérieure Tenant */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-xl hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tableau de Bord Marchand</span>
            </Link>

            <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Studio d'E-mailing & Campagnes
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Tenant SaaS
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Éditeur visuel sans code, segmentation avancée et revente de quotas Brevo.
                </p>
              </div>
            </div>
          </div>

          {/* Solde & bouton recharger */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-[#FBF9F5] border border-blue-200/80 rounded-2xl px-3.5 py-2 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Crédits</p>
                <p className="text-sm font-black text-slate-900 mt-0.5 leading-none">
                  {emailCredits.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('store')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Acheter des Crédits</span>
              <span className="sm:hidden">Recharger</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Flash Banner d'action */}
        {flashBanner && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-950 text-xs font-bold rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{flashBanner}</span>
            </div>
            {activeTab !== 'dispatch' && (
              <button
                onClick={() => setActiveTab('dispatch')}
                className="text-xs font-black text-blue-700 underline flex items-center gap-1 hover:text-blue-900 cursor-pointer"
              >
                Passer à la diffusion <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Barre d'onglets principale */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 flex items-center gap-1.5 shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FBF9F5]'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>1. Studio de Composition</span>
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'dispatch'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FBF9F5]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>2. Diffusion & Ciblage</span>
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'store'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FBF9F5]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>3. Boutique de Quotas</span>
          </button>
        </div>

        {/* Affichage du bloc actif */}
        <div className="transition-all duration-300">
          {activeTab === 'studio' && (
            <div className="space-y-4">
              <EmailBuilderStudio
                onTemplateSave={handleTemplateSave}
                initialSubject={savedSubject}
                initialSenderName={savedSenderName}
                initialSenderEmail={savedSenderEmail}
              />
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-4">
              <CampaignDispatcher
                emailCredits={emailCredits}
                onCreditsDrained={handleCreditsDrained}
                savedTemplateHtml={savedTemplateHtml}
                savedSubject={savedSubject}
                savedSenderName={savedSenderName}
                savedSenderEmail={savedSenderEmail}
                onNavigateToStudio={() => setActiveTab('studio')}
                onNavigateToStore={() => setActiveTab('store')}
              />
            </div>
          )}

          {activeTab === 'store' && (
            <div className="space-y-4">
              <QuotaMonetizationStore
                currentCredits={emailCredits}
                onRecharge={handleRecharge}
              />
            </div>
          )}
        </div>

        {/* Pied de page informatif Tenant */}
        <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-500">
            Nanasore Suite E-mailing Marchand • Infrastructure Brevo SMTP Haute Délivrabilité
          </p>
          <p className="text-[11px] text-slate-400">
            Conforme aux normes RGPD et directives anti-spam internationales. Vos données clients restent isolées et protégées sous chiffrement AES-256.
          </p>
        </footer>
      </main>
    </div>
  );
}
