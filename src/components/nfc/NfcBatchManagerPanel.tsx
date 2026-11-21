import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Plus,
  Download,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Clock,
  ExternalLink,
  Trash2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NfcTagRecord {
  code: string;
  batch_name: string;
  status: 'UNCLAIMED' | 'ACTIVE' | 'DISABLED';
  merchant_name?: string;
  target_url?: string;
  scan_count: number;
  created_at: string;
}

export const NfcBatchManagerPanel: React.FC = () => {
  const [tags, setTags] = useState<NfcTagRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [prefix, setPrefix] = useState('NS');
  const [quantity, setQuantity] = useState(10);
  const [batchName, setBatchName] = useState('Plaques Comptoir Nanasore V1');

  const [copiedCode, setCopiedCode] = useState<string>('');
  const [writingCode, setWritingCode] = useState<string>('');
  const [nfcFeedback, setNfcFeedback] = useState<string>('');

  const getToken = async (): Promise<string> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || '';
    } catch {
      return '';
    }
  };

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/nfc/tags', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.tags)) {
          setTags(json.tags);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setNfcFeedback('');
    try {
      const token = await getToken();
      const res = await fetch('/api/nfc/tags/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prefix: prefix.trim().toUpperCase() || 'NS',
          quantity: Math.min(200, Math.max(1, Number(quantity) || 10)),
          batchName: batchName.trim() || 'Lot Standard'
        })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setNfcFeedback(`✅ ${json.created?.length || quantity} nouvelles plaques NFC générées dans "${batchName}".`);
        await loadTags();
      } else {
        setNfcFeedback(`❌ ${json.error || 'Échec création du lot'}`);
      }
    } catch {
      setNfcFeedback('❌ Erreur réseau lors de la création du lot.');
    } finally {
      setCreating(false);
    }
  };

  const getTagUrl = (code: string) => `https://nsore.shop/nfc/${encodeURIComponent(code)}`;

  const handleWriteNfc = async (code: string) => {
    const url = getTagUrl(code);
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      setNfcFeedback(`ℹ️ Web NFC requiert Chrome sur Android. URL copiée pour NFC Tools : ${url}`);
      navigator.clipboard?.writeText(url).catch(() => {});
      return;
    }
    setWritingCode(code);
    setNfcFeedback(`📡 Approchez la plaque vierge ${code} du dos de votre téléphone Android...`);
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({ records: [{ recordType: 'url', data: url }] });
      setNfcFeedback(`✅ Plaque ${code} gravée avec succès (${url}) ! Passez à la suivante.`);
    } catch (err: any) {
      setNfcFeedback(`⚠️ Gravure ${code} annulée : ${err?.message || 'Erreur NFC'}`);
    } finally {
      setWritingCode('');
    }
  };

  const handleDownloadQrPng = async (code: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(getTagUrl(code), {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H'
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `NFC-QR-${code}.png`;
      a.click();
    } catch {}
  };

  const handleExportCsv = () => {
    const header = 'code,batch_name,status,merchant_name,nfc_url,scan_count\n';
    const rows = tags
      .map(
        (t) =>
          `"${t.code}","${(t.batch_name || '').replace(/"/g, '""')}","${t.status}","${(t.merchant_name || '').replace(/"/g, '""')}","${getTagUrl(t.code)}",${t.scan_count || 0}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanasore-nfc-tags-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTag = async (code: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/nfc/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTags((prev) => prev.filter((t) => t.code !== code));
    } catch {}
  };

  const unclaimedCount = tags.filter((t) => t.status === 'UNCLAIMED').length;
  const activeCount = tags.filter((t) => t.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span>Usine à Plaques NFC Dynamiques Nanasore</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Générez des lots de plaques (NS-0001…), gravez-les en série sur Android et exportez le CSV pour l&apos;imprimeur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={tags.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV Imprimeur</span>
          </button>
          <button
            type="button"
            onClick={loadTags}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total Plaques</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{tags.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
          <p className="text-[10px] font-bold uppercase text-amber-400">Prêtes à vendre</p>
          <p className="text-2xl font-black text-amber-300 font-mono mt-1">{unclaimedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
          <p className="text-[10px] font-bold uppercase text-emerald-400">Activées Marchands</p>
          <p className="text-2xl font-black text-emerald-300 font-mono mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Générateur de lot */}
      <form
        onSubmit={handleGenerateBatch}
        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
      >
        <div>
          <label className="text-slate-400 font-bold block mb-1">Préfixe</label>
          <input
            type="text"
            maxLength={6}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
          />
        </div>
        <div>
          <label className="text-slate-400 font-bold block mb-1">Quantité (1 à 200)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
          />
        </div>
        <div>
          <label className="text-slate-400 font-bold block mb-1">Nom du lot</label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Création...' : 'Générer le lot'}</span>
        </button>
      </form>

      {nfcFeedback && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/40 text-xs text-slate-200 font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{nfcFeedback}</span>
        </div>
      )}

      {/* Liste des plaques */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
              <th className="py-3 px-4">Code Plaque</th>
              <th className="py-3 px-3">Lot</th>
              <th className="py-3 px-3">Statut / Marchand</th>
              <th className="py-3 px-3">Scans</th>
              <th className="py-3 px-4 text-right">Actions (Gravure & QR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {tags.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  Aucune plaque NFC générée pour le moment. Créez votre premier lot ci-dessus !
                </td>
              </tr>
            ) : (
              tags.map((t) => (
                <tr key={t.code} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-black text-white">{t.code}</td>
                  <td className="py-3 px-3 text-slate-400">{t.batch_name}</td>
                  <td className="py-3 px-3">
                    {t.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[10.5px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Activée • {t.merchant_name || 'Marchand'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[10.5px]">
                        <Clock className="w-3 h-3" />
                        <span>Vierge (Prête à vendre)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-300">{t.scan_count || 0}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={writingCode === t.code}
                        onClick={() => handleWriteNfc(t.code)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-60"
                        title="Graver cette URL sur une puce NFC vierge"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>{writingCode === t.code ? 'Approchez...' : 'Graver NFC'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadQrPng(t.code)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                        title="Télécharger le QR Code HD PNG"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(getTagUrl(t.code));
                          setCopiedCode(t.code);
                          setTimeout(() => setCopiedCode(''), 1800);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                        title="Copier le lien NFC"
                      >
                        {copiedCode === t.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={`/nfc/${encodeURIComponent(t.code)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                        title="Ouvrir la page de cette plaque"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(t.code)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                        title="Supprimer cette plaque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NfcBatchManagerPanel;
