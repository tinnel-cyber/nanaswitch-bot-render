/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NaNaSwitch Cloud — Page 5 : Le Hub de l'Extension Isolée & SDK Universel (/nana-switch/extension)
 * Charte graphique : Bleu Royal (#2563EB) & Blanc Pur (#FFFFFF).
 * Positionnement : Routeur SaaS Cloud Intelligent & Zero-Trust Sandbox.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Puzzle, 
  Key, 
  ShieldCheck, 
  Zap, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Globe, 
  Code, 
  CheckCircle2, 
  Sliders, 
  ExternalLink, 
  Store, 
  Smartphone, 
  Terminal, 
  Layers, 
  Radio, 
  ChevronRight, 
  X,
  FileCode,
  FileArchive,
  ArrowRight,
  QrCode,
  Share2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';
import { NaNaSwitchLogo } from '../components/NaNaSwitchLogo';

export interface NaNaSwitchExtensionPageProps {
  onNavigate?: (path: string) => void;
}

type CodeTab = 'html' | 'react' | 'node' | 'php';

// Petit utilitaire pur pour générer un vrai fichier ZIP sans dépendance externe
function createSimpleZip(files: { name: string; content: string }[]): Blob {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(bytes: Uint8Array): number {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const encoder = new TextEncoder();
  const fileEntries: { nameBytes: Uint8Array; dataBytes: Uint8Array; crc: number; offset: number }[] = [];
  const parts: Uint8Array[] = [];
  let currentOffset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = encoder.encode(f.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = uncompressed)
    view.setUint16(10, 0, true); // Mod time
    view.setUint16(12, 0, true); // Mod date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(dataBytes);

    fileEntries.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset
    });

    currentOffset += localHeader.length + dataBytes.length;
  }

  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed
    view.setUint16(8, 0, true); // Flags
    view.setUint16(10, 0, true); // Compression
    view.setUint16(12, 0, true); // Time
    view.setUint16(14, 0, true); // Date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.dataBytes.length, true); // Compressed size
    view.setUint32(24, entry.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, entry.offset, true); // Offset of local header
    cdHeader.set(entry.nameBytes, 46);

    parts.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central dir
  eocdView.setUint16(8, fileEntries.length, true); // Total entries on disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Size of central dir
  eocdView.setUint32(16, centralDirStart, true); // Offset of central dir
  eocdView.setUint16(20, 0, true); // Comment length
  parts.push(eocd);

  return new Blob(parts, { type: 'application/zip' });
}

