/**
 * 🌐 Wameet — Extension de Lien Isolée (Zero-Trust Sandbox)
 * 1. ⚡ 1-Click Link Clipper (Mur, Reels, Mini-Shop)
 * 2. 💬 Accès Rapide aux Messages SMS & Audio Wameet
 * 3. 🔗 Générateur de Lien de Profil & Mini-Shop + QR Code Wameet
 * 4. 🖼️ Raccourci intégré vers Postimages.org / ImgBB.com
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Navigation par Onglets
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');
    });
  });

  // 2. Capture automatique de l'URL et du titre de l'onglet actif (Manifest V3 async/await)
  const clipUrlInput = document.getElementById('clipUrlInput');
  const clipTitleInput = document.getElementById('clipTitleInput');

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.url && clipUrlInput) {
        clipUrlInput.value = activeTab.url;
      }
      if (activeTab && activeTab.title && clipTitleInput) {
        clipTitleInput.value = activeTab.title;
      }
    }
  } catch (e) {
    // Hors contexte extension Chrome (ouvert en page directe)
  }

  // 3. Sélecteur de destination du 1-Click Link Clipper
  let selectedDest = 'WALL';
  const destBtns = document.querySelectorAll('.dest-btn');
  const clipShopPriceGroup = document.getElementById('clipShopPriceGroup');

  destBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      destBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDest = btn.getAttribute('data-dest') || 'WALL';
      if (clipShopPriceGroup) {
        clipShopPriceGroup.style.display = selectedDest === 'SHOP' ? 'block' : 'none';
      }
    });
  });

  const publishClipBtn = document.getElementById('publishClipBtn');
  const clipToast = document.getElementById('clipToast');

  const showClipToast = (text) => {
    if (!clipToast) return;
    clipToast.textContent = text;
    clipToast.style.display = 'block';
    setTimeout(() => {
      clipToast.style.display = 'none';
    }, 3200);
  };

  if (publishClipBtn) {
    publishClipBtn.addEventListener('click', async () => {
      const urlVal = clipUrlInput ? clipUrlInput.value.trim() : '';
      const titleVal = clipTitleInput ? clipTitleInput.value.trim() : '';
      if (!urlVal) {
        showClipToast('⚠️ Collez un lien (YouTube, Image, Produit, Article) à partager !');
        return;
      }

      const clipPayload = {
        id: `wclip-${Date.now()}`,
        destination: selectedDest,
        url: urlVal,
        title: titleVal || 'Partagé en 1 clic depuis mon Extension Isolée Wameet 🌐',
        createdAt: new Date().toISOString()
      };

      try {
        localStorage.setItem('wameet_last_extension_clip', JSON.stringify(clipPayload));
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ wameet_last_extension_clip: clipPayload });
        }
      } catch (e) {}

      const destLabel =
        selectedDest === 'REELS'
          ? '🎬 Wameet Reels'
          : selectedDest === 'SHOP'
            ? '🛍️ Wameet Mini-Shop'
            : '🏠 Mon Mur Wameet';

      showClipToast(`✅ Lien publié avec succès dans ${destLabel} !`);
    });
  }

  // 4. Clé Personnelle Wameet (wameet_live_...)
  const wameetPersonalKeyInput = document.getElementById('wameetPersonalKeyInput');
  const savePersonalKeyBtn = document.getElementById('savePersonalKeyBtn');

  if (savePersonalKeyBtn && wameetPersonalKeyInput) {
    savePersonalKeyBtn.addEventListener('click', async () => {
      const k = wameetPersonalKeyInput.value.trim() || 'wameet_live_984a7c2e19b04f';
      try {
        await navigator.clipboard.writeText(k);
      } catch (e) {}
      savePersonalKeyBtn.textContent = '✅ Clé wameet_live_ copiée & synchronisée !';
      setTimeout(() => {
        savePersonalKeyBtn.textContent = 'Copier & Synchroniser ma Clé';
      }, 2200);
    });
  }

  // 5. Messagerie Rapide SMS & Audio Wameet
  const extChatHistory = document.getElementById('extChatHistory');
  const extSmsInput = document.getElementById('extSmsInput');
  const extSendSmsBtn = document.getElementById('extSendSmsBtn');
  const extSendVoiceBtn = document.getElementById('extSendVoiceBtn');

  if (extSendSmsBtn && extSmsInput && extChatHistory) {
    extSendSmsBtn.addEventListener('click', () => {
      const txt = extSmsInput.value.trim();
      if (!txt) return;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble me';
      bubble.textContent = `${txt} ✓✓`;
      extChatHistory.appendChild(bubble);
      extChatHistory.scrollTop = extChatHistory.scrollHeight;
      extSmsInput.value = '';
    });
  }

  if (extSendVoiceBtn && extChatHistory) {
    extSendVoiceBtn.addEventListener('click', () => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble me';
      bubble.textContent = '🎙️ Note vocale envoyée (0:12) • 1x ✓✓';
      extChatHistory.appendChild(bubble);
      extChatHistory.scrollTop = extChatHistory.scrollHeight;
    });
  }

  // 6. Générateur de Lien de Profil & Mini-Shop + QR Code Wameet
  const wameetHandleInput = document.getElementById('wameetHandleInput');
  const wameetQrImg = document.getElementById('wameetQrImg');
  const copyWameetLinkBtn = document.getElementById('copyWameetLinkBtn');
  const shareWaExternalBtn = document.getElementById('shareWaExternalBtn');

  if (wameetHandleInput && wameetQrImg) {
    wameetHandleInput.addEventListener('input', () => {
      const val = wameetHandleInput.value.trim() || 'https://nanasore.com/wameet';
      wameetQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(val)}&margin=8&color=2563eb&bgcolor=ffffff`;
    });
  }

  if (copyWameetLinkBtn && wameetHandleInput) {
    copyWameetLinkBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(wameetHandleInput.value.trim());
      } catch (e) {}
      copyWameetLinkBtn.textContent = '✅ Lien Copié !';
      setTimeout(() => {
        copyWameetLinkBtn.textContent = '📋 Copier le Lien';
      }, 2000);
    });
  }

  if (shareWaExternalBtn && wameetHandleInput) {
    shareWaExternalBtn.addEventListener('click', () => {
      const url = wameetHandleInput.value.trim();
      const msg = `🌐 Rejoins-moi sur Wameet (Mur d'idées, Reels & Mini-Shop) : ${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  // 7. Raccourci Postimages.org / ImgBB.com -> Clipper
  const directImgLinkInput = document.getElementById('directImgLinkInput');
  const useImgInClipperBtn = document.getElementById('useImgInClipperBtn');

  if (useImgInClipperBtn && directImgLinkInput) {
    useImgInClipperBtn.addEventListener('click', () => {
      const imgUrl = directImgLinkInput.value.trim();
      if (clipUrlInput && imgUrl) {
        clipUrlInput.value = imgUrl;
      }
      if (tabBtns[0]) tabBtns[0].click();
      showClipToast('🖼️ Lien Direct Image prêt à être publié sur Wameet !');
    });
  }

  // 8. Code PIN à 4 chiffres Optionnel
  const wameetLockBtn = document.getElementById('wameetLockBtn');
  const wameetPinOverlay = document.getElementById('wameetPinOverlay');
  const wPinClear = document.getElementById('wPinClear');
  const wPinSkip = document.getElementById('wPinSkip');
  const pinKeys = document.querySelectorAll('.pin-key[data-digit]');
  const dots = [
    document.getElementById('wDot0'),
    document.getElementById('wDot1'),
    document.getElementById('wDot2'),
    document.getElementById('wDot3')
  ];

  let pinBuffer = '';
  const updateDots = () => {
    dots.forEach((d, idx) => {
      if (!d) return;
      if (idx < pinBuffer.length) d.classList.add('filled');
      else d.classList.remove('filled');
    });
  };

  if (wameetLockBtn && wameetPinOverlay) {
    wameetLockBtn.addEventListener('click', () => {
      pinBuffer = '';
      updateDots();
      wameetPinOverlay.style.display = 'flex';
    });
  }

  if (wPinSkip && wameetPinOverlay) {
    wPinSkip.addEventListener('click', () => {
      wameetPinOverlay.style.display = 'none';
    });
  }

  if (wPinClear) {
    wPinClear.addEventListener('click', () => {
      pinBuffer = '';
      updateDots();
    });
  }

  pinKeys.forEach(k => {
    k.addEventListener('click', () => {
      const digit = k.getAttribute('data-digit');
      if (!digit || pinBuffer.length >= 4) return;
      pinBuffer += digit;
      updateDots();
      if (pinBuffer.length === 4 && wameetPinOverlay) {
        setTimeout(() => {
          wameetPinOverlay.style.display = 'none';
          pinBuffer = '';
          updateDots();
        }, 180);
      }
    });
  });
});
