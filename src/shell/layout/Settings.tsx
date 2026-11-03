import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Store, 
  CheckCircle2, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { StoreUser, StoreSubscription } from '../../types';
import { isFreePlan } from '../../utils/planFeatures';
import { PushNotificationTester } from '../../components/PushNotificationTester';

interface SettingsProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onUpgradeToPro?: () => void;
  onSaveSettings?: (settings: any) => void;
  className?: string;
}

export const Settings: React.FC<SettingsProps> = ({
  currentUser,
  subscription,
  onUpgradeToPro,
  onSaveSettings,
  className = ''
}) => {
  const currentSub = subscription || currentUser?.subscription;
  const isPro = !isFreePlan(currentSub || currentUser);
  const planName = currentSub?.plan ? currentSub.plan.toUpperCase() : (isPro ? 'PRO' : 'GRATUIT');

  return (
    <div className={`max-w-4xl mx-auto p-4 sm:p-6 space-y-6 ${className}`}>
      {/* Header Paramètres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Paramètres de la Boutique
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isPro
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                Plan {planName}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Gérez vos notifications en direct, vos intégrations et votre compte marchand
            </p>
          </div>
        </div>

        {!isPro && onUpgradeToPro && (
          <button
            onClick={onUpgradeToPro}
            type="button"
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <Crown className="w-4 h-4" />
            Passer au Plan PRO
          </button>
        )}
      </div>

      {/* Section 1 : Notifications Push en direct (FCM v1 & Cloudflare Worker) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Alertes Push & Notifications Instantanées
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Exclusivité Plan PRO
          </span>
        </div>

        <PushNotificationTester
          merchantId={currentUser?.storeId || currentUser?.id}
          isPro={isPro}
          onUpgrade={onUpgradeToPro}
        />
      </section>
    </div>
  );
};

export default Settings;
