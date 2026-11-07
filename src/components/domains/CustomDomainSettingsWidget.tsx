import React, { useState } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';

export interface DnsRecordInfo {
  type: string;
  name: string;
  value: string;
}

export interface CustomDomainSettingsWidgetProps {
  tenantId?: string;
  initialDomain?: string;
  initialStatus?: 'pending' | 'active' | 'failed';
  initialDnsRecords?: {
    cname?: DnsRecordInfo;
    ownership?: DnsRecordInfo;
    ssl_dcv?: DnsRecordInfo;
  };
  fallbackOrigin?: string;
}

export const CustomDomainSettingsWidget: React.FC<CustomDomainSettingsWidgetProps> = ({
  tenantId = 'default',
  initialDomain = '',
  initialStatus = 'pending',
  initialDnsRecords,
  fallbackOrigin = 'cname.nanasore.com'
}) => {
  const [domainInput, setDomainInput] = useState(initialDomain);
  const [domain, setDomain] = useState(initialDomain);
  const [domainStatus, setDomainStatus] = useState<'pending' | 'active' | 'failed'>(initialStatus);
  const [dnsRecords, setDnsRecords] = useState(initialDnsRecords || {
    cname: {
      type: 'CNAME',
      name: '@',
      value: fallbackOrigin,
    },
    ownership: {
      type: 'TXT',
      name: domain ? `_cf-custom-hostname.${domain}` : '',
      value: '',
    },
    ssl_dcv: {
      type: 'TXT',
      name: '',
      value: '',
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/domains/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          domain: domainInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement du nom de domaine.');
      }

      setDomain(data.custom_domain || domainInput.trim());
      setDomainStatus((data.domain_status as any) || 'pending');

      if (data.dns_records) {
        setDnsRecords(data.dns_records);
      } else if (data.dns_instructions) {
        setDnsRecords({
          cname: {
            type: 'CNAME',
            name: '@',
            value: data.dns_instructions.cname?.target || fallbackOrigin,
          },
          ownership: {
            type: 'TXT',
            name: data.dns_instructions.ownership_verification?.name || `_cf-custom-hostname.${data.custom_domain}`,
            value: data.dns_instructions.ownership_verification?.value || '',
          },
          ssl_dcv: {
            type: 'TXT',
            name: data.dns_instructions.ssl_dcv?.[0]?.txt_name || data.dns_instructions.ssl_dcv?.[0]?.name || '',
            value: data.dns_instructions.ssl_dcv?.[0]?.txt_value || data.dns_instructions.ssl_dcv?.[0]?.value || '',
          }
        });
      }

      setSuccessMessage('Domaine enregistré ! Configurez les enregistrements DNS ci-dessous chez votre registrar.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d\'enregistrer le nom de domaine.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/domains/verify?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'GET',
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erreur lors de la vérification.');
      }

      const newStatus = data.domain_status || (data.is_active ? 'active' : 'pending');
      setDomainStatus(newStatus);

      if (data.dns_records) {
        setDnsRecords(data.dns_records);
      }

      if (newStatus === 'active') {
        setSuccessMessage('Félicitations ! Votre nom de domaine est actif et sécurisé avec certificat SSL.');
      } else {
        setSuccessMessage('Vérification effectuée. La propagation DNS est en cours (délai : 5 à 30 minutes).');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la vérification DNS.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-400" />
            <span>Nom de Domaine Personnalisé</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Liez votre propre marque blanche (ex: <code className="text-indigo-300 font-mono">shop.marchand.com</code>). 
            Certificat SSL gratuit et CDN Cloudflare for SaaS inclus.
          </p>
        </div>

        {/* Real-time Status Badge */}
        {domain && (
          <div className="shrink-0">
            {domainStatus === 'active' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-950/40">
                <CheckCircle2 className="w-4 h-4" />
                <span>Actif & Sécurisé (SSL)</span>
              </span>
            ) : domainStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-red-950 border border-red-500/40 text-red-400 shadow-md shadow-red-950/40">
                <AlertCircle className="w-4 h-4" />
                <span>Échec de vérification DNS</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-950 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-950/40 animate-pulse">
                <Clock className="w-4 h-4" />
                <span>En attente de vérification DNS</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Formulaire de saisie du domaine */}
      <form onSubmit={handleRegisterDomain} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Entrez votre nom de domaine ou sous-domaine :
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 font-mono">
                https://
              </span>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="boutique.mon-domaine.com"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-20 pr-4 py-3 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !domainInput.trim()}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 shrink-0"
            >
              {isLoading ? 'Connexion en cours...' : 'Connecter mon domaine'}
            </button>
          </div>
        </div>
      </form>

      {/* Tableau récapitulatif des enregistrements DNS (si statut !== 'active') */}
      {domain && domainStatus !== 'active' && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Configuration DNS requise chez votre registrar</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rendez-vous dans la zone DNS de votre hébergeur (Namecheap, GoDaddy, OVH, Hostinger) et ajoutez ces 3 enregistrements :
              </p>
            </div>

            <button
              type="button"
              onClick={handleVerifyDomain}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/40 disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Vérification...' : 'Vérifier la configuration'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Nom de l'hôte</th>
                  <th className="py-3 px-4">Valeur / Cible</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {/* 1. Pointage Trafic CNAME */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black text-[10px]">
                      CNAME
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    {dnsRecords.cname?.name || '@'}
                  </td>
                  <td className="py-3 px-4 text-slate-300 break-all">
                    {dnsRecords.cname?.value || fallbackOrigin}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dnsRecords.cname?.value || fallbackOrigin, 'cname')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all inline-flex items-center gap-1"
                    >
                      {copiedKey === 'cname' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>

                {/* 2. Vérification Propriété TXT */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-black text-[10px]">
                      TXT
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 break-all">
                    {dnsRecords.ownership?.name || `_cf-custom-hostname.${domain}`}
                  </td>
                  <td className="py-3 px-4 text-slate-300 break-all">
                    {dnsRecords.ownership?.value || '(En cours de génération Cloudflare...)'}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dnsRecords.ownership?.value || '', 'ownership')}
                      disabled={!dnsRecords.ownership?.value}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      {copiedKey === 'ownership' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>

                {/* 3. Certificat SSL DCV TXT */}
                <tr className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[10px]">
                      TXT (SSL)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 break-all">
                    {dnsRecords.ssl_dcv?.name || `_ca3-${domain.slice(0, 10)}.${domain}`}
                  </td>
                  <td className="py-3 px-4 text-slate-300 break-all">
                    {dnsRecords.ssl_dcv?.value || '(En cours d\'attribution par l\'autorité de certification...)'}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dnsRecords.ssl_dcv?.value || '', 'ssl')}
                      disabled={!dnsRecords.ssl_dcv?.value}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      {copiedKey === 'ssl' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Domaine Actif & Sécurisé */}
      {domain && domainStatus === 'active' && (
        <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Domaine Opérationnel</h4>
              <p className="text-xs text-slate-300">
                Votre boutique répond directement à l'adresse sécurisée :
              </p>
            </div>
          </div>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            <span>Ouvrir https://{domain}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