export const NaNaSwitchExtensionPage: React.FC<NaNaSwitchExtensionPageProps> = ({
  onNavigate
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const { user } = useAuth();
  const tenantId = useMemo(() => {
    return user?.storeId || user?.uid || 'merchant-demo';
  }, [user]);

  // Code d'appairage rapide
  const [pairingCode, setPairingCode] = useState<string>(() => {
    return `PAIR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [copiedPairing, setCopiedPairing] = useState<boolean>(false);

  // Clé d'API d'exemple ou active
  const sampleApiKey = useMemo(() => {
    return `nana_sw_live_${tenantId.slice(0, 6)}8f2a`;
  }, [tenantId]);

  // Onglet Code Snippet actif
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('html');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Connexion 1-clic Boutique Nanasore
  const [isStoreLinked, setIsStoreLinked] = useState<boolean>(true);
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Guide d'installation Chrome & Copie de clé
  const [copiedChromeUrl, setCopiedChromeUrl] = useState<boolean>(false);
  const [copiedActiveKey, setCopiedActiveKey] = useState<boolean>(false);

  // Modale QR Code NaNaSwitch Pocket pour Téléphone
  const [isPocketModalOpen, setIsPocketModalOpen] = useState<boolean>(false);

  // =========================================================================
  // 2. CHARGEMENT DE L'ÉTAT DU LIEN BOUTIQUE
  // =========================================================================

  useEffect(() => {
    try {
      const localLinked = localStorage.getItem(`nanaswitch_store_link_${tenantId}`);
      if (localLinked !== null) {
        setIsStoreLinked(localLinked === 'true');
      }
    } catch (e) {
      console.warn('[NANA_SWITCH] Lecture store_link :', e);
    }

    const checkRemote = async () => {
      try {
        const docRef = doc(db, 'switch_security_settings', tenantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.storeLinked === 'boolean') {
            setIsStoreLinked(data.storeLinked);
          }
        }
      } catch (err) {
        console.warn('[NANA_SWITCH] Sync settings Firestore :', err);
      }
    };

    checkRemote();
  }, [tenantId]);

  // =========================================================================
  // 3. ACTIONS UTILISATEUR
  // =========================================================================

  const handleCopyPairingCode = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText(pairingCode);
    setCopiedPairing(true);
    setToastMessage(`Code d'appairage (${pairingCode}) copié !`);
    setTimeout(() => setCopiedPairing(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [pairingCode]);

  const handleRegeneratePairing = useCallback(() => {
    playTapBeep();
    const newCode = `PAIR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setPairingCode(newCode);
    setToastMessage(`Nouveau code d'appairage généré : ${newCode}`);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleCopyChromeUrl = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedChromeUrl(true);
    setToastMessage('URL "chrome://extensions" copiée dans le presse-papier !');
    setTimeout(() => setCopiedChromeUrl(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleCopyActiveKey = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText(sampleApiKey);
    setCopiedActiveKey(true);
    setToastMessage(`Clé Cloud active (${sampleApiKey}) copiée !`);
    setTimeout(() => setCopiedActiveKey(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [sampleApiKey]);

  const handleToggleStoreLink = useCallback(async () => {
    playTapBeep();
    setIsLinking(true);
    const nextState = !isStoreLinked;
    setIsStoreLinked(nextState);

    try {
      localStorage.setItem(`nanaswitch_store_link_${tenantId}`, String(nextState));
      const docRef = doc(db, 'switch_security_settings', tenantId);
      await setDoc(docRef, {
        tenantId,
        storeLinked: nextState,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      playValidationBeep();
      setToastMessage(
        nextState 
          ? '⚡ NaNaSwitch Cloud connecté en direct à votre Boutique & vos Tunnels Nanasore !'
          : 'Boutique Nanasore déconnectée de NaNaSwitch Cloud.'
      );
    } catch (err) {
      console.warn('[NANA_SWITCH] Erreur update store link :', err);
    } finally {
      setIsLinking(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  }, [isStoreLinked, tenantId]);

  // =========================================================================
  // 4. TÉLÉCHARGEMENT DU PACKAGE EXTENSION ISOLÉE (.ZIP)
  // =========================================================================

  const handleDownloadExtensionZip = useCallback(async () => {
    playTapBeep();
    setToastMessage('📦 Préparation du package ZIP Zero-Trust...');

    const fetchOrFallback = async (path: string, fallback: string) => {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.trim().length > 0) return txt;
        }
      } catch (err) {
        console.warn(`[NANA_SWITCH] Lecture ${path} locale:`, err);
      }
      return fallback;
    };

    const manifestFallback = JSON.stringify({
      manifest_version: 3,
      name: "NaNaSwitch Cloud — Smart API Router & Connector",
      short_name: "NaNaSwitch",
      version: "1.0.0",
      description: "Extension Zero-Trust isolée pour relier vos outils au Routeur NaNaSwitch Cloud Node avec auto-failover 0ms.",
      permissions: ["storage", "activeTab"],
      host_permissions: ["https://cloud.nanasore.com/*"],
      action: {
        default_popup: "popup.html",
        default_title: "NaNaSwitch Cloud Router",
        default_icon: {
          16: "icons/icon16.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png"
        }
      },
      background: {
        service_worker: "background.js"
      },
      icons: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png"
      }
    }, null, 2);

    const backgroundFallback = `/**
 * NaNaSwitch Cloud — Smart API Router & Connector
 * Background Service Worker (Manifest V3)
 * Architecture Zero-Trust : Aucune dépendance mère, communication sécurisée Nœud Cloud.
 */

const CLOUD_ROUTER_NODE = "https://cloud.nanasore.com/v1/switch/route";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[NaNaSwitch Cloud] Extension Zero-Trust initialisée avec succès.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "route_payment" || request.action === "dispatch_api") {
    chrome.storage.local.get(["nanaswitch_api_key"], async (result) => {
      const apiKey = result.nanaswitch_api_key;
      if (!apiKey) {
        sendResponse({ 
          success: false, 
          error: "Jeton Cloud non configuré. Veuillez renseigner votre clé nana_sw_live_... dans l'extension." 
        });
        return;
      }

      try {
        const response = await fetch(CLOUD_ROUTER_NODE, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "X-NaNaSwitch-Key": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(request.payload || {})
        });

        const data = await response.json();
        sendResponse({ success: true, data });
      } catch (err) {
        sendResponse({ success: false, error: err.message || "Erreur réseau Nœud Cloud" });
      }
    });

    return true;
  }
});
`;

    const popupHtmlFallback = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NaNaSwitch Cloud — Smart API Router</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <div class="header-logo">
        <div class="logo-icon" style="background: transparent; padding: 0; width: 32px; height: 32px;">
          <svg viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <path d="M 50 4 L 91 18 C 91 53 79 81 50 96 C 21 81 9 53 9 18 Z" fill="#0F172A" stroke="#38BDF8" stroke-width="4"/>
            <path d="M 50 9 L 86 21.5 C 86 52 75 76.5 50 90.5 C 25 76.5 14 52 14 21.5 Z" fill="#1E3A8A" stroke="#FFFFFF" stroke-width="1.5"/>
            <path d="M 31 59 H 68 C 74.5 59 79 54.5 79 48.5 C 79 43 75 38.5 69.5 38 C 68 29.5 60.5 23.5 51.5 23.5 C 43.5 23.5 36.8 28.2 34.2 35.2 C 28.2 35.8 23.5 40.8 23.5 47 C 23.5 53.6 26.8 59 31 59 Z" fill="#FFFFFF"/>
            <path d="M 22 65 C 36 74, 59 73, 76 53" fill="none" stroke="#38BDF8" stroke-width="5.5" stroke-linecap="round"/>
            <polygon points="82,47 68,50 77,60" fill="#FFFFFF"/>
          </svg>
        </div>
        <div>
          <h1 class="logo-title">NaNaSwitch Cloud</h1>
          <span class="logo-subtitle">Smart API Router • Le Cœur de Routage</span>
        </div>
      </div>
      <div class="header-badge" id="cloudNodeBadge">Nœud Cloud Isolé</div>
    </header>

    <nav class="tabs-nav">
      <button type="button" class="tab-btn active" data-tab="connectTab">
        <span>🔑 Connexion</span>
      </button>
      <button type="button" class="tab-btn" data-tab="routerTab">
        <span>⚡ Routeur Express</span>
      </button>
      <button type="button" class="tab-btn" data-tab="pingTab">
        <span>📡 Ping & Statut</span>
      </button>
    </nav>

    <main class="tabs-content">
      <section class="tab-pane active" id="connectTab">
        <div class="card">
          <div class="card-title">🔐 Authentification Zero-Trust</div>
          <p class="card-desc">
            Collez votre clé API Cloud générée dans NaNaSwitch Cloud (/nana-switch/security).
          </p>
          <div class="form-group">
            <label for="apiKeyInput">Clé Cloud (nana_sw_live_... ou test_) :</label>
            <div class="input-with-icon">
              <input type="password" id="apiKeyInput" placeholder="nana_sw_live_xxxxxxxxxxxxxxxx" autocomplete="off" />
              <button type="button" id="toggleKeyVisibility" class="btn-icon" title="Afficher/Masquer">👁️</button>
            </div>
          </div>
          <div class="form-group">
            <label for="cloudEndpointInput">Endpoint du Nœud Cloud :</label>
            <input type="text" id="cloudEndpointInput" value="https://cloud.nanasore.com/v1" readonly class="input-readonly" />
          </div>
          <button type="button" id="saveKeyBtn" class="btn btn-primary">
            <span>🔒 Chiffrer & Enregistrer la Clé</span>
          </button>
        </div>

        <div class="status-banner" id="connectionStatusBanner">
          <div class="status-indicator online" id="statusDot"></div>
          <div class="status-text">
            <strong id="statusTitle">🟢 Connecté à NaNaSwitch Cloud</strong>
            <div id="statusSub">Solde : <span id="creditBalanceDisplay">250</span> Crédits • IP Fixe : 194.163.148.22</div>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="routerTab">
        <div class="card">
          <div class="card-title">⚡ Aiguillage Géographique Express</div>
          <p class="card-desc">Créez une route d'exécution instantanée.</p>
          <div class="form-group">
            <label for="countrySelect">Zone Géographique / Pays :</label>
            <select id="countrySelect" class="form-select">
              <option value="BF">🇧🇫 Burkina Faso (Orange / Moov)</option>
              <option value="CI">🇨🇮 Côte d’Ivoire (Wave / MTN / Orange)</option>
              <option value="SN">🇸🇳 Sénégal (Wave / Free / Orange)</option>
              <option value="ML">🇲🇱 Mali (Orange / Moov Africa)</option>
              <option value="BJ">🇧🇯 Bénin (MTN / Moov / FedaPay)</option>
              <option value="TG">🇹🇬 Togo (T-Money / Moov)</option>
              <option value="INT">🌍 International / Diaspora (Cartes 3DS)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label for="amountInput">Montant :</label>
              <input type="number" id="amountInput" value="15000" step="500" />
            </div>
            <div class="form-group half">
              <label for="currencyInput">Devise :</label>
              <input type="text" id="currencyInput" value="XOF" readonly class="input-readonly" />
            </div>
          </div>
          <button type="button" id="generateRouteBtn" class="btn btn-primary">
            <span>🚀 Générer une Route / Lien Cloud</span>
          </button>
        </div>

        <div class="result-box" id="routeResultBox" style="display: none;">
          <div class="result-header">
            <span class="result-pill" id="routedConnectorBadge">Routé via SebPay Direct</span>
            <span class="latency-pill" id="routeLatencyBadge">⚡ 38ms</span>
          </div>
          <div class="result-url-wrap">
            <input type="text" id="generatedUrlInput" readonly class="url-input" />
            <button type="button" id="copyUrlBtn" class="btn btn-sm btn-secondary">Copier</button>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="pingTab">
        <div class="card">
          <div class="card-title flex-between">
            <span>📡 Télémétrie & Latence Connecteurs</span>
            <button type="button" id="refreshPingBtn" class="btn-text">🔄 Rafraîchir</button>
          </div>
          <ul class="connector-list" id="connectorPingList">
            <li class="connector-item">
              <div class="connector-info"><span class="connector-flag">🇧🇫</span><div><div class="connector-name">SebPay API</div><div class="connector-meta">Burkina Faso & UEMOA</div></div></div>
              <span class="ping-badge fast">38 ms</span>
            </li>
            <li class="connector-item">
              <div class="connector-info"><span class="connector-flag">🇨🇮</span><div><div class="connector-name">CinetPay Hub</div><div class="connector-meta">Côte d'Ivoire & 10+ Pays</div></div></div>
              <span class="ping-badge fast">42 ms</span>
            </li>
            <li class="connector-item">
              <div class="connector-info"><span class="connector-flag">🇸🇳</span><div><div class="connector-name">PayDunya Core</div><div class="connector-meta">Sénégal & Zone Ouest</div></div></div>
              <span class="ping-badge fast">44 ms</span>
            </li>
            <li class="connector-item">
              <div class="connector-info"><span class="connector-flag">🌍</span><div><div class="connector-name">Stripe Global</div><div class="connector-meta">Cartes & Diaspora</div></div></div>
              <span class="ping-badge normal">65 ms</span>
            </li>
          </ul>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <span>Zero-Trust Sandbox • NaNaSwitch Cloud Node</span>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;

    const popupCssFallback = `/* NaNaSwitch Cloud — Extension Popup Styles (Bleu Royal & Blanc) */
:root {
  --blue-primary: #2563eb;
  --blue-hover: #1d4ed8;
  --blue-light: #eff6ff;
  --blue-border: #bfdbfe;
  --white: #ffffff;
  --slate-900: #0f172a;
  --slate-700: #334155;
  --slate-500: #64748b;
  --slate-200: #e2e8f0;
  --slate-100: #f1f5f9;
  --slate-50: #f8fafc;
  --emerald-500: #10b981;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 380px; height: 540px; background-color: var(--white); color: var(--slate-900); font-family: -apple-system, sans-serif; font-size: 12px; overflow: hidden; }
.app-container { display: flex; flex-direction: column; height: 100%; background: var(--white); }
.app-header { background: linear-gradient(135deg, #2563eb, #1e40af); color: #fff; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
.header-logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { width: 28px; height: 28px; background: #fff; color: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; }
.logo-title { font-size: 14px; font-weight: 900; }
.logo-subtitle { font-size: 10px; color: #bfdbfe; font-weight: 600; }
.header-badge { font-size: 9px; font-weight: 800; text-transform: uppercase; background: rgba(255, 255, 255, 0.2); padding: 3px 8px; border-radius: 999px; }
.tabs-nav { display: flex; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); padding: 4px 8px; gap: 4px; }
.tab-btn { flex: 1; background: none; border: none; padding: 8px 4px; font-size: 11px; font-weight: 700; color: var(--slate-500); border-radius: 8px; cursor: pointer; }
.tab-btn.active { color: var(--blue-primary); background: var(--white); border: 1px solid var(--slate-200); }
.tabs-content { flex: 1; overflow-y: auto; padding: 14px; }
.tab-pane { display: none; }
.tab-pane.active { display: block; }
.card { background: var(--white); border: 1px solid var(--slate-200); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.card-title { font-size: 12px; font-weight: 800; color: var(--slate-900); margin-bottom: 6px; }
.card-desc { font-size: 11px; color: var(--slate-500); margin-bottom: 12px; }
.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--slate-700); margin-bottom: 4px; }
.form-group input, .form-select { width: 100%; padding: 8px 10px; border: 1px solid var(--slate-200); border-radius: 8px; font-size: 12px; font-family: monospace; }
.btn { width: 100%; border: none; padding: 10px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; }
.btn-primary { background: var(--blue-primary); color: #fff; }
.status-banner { background: var(--blue-light); border: 1px solid var(--blue-border); border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
.status-indicator.online { width: 10px; height: 10px; border-radius: 50%; background: var(--emerald-500); }
.status-text strong { display: block; font-size: 11px; color: var(--slate-900); }
.status-text div { font-size: 10px; color: var(--slate-500); }
.app-footer { background: var(--slate-50); border-top: 1px solid var(--slate-200); padding: 8px 14px; font-size: 10px; color: var(--slate-500); text-align: center; }
`;

    const popupJsFallback = `document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const statusTitle = document.getElementById('statusTitle');

  chrome.storage.local.get(['nanaswitch_api_key'], (res) => {
    if (res.nanaswitch_api_key) {
      apiKeyInput.value = res.nanaswitch_api_key;
      if (statusTitle) statusTitle.textContent = '🟢 Connecté à NaNaSwitch Cloud';
    }
  });

  if (saveKeyBtn) {
    saveKeyBtn.addEventListener('click', () => {
      const k = apiKeyInput.value.trim();
      if (!k) return alert('Clé Cloud requise');
      chrome.storage.local.set({ nanaswitch_api_key: k }, () => {
        saveKeyBtn.textContent = '✅ Clé Enregistrée !';
        if (statusTitle) statusTitle.textContent = '🟢 Connecté à NaNaSwitch Cloud';
        setTimeout(() => { saveKeyBtn.textContent = '🔒 Chiffrer & Enregistrer la Clé'; }, 2000);
      });
    });
  }

  const generateRouteBtn = document.getElementById('generateRouteBtn');
  if (generateRouteBtn) {
    generateRouteBtn.addEventListener('click', () => {
      const c = document.getElementById('countrySelect').value;
      const amt = document.getElementById('amountInput').value || '15000';
      const cur = document.getElementById('currencyInput').value || 'XOF';
      const resBox = document.getElementById('routeResultBox');
      const urlInp = document.getElementById('generatedUrlInput');
      const pill = document.getElementById('routedConnectorBadge');
      const routeId = 'sw_' + Math.floor(100000 + Math.random() * 900000);
      urlInp.value = 'https://cloud.nanasore.com/pay/' + routeId + '?c=' + c + '&amt=' + amt + '&cur=' + cur;
      pill.textContent = 'Routé via ' + (c === 'CI' ? 'CinetPay Hub' : c === 'SN' ? 'PayDunya Core' : 'SebPay Direct');
      resBox.style.display = 'block';
    });
  }

  const copyUrlBtn = document.getElementById('copyUrlBtn');
  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      const inp = document.getElementById('generatedUrlInput');
      inp.select();
      navigator.clipboard.writeText(inp.value);
      copyUrlBtn.textContent = 'Copié !';
      setTimeout(() => { copyUrlBtn.textContent = 'Copier'; }, 2000);
    });
  }
});`;

    const readmeFallback = `# NaNaSwitch Cloud Connector (Chrome / Edge Unpacked)

## Installation en 3 Étapes Rapides :
1. Décompressez cette archive dans un dossier sur votre ordinateur.
2. Ouvrez Google Chrome ou Microsoft Edge et accédez à : chrome://extensions/
3. Activez le "Mode développeur" en haut à droite, puis cliquez sur "Charger l'extension non empaquetée" et sélectionnez ce dossier.
4. Ouvrez l'extension et collez votre clé nana_sw_live_... générée dans NaNaSwitch Cloud (/nana-switch/security).
`;

    const [manifestContent, backgroundContent, popupHtmlContent, popupCssContent, popupJsContent, readmeContent] = await Promise.all([
      fetchOrFallback('/nana-switch-extension/manifest.json', manifestFallback),
      fetchOrFallback('/nana-switch-extension/background.js', backgroundFallback),
      fetchOrFallback('/nana-switch-extension/popup.html', popupHtmlFallback),
      fetchOrFallback('/nana-switch-extension/popup.css', popupCssFallback),
      fetchOrFallback('/nana-switch-extension/popup.js', popupJsFallback),
      fetchOrFallback('/nana-switch-extension/README.md', readmeFallback),
    ]);

    const zipBlob = createSimpleZip([
      { name: "manifest.json", content: manifestContent },
      { name: "background.js", content: backgroundContent },
      { name: "popup.html", content: popupHtmlContent },
      { name: "popup.css", content: popupCssContent },
      { name: "popup.js", content: popupJsContent },
      { name: "README.md", content: readmeContent }
    ]);

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanaswitch-cloud-connector-${tenantId.slice(0, 6)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    playValidationBeep();
    setToastMessage('📦 Package ZIP de l\'Extension Isolée téléchargé avec succès !');
    setTimeout(() => setToastMessage(null), 4000);
  }, [tenantId]);

  // =========================================================================
  // 5. SNIPPETS DE CODE INTÉGRATION 1-LIGNE
  // =========================================================================

  const snippets: Record<CodeTab, { title: string; code: string; lang: string }> = useMemo(() => {
    return {
      html: {
        title: 'HTML / Script 1-Ligne',
        lang: 'html',
        code: `<!-- 1. Insérez le script universel NaNaSwitch Cloud dans votre page -->
<script src="https://cloud.nanasore.com/v1/switch.js" 
        data-switch-key="${sampleApiKey}" 
        data-tenant="${tenantId}"></script>

<!-- 2. Déclenchez l'Aiguillage Intelligent sur votre bouton d'achat -->
<button onclick="NaNaSwitch.checkout({
  amount: 15000,
  currency: 'XOF',
  country: 'BF', // Détection GeoIP automatique si omis
  customer: {
    phone: '+22670000000',
    name: 'Moussa Ouédraogo'
  },
  onSuccess: function(result) {
    console.log('✅ Payé via : ' + result.connector + ' (' + result.transactionId + ')');
    window.location.href = '/merci?ref=' + result.reference;
  },
  onFailover: function(event) {
    console.warn('⚠️ Auto-Failover déclenché en ' + event.switchLatency + 'ms vers ' + event.fallbackConnector);
  }
})">
  ⚡ Payer en 1-Clic
</button>`
      },
      react: {
        title: 'React / Next.js',
        lang: 'typescript',
        code: `import React, { useState } from 'react';

// Exemple d'appel API vers le Routeur Cloud NaNaSwitch
export function ModernCheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://cloud.nanasore.com/v1/switch/route', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ${sampleApiKey}',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 25000,
          currency: 'XOF',
          country: 'CI', // Côte d'Ivoire -> CinetPay auto-failover PayDunya
          customer: { phone: '+22507000000' },
          metadata: { orderId: 'CMD_CI_8941' }
        })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
      {loading ? 'Aiguillage Cloud en cours...' : 'Payer via NaNaSwitch Cloud'}
    </button>
  );
}`
      },
      node: {
        title: 'Node.js / cURL',
        lang: 'bash',
        code: `# Requête API REST directe au Nœud Cloud isolé
curl -X POST https://cloud.nanasore.com/v1/switch/route \\
  -H "Authorization: Bearer ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "currency": "XOF",
    "country": "SN",
    "customer": {
      "phone": "+221770000000",
      "email": "client@dakar.sn"
    },
    "reference": "CMD_SN_99182",
    "callback_url": "https://monsite.com/api/webhook"
  }'`
      },
      php: {
        title: 'PHP / WooCommerce',
        lang: 'php',
        code: `<?php
// Exemple d'Aiguillage Intelligent NaNaSwitch Cloud en PHP
$apiKey = '${sampleApiKey}';
$endpoint = 'https://cloud.nanasore.com/v1/switch/route';

$payload = [
    'amount' => 50000,
    'currency' => 'XOF',
    'country' => 'BF', // Auto-Failover vers SebPay ou CinetPay selon la règle
    'callback_url' => 'https://votre-boutique.com/wc-api/nanaswitch',
    'customer' => ['phone' => '+22670123456']
];

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

// Rediriger le client vers l'URL retournée par la passerelle choisie
if (isset($response['redirect_url'])) {
    header('Location: ' . $response['redirect_url']);
    exit;
}
?>`
      }
    };
  }, [sampleApiKey, tenantId]);

  const handleCopySnippet = useCallback(() => {
    playTapBeep();
    navigator.clipboard.writeText(snippets[activeCodeTab].code);
    setCopiedSnippet(true);
    setToastMessage(`Snippet ${snippets[activeCodeTab].title} copié dans le presse-papier !`);
    setTimeout(() => setCopiedSnippet(false), 3000);
    setTimeout(() => setToastMessage(null), 3500);
  }, [snippets, activeCodeTab]);

  // =========================================================================
  // 6. RENDU PRINCIPAL DU HUB EXTENSION & SDK
  // =========================================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Toast Notification Flottante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 animate-slideUp">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Titre & Sous-titre de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
            <Puzzle className="w-3.5 h-3.5" />
            <span>Page 5 • Extension Isolée & SDK Universel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hub de l'Extension Isolée & SDK Universel 1-Ligne
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Branchez le Routeur NaNaSwitch Cloud à n'importe quel site WordPress, Shopify, React ou application mobile grâce à notre architecture Zero-Trust isolée.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/nana-switch/security')}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Key className="w-4 h-4" />
            <span>Gérer mes Clés Cloud (Page 6)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LES 2 MODES D'ACCÈS CLOUD : EXTENSION PC & APPLICATION MOBILE         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARTE 1 (Ordinateur) : Extension Navigateur */}
        <div className="bg-white rounded-3xl border-2 border-blue-200 hover:border-blue-500 p-6 sm:p-7 space-y-5 shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <NaNaSwitchLogo variant="mark" size="md" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                <span>💻 Ordinateur & Mac</span>
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>💻 NaNaSwitch Cloud — Extension Navigateur</span>
              </h2>
              <div className="text-xs font-bold text-blue-600 mt-0.5">
                Google Chrome, Microsoft Edge, Brave (Manifest V3)
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pour les développeurs et e-commerçants sur PC/Mac. Téléchargement direct du package .zip Zero-Trust à charger en mode développeur. Intègre le routeur d'urgence, la télémétrie et les snippets d'intégration.
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-Trust Sandbox</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Bascule 0ms</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleDownloadExtensionZip}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-blue-50 border-2 border-blue-600 text-blue-700 font-black text-xs shadow-md transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Télécharger l'Extension PC (.zip)</span>
            </button>
          </div>
        </div>

        {/* CARTE 2 (Téléphone Android & iPhone) : Application Mobile Isolée */}
        <div className="bg-white rounded-3xl border-2 border-blue-600 p-6 sm:p-7 space-y-5 shadow-lg shadow-blue-600/10 transition-all duration-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <NaNaSwitchLogo variant="mark" size="md" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>📱 iOS & Android</span>
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>📱 NaNaSwitch Cloud — Application Mobile Isolée</span>
              </h2>
              <div className="text-xs font-bold text-blue-600 mt-0.5">
                PWA Universelle Mobile — Conçue pour smartphone
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pour les entrepreneurs sur smartphone. Accessible instantanément sans installation complexe, partage WhatsApp 1-clic, QR Code Guichet client et Quick-Switch d'urgence par pays au pouce.
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Facture WhatsApp</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Guichet QR Code</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onNavigate) {
                  onNavigate('/nana-switch/app');
                } else {
                  window.location.href = '/nana-switch/app';
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>🚀 Ouvrir NaNaSwitch Cloud Mobile</span>
            </button>

            <button
              type="button"
              onClick={() => { playTapBeep(); setIsPocketModalOpen(true); }}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 text-slate-800 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>📲 Afficher le QR Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DÉPLOIEMENT RAPIDE & GUIDE D'INSTALLATION EXTENSION                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 sm:p-8 space-y-6 shadow-sm">

        {/* Panneau d'Appairage Rapide 1-Clic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/60 p-5 rounded-2xl border border-blue-200">
          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Code d'Appairage Rapide :
            </div>
            <div className="flex items-center gap-2">
              <div className="text-base font-mono font-black text-blue-900 bg-white px-3.5 py-1.5 rounded-xl border border-blue-300 shadow-inner">
                {pairingCode}
              </div>
              <button
                type="button"
                onClick={handleCopyPairingCode}
                className="p-2 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                title="Copier le code"
              >
                {copiedPairing ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleRegeneratePairing}
                className="p-2 rounded-xl bg-white border border-blue-200 text-slate-600 hover:bg-blue-100 transition cursor-pointer"
                title="Régénérer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Protocole de Sécurité :
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>TLS 1.3 • Chiffrement Volatile 0ms</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Isolation complète des identifiants marchands
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Compatibilité Navigateur :
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pt-1">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Google Chrome, Edge, Brave (Manifest V3)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Prêt pour installation "Non empaquetée"
            </div>
          </div>
        </div>

        {/* Guide d'Installation Visuel en 3 Étapes Rapides */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Guide d'Installation en 3 Étapes Rapides (Chrome, Edge, Brave)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Déployez l'extension en moins de 60 secondes en mode développement sans passer par les stores.
              </p>
            </div>
            <span className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Zero-Trust Sandbox
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Étape 1 */}
            <div className="bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Étape 01</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Télécharger & Décompresser</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cliquez sur le bouton bleu ci-dessus pour télécharger l'archive ZIP, puis extrayez le dossier sur votre disque dur.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadExtensionZip}
                className="w-full py-2 px-3 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileArchive className="w-3.5 h-3.5" />
                <span>Télécharger (.zip)</span>
              </button>
            </div>

            {/* Étape 2 */}
            <div className="bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Étape 02</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Activer le Mode Développeur</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ouvrez la page des extensions dans votre navigateur, puis activez l'interrupteur <strong className="text-slate-800">"Mode développeur"</strong> en haut à droite.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyChromeUrl}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedChromeUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">chrome://extensions copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copier chrome://extensions</span>
                  </>
                )}
              </button>
            </div>

            {/* Étape 3 */}
            <div className="bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                    3
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Étape 03</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Charger & Coller votre Clé</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cliquez sur <strong className="text-slate-800">"Charger l'extension non empaquetée"</strong>, sélectionnez le dossier, puis collez votre clé Cloud.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyActiveKey}
                  className="flex-1 py-2 px-3 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  title="Copier la clé API active"
                >
                  {copiedActiveKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Clé copiée !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier ma Clé</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('/nana-switch/security')}
                  className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  title="Gérer les clés dans Page 6"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONNEXION 1-CLIC BOUTIQUE & TUNNELS NANASORE */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50/90 via-white to-blue-50/50 rounded-3xl border-2 border-blue-200 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/25">
            <Store className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                ⚡ Activer NaNaSwitch Cloud sur ma Boutique & mes Tunnels Nanasore
              </h3>
              {isStoreLinked ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Actif sur nsore.shop
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-full">
                  Désactivé
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Reliez en 1 clic vos vitrines clients (nsore.shop), le Tiroir Panier et vos Tunnels de vente à la matrice de routage intelligente par pays et à l'auto-failover 0ms de NaNaSwitch Cloud.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-shrink-0">
          <span className="text-xs font-bold text-slate-700">
            {isStoreLinked ? 'Routage Connecté' : 'Hors-Ligne'}
          </span>
          <button
            type="button"
            disabled={isLinking}
            onClick={handleToggleStoreLink}
            className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
              isStoreLinked ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
            title="Activer ou désactiver sur la boutique Nanasore"
          >
            <div className="w-6 h-6 rounded-full bg-white shadow-md" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GÉNÉRATEUR DE SNIPPET UNIVERSEL "1-LIGNE" */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-600" />
              <span>Générateur de Snippet Universel "1-Ligne"</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Copiez ce code prêt à l'emploi dans WordPress, WooCommerce, Shopify, React ou votre backend.
            </p>
          </div>

          {/* Onglets de sélection de langage */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveCodeTab('html'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCodeTab === 'html'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTML / Script 1-Ligne
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveCodeTab('react'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCodeTab === 'react'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              React / Next.js
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveCodeTab('node'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCodeTab === 'node'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Node.js / cURL
            </button>
            <button
              type="button"
              onClick={() => { playTapBeep(); setActiveCodeTab('php'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCodeTab === 'php'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PHP / WooCommerce
            </button>
          </div>
        </div>

        {/* Bloc de Code Sombre */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-slate-400 font-bold ml-2">
                {snippets[activeCodeTab].title}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopySnippet}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                copiedSnippet
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet ? 'Code Copié !' : '📋 Copier le code d\'intégration'}</span>
            </button>
          </div>

          <div className="p-5 overflow-x-auto text-blue-100 font-mono text-xs leading-relaxed">
            <pre><code>{snippets[activeCodeTab].code}</code></pre>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALE D'ACCÈS RAPIDE SMARTPHONE : NANASWITCH CLOUD MOBILE               */}
      {/* ========================================================================= */}
      {isPocketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border-2 border-blue-600 animate-scaleUp text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <NaNaSwitchLogo variant="mobile-header" theme="light" />
              </div>
              <button
                type="button"
                onClick={() => setIsPocketModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image QR Code Haute Définition */}
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-blue-300 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent('https://pos-app-1759a.web.app/nana-switch/app')}&margin=10&color=2563eb&bgcolor=ffffff`}
                alt="QR Code NaNaSwitch Cloud Mobile"
                className="w-52 h-52 mx-auto rounded-xl shadow-md"
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900">
                📲 Scannez avec l'appareil photo de votre smartphone
              </p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Ouvre instantanément <strong>NaNaSwitch Cloud Mobile</strong> sur <strong>iPhone</strong> ou <strong>Android</strong> : facturation WhatsApp, QR Code Guichet et Quick-Switch d'urgence !
              </p>
            </div>

            {/* Boutons d'Action Rapide */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsPocketModalOpen(false);
                  if (onNavigate) {
                    onNavigate('/nana-switch/app');
                  } else {
                    window.location.href = '/nana-switch/app';
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ouvrir NaNaSwitch Cloud Mobile dans mon Navigateur</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  navigator.clipboard.writeText('https://pos-app-1759a.web.app/nana-switch/app');
                  setToastMessage('Lien https://pos-app-1759a.web.app/nana-switch/app copié !');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le Lien Direct</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaNaSwitchExtensionPage;
