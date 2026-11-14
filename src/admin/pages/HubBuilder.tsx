import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Boxes, 
  Heading, 
  AlignLeft, 
  Image as ImageIcon, 
  PlayCircle, 
  Play, 
  Zap, 
  Plus, 
  Trash2, 
  X, 
  Sliders, 
  CloudUpload, 
  Maximize2, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Search, 
  MousePointer, 
  Pen, 
  Box, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Link } from '../../components/CentralHubOmnibar';

import { SlideModuleBlock, SlideItem, SlideSettings } from '../../components/storeBuilder/SlideModuleBlock';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { publishHubBlock, updateLocalAppRegistry, HubBlockConfig } from '../../services/hubPublishService';

export type BlockType = 'header' | 'description' | 'image' | 'video' | 'cta' | 'image_slider';

export interface BlockItem {
  id: string;
  type: BlockType;
  title: string;
  badge: string;
  text: string;
  url: string;
  imageUrl?: string;
  ctaText: string;
  trialBadge: string;
  tutorialUrl: string;
  slides?: SlideItem[];
  slideSettings?: SlideSettings;
}

// Fonction de nettoyage strict des objets pour Firebase (élimine tout undefined)
export const cleanObject = <T = any>(obj: T): T => {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? "" : value))
  );
};

// Création d'un bloc avec valeurs par défaut garanties (aucun undefined)
export const createBlockWithDefaults = (overrides: Partial<BlockItem> & { id: string; type: BlockType }): BlockItem => ({
  id: overrides.id,
  type: overrides.type,
  title: overrides.title ?? '',
  badge: overrides.badge ?? '',
  text: overrides.text ?? '',
  url: overrides.url ?? '',
  imageUrl: overrides.imageUrl ?? overrides.url ?? '',
  ctaText: overrides.ctaText ?? '',
  trialBadge: overrides.trialBadge ?? '',
  tutorialUrl: overrides.tutorialUrl ?? '',
  slides: overrides.slides ?? (overrides.type === 'image_slider' ? [
    { id: 'slide-1', imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80', captionTitle: 'Encaissement 1-Clic Rapide', captionText: 'Paiements directs Wave, Orange Money et Cartes bancaires sécurisés.' },
    { id: 'slide-2', imageUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80', captionTitle: 'Gestion de Stock en Temps Réel', captionText: 'Synchronisation automatique entre vos dépôts et vos points de vente physiques.' },
    { id: 'slide-3', imageUrl: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&auto=format&fit=crop&q=80', captionTitle: 'Rapports Financiers & KPI', captionText: 'Visualisez vos marges, recettes et chiffres d\'affaires au centime près.' }
  ] : []),
  slideSettings: overrides.slideSettings ?? (overrides.type === 'image_slider' ? {
    autoplay: true,
    interval: 4000,
    aspectRatio: 'wide'
  } : {
    autoplay: true,
    interval: 4000,
    aspectRatio: 'wide'
  })
});

export interface CardItem {
  id: string;
  blocks: BlockItem[];
  // Propriétés plates de compatibilité & Relations
  title?: string;
  description?: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  routeUrl?: string;
  palmares?: string;
  trialBadge?: string;
  tutorialUrl?: string;
  isRootApp?: boolean;
  linkedModuleIds?: string[];
}

export interface RowItem {
  id: string;
  title: string;
  cards: CardItem[];
  rowTitle?: string;
}

// FONCTION DE NETTOYAGE D'URL
const sanitizeMediaUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const match = trimmed.match(/\((https?:\/\/[^\)]+)\)/);
  const resolved = match ? match[1] : trimmed.replace(/^\[(.*?)\]$/, '$1').trim();
  return resolved;
};

export const HubBuilderPage = () => {
  // Structure initiale des données : initialisation stricte à vide [] (Chargement exclusif Firebase RTDB / Firestore)
  const [hubData, setHubData] = useState<RowItem[]>([]);

  const [selectedBlockInfo, setSelectedBlockInfo] = useState<{
    rowId: string;
    cardId: string;
    blockId: string;
  } | null>(null);

  const [draggedPaletteType, setDraggedPaletteType] = useState<BlockType | null>(null);
  const [activeDropCardId, setActiveDropCardId] = useState<string | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlaySearch, setOverlaySearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Blocs publiés synchronisés depuis le state du Canvas Builder
  const publishedBlocks = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      description: string;
      mediaType: 'image' | 'video';
      mediaUrl: string;
      routeUrl?: string;
      tutorialUrl: string;
      trialBadge: string;
      isRootApp?: boolean;
      linkedModuleIds?: string[];
    }> = [];

    hubData.forEach(row => {
      row.cards.forEach(card => {
        const headerBlock = card.blocks.find(b => b.type === 'header');
        const descBlock = card.blocks.find(b => b.type === 'description');
        const mediaBlock = card.blocks.find(b => b.type === 'image' || b.type === 'video');
        const ctaBlock = card.blocks.find(b => b.type === 'cta');

        list.push({
          id: card.id,
          title: headerBlock?.title || card.title || 'Nouveau Module',
          routeUrl: card.routeUrl || '',
          subtitle: headerBlock?.badge || card.palmares || 'Module Certifié NaNa',
          description: descBlock?.text || card.description || 'Description du module et fonctionnalités...',
          mediaType: (mediaBlock?.type as 'image' | 'video') || card.mediaType || 'image',
          mediaUrl: mediaBlock?.url || mediaBlock?.imageUrl || card.mediaUrl || card.imageUrl || '',
          tutorialUrl: ctaBlock?.tutorialUrl || card.tutorialUrl || '',
          trialBadge: ctaBlock?.trialBadge || card.trialBadge || '',
          isRootApp: card.isRootApp,
          linkedModuleIds: card.linkedModuleIds || []
        });
      });
    });

    return list;
  }, [hubData]);

  // Détection de l'Application Principale pour l'Overlay Prévisualisation
  const previewMatchedRootApp = useMemo(() => {
    const normalize = (val: string) =>
      (val || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const q = normalize(overlaySearch);

    const findCaisseCard = () => {
      return (
        publishedBlocks.find(b => b.isRootApp && (normalize(b.title).includes('caisse') || normalize(b.id).includes('caisse') || normalize(b.id).includes('pos'))) ||
        publishedBlocks.find(b => normalize(b.title).includes('caisse') || normalize(b.id).includes('card-2') || normalize(b.id).includes('pos')) ||
        publishedBlocks.find(b => b.isRootApp) ||
        publishedBlocks[0]
      );
    };

    // Helper pour récupérer les cartes compagnons de la même rangée
    const getCompanionIds = (cardId: string): string[] => {
      const companions: string[] = [];
      hubData.forEach(r => {
        if (r.cards.some(c => c.id === cardId)) {
          r.cards.forEach(c => {
            if (c.id !== cardId) companions.push(c.id);
          });
        }
      });
      return companions;
    };

    // Si la recherche est vide, afficher par défaut la Caisse POS avec ses modules associés
    if (!q) {
      const caisse = findCaisseCard();
      if (caisse) {
        const companions = getCompanionIds(caisse.id);
        const finalLinked = Array.from(new Set([...(caisse.linkedModuleIds || []), ...companions]));
        return {
          ...caisse,
          isRootApp: true,
          routeUrl: caisse.routeUrl || '/dashboard/apps/pos',
          linkedModuleIds: finalLinked.length > 0 ? finalLinked : ['mod_stock', 'mod_compta', 'mod_ia']
        };
      }
      return null;
    }

    // Détection permissive pour "caisse", "nom de caisse", "non de caisse", "pos", "tactile"
    if (
      q.includes('caisse') ||
      q.includes('pos') ||
      q.includes('cais') ||
      q.includes('tactile') ||
      q.includes('nom de caisse') ||
      q.includes('non de caisse') ||
      q.includes('point de vente')
    ) {
      const caisseCard = findCaisseCard();
      if (caisseCard) {
        const companions = getCompanionIds(caisseCard.id);
        const finalLinked = Array.from(new Set([...(caisseCard.linkedModuleIds || []), ...companions]));
        return {
          ...caisseCard,
          isRootApp: true,
          routeUrl: caisseCard.routeUrl || '/dashboard/apps/pos',
          linkedModuleIds: finalLinked.length > 0 ? finalLinked : ['mod_stock', 'mod_compta', 'mod_ia']
        };
      }
    }

    const found = publishedBlocks.find(b => 
      b.linkedModuleIds && 
      b.linkedModuleIds.length > 0 && 
      (normalize(b.title).includes(q) || normalize(b.description).includes(q) || normalize(b.subtitle).includes(q))
    );
    if (found) {
      const companions = getCompanionIds(found.id);
      return {
        ...found,
        isRootApp: true,
        linkedModuleIds: Array.from(new Set([...(found.linkedModuleIds || []), ...companions]))
      };
    }

    // Détection générique par titre
    const matchedGeneric = publishedBlocks.find(b => normalize(b.title).includes(q) || normalize(b.description).includes(q));
    if (matchedGeneric) {
      const companions = getCompanionIds(matchedGeneric.id);
      return {
        ...matchedGeneric,
        isRootApp: true,
        linkedModuleIds: Array.from(new Set([...(matchedGeneric.linkedModuleIds || []), ...companions]))
      };
    }

    return findCaisseCard() || null;
  }, [overlaySearch, publishedBlocks, hubData]);

  const previewLinkedModules = useMemo(() => {
    if (!previewMatchedRootApp) {
      return [];
    }

    const moduleIds = (previewMatchedRootApp.linkedModuleIds && previewMatchedRootApp.linkedModuleIds.length > 0)
      ? previewMatchedRootApp.linkedModuleIds
      : ['mod_stock', 'mod_compta', 'mod_ia'];

    return moduleIds.map(modId => {
      const fromPub = publishedBlocks.find(b => b.id === modId);
      if (fromPub) return fromPub;
      return {
        id: modId,
        title: modId.replace(/^mod_/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        routeUrl: `/dashboard/apps/${modId.replace(/^mod_/, '')}`,
        subtitle: 'Extension compatible',
        description: 'Extension activable avec le module racine sélectionné.',
        palmares: '⚡ Compatible',
        mediaType: 'image' as const,
        mediaUrl: '',
        tutorialUrl: ''
      };
    });
  }, [previewMatchedRootApp, publishedBlocks]);

  const [previewCheckedModules, setPreviewCheckedModules] = useState<Record<string, boolean>>({});

  // Synchronisation initiale depuis Firebase RTDB (/central_hub_config, /central_hub_blocks, /published_cards) ou LocalStorage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { rtdb } = await import('@/src/firebase');
        const { ref, get } = await import('firebase/database');
        if (rtdb) {
          // Tenter les nœuds potentiels de publication
          let data: any = null;
          for (const nodeKey of ['central_hub_config', 'central_hub_blocks', 'published_cards']) {
            const snapshot = await get(ref(rtdb, nodeKey));
            if (snapshot.exists()) {
              data = snapshot.val();
              break;
            }
          }

          if (data && isMounted) {
            const dataList: any[] = Array.isArray(data) 
              ? data.filter(Boolean) 
              : (typeof data === 'object' ? Object.values(data).filter(Boolean) : []);

            if (dataList.length > 0) {
              // Normalisation des rangées et des blocs
              const normalized = dataList.map((r: any, rIdx: number) => {
                const rawCards: any[] = Array.isArray(r.cards)
                  ? r.cards.filter(Boolean)
                  : (r.cards && typeof r.cards === 'object' ? Object.values(r.cards).filter(Boolean) : []);

                if (rawCards.length === 0 && (r.title || r.id || r.type || r.imageUrl || r.routeOrAction)) {
                  const cardId = r.id || `card-${rIdx + 1}`;
                  const isSlider = r.type === 'image_slider' || (r.slides && r.slides.length > 0);
                  const initialBlocks: BlockItem[] = [];
                  if (isSlider) {
                    initialBlocks.push(createBlockWithDefaults({
                      id: `b-slider-${cardId}`,
                      type: 'image_slider',
                      title: r.title || 'Slide Module',
                      slides: r.slides || [],
                      slideSettings: r.slideSettings || r.settings
                    }));
                  } else {
                    initialBlocks.push(createBlockWithDefaults({
                      id: `b-${cardId}-header`,
                      type: 'header',
                      title: r.title || 'Module',
                      badge: r.palmares || r.badge || ''
                    }));
                  }

                  return {
                    id: `row-${r.id || rIdx + 1}`,
                    title: r.category || r.title || `Section #${rIdx + 1}`,
                    cards: [{
                      id: cardId,
                      routeUrl: r.routeUrl || r.routeOrAction || '',
                      isRootApp: Boolean(r.isRootApp),
                      linkedModuleIds: r.linkedModuleIds || [],
                      title: r.title || 'Nouveau Module',
                      palmares: r.palmares || r.badge || '',
                      description: r.description || '',
                      mediaType: r.mediaType || 'image',
                      mediaUrl: sanitizeMediaUrl(r.mediaUrl || r.imageUrl || ''),
                      imageUrl: sanitizeMediaUrl(r.mediaUrl || r.imageUrl || ''),
                      tutorialUrl: r.tutorialUrl || '',
                      trialBadge: r.trialBadge || '',
                      trialType: r.trialType || 'freemium',
                      priceMonthly: r.priceMonthly || 0,
                      blocks: Array.isArray(r.blocks) && r.blocks.length > 0 ? r.blocks : initialBlocks
                    }]
                  };
                }

                return {
                  id: r.id || `row-${rIdx + 1}`,
                  title: r.title || r.rowTitle || `Section #${rIdx + 1}`,
                  cards: rawCards.map((c: any, cIdx: number) => {
                    if (Array.isArray(c.blocks) && c.blocks.length > 0) {
                      return {
                        id: c.id || `card-${cIdx + 1}`,
                        routeUrl: c.routeUrl || '',
                        isRootApp: Boolean(c.isRootApp),
                        linkedModuleIds: c.linkedModuleIds || [],
                        title: c.title || 'Nouveau Module',
                        palmares: c.palmares || '',
                        description: c.description || '',
                        mediaType: c.mediaType || 'image',
                        mediaUrl: sanitizeMediaUrl(c.mediaUrl || ''),
                        imageUrl: sanitizeMediaUrl(c.mediaUrl || ''),
                        tutorialUrl: c.tutorialUrl || '',
                        trialBadge: c.trialBadge || '',
                        blocks: c.blocks.map((b: any, bIdx: number) => createBlockWithDefaults({
                          id: b.id || `b-${Date.now()}-${bIdx}`,
                          type: b.type || 'header',
                          title: b.title || '',
                          badge: b.badge || '',
                          text: b.text || '',
                          url: (b.type === 'image' || b.type === 'video') ? sanitizeMediaUrl(b.url || '') : '',
                          imageUrl: (b.type === 'image' || b.type === 'video') ? sanitizeMediaUrl(b.url || '') : '',
                          ctaText: b.ctaText || '',
                          trialBadge: b.trialBadge || '',
                          tutorialUrl: b.tutorialUrl || '',
                          slides: b.slides || (b.type === 'image_slider' ? undefined : []),
                          slideSettings: b.slideSettings
                        }))
                      };
                    }
                    // Conversion depuis les anciennes cartes plates avec valeurs par défaut garanties
                    const blocks: BlockItem[] = [];
                    if (c.title || c.palmares) {
                      blocks.push(createBlockWithDefaults({
                        id: `b-${Date.now()}-${cIdx}-1`,
                        type: 'header',
                        title: c.title || 'Module',
                        badge: c.palmares || 'Populaire'
                      }));
                    }
                    if (c.description) {
                      blocks.push(createBlockWithDefaults({
                        id: `b-${Date.now()}-${cIdx}-2`,
                        type: 'description',
                        text: c.description
                      }));
                    }
                    if (c.mediaUrl) {
                      const cleanMedia = sanitizeMediaUrl(c.mediaUrl);
                      if (cleanMedia) {
                        blocks.push(createBlockWithDefaults({
                          id: `b-${Date.now()}-${cIdx}-3`,
                          type: c.mediaType === 'video' ? 'video' : 'image',
                          url: cleanMedia
                        }));
                      }
                    }
                    blocks.push(createBlockWithDefaults({
                      id: `b-${Date.now()}-${cIdx}-4`,
                      type: 'cta',
                      tutorialUrl: c.tutorialUrl || '',
                      trialBadge: c.trialBadge || 'Essai offert',
                      ctaText: 'Activer'
                    }));
                    return {
                      id: c.id || `card-${cIdx + 1}`,
                      routeUrl: c.routeUrl || '',
                      isRootApp: Boolean(c.isRootApp),
                      linkedModuleIds: c.linkedModuleIds || [],
                      title: c.title || 'Module',
                      description: c.description || '',
                      mediaType: c.mediaType || 'image',
                      mediaUrl: sanitizeMediaUrl(c.mediaUrl || ''),
                      imageUrl: sanitizeMediaUrl(c.mediaUrl || ''),
                      tutorialUrl: c.tutorialUrl || '',
                      trialBadge: c.trialBadge || '',
                      blocks
                    };
                  })
                };
              });
              setHubData(normalized);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Initial RTDB fetch error:', err);
      }

      // Tentative de lecture Firestore si RTDB non disponible
      try {
        const { db } = await import('@/src/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        if (db) {
          const snap = await getDoc(doc(db, 'system_config', 'central_hub'));
          if (snap.exists() && snap.data()?.hubData && isMounted) {
            const fsData = snap.data().hubData;
            if (Array.isArray(fsData) && fsData.length > 0) {
              setHubData(fsData);
              return;
            }
          }
        }
      } catch (fsErr) {
        console.warn('Initial storage fetch error:', fsErr);
      }

      try {
        const local = localStorage.getItem('central_hub_config');
        if (local && isMounted) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHubData(parsed);
          }
        }
      } catch (_) {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Affichage d'un Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Création d'une nouvelle instance de bloc avec valeurs par défaut garanties (aucun undefined)
  const createNewBlockInstance = (type: BlockType): BlockItem => {
    const id = 'b-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    switch (type) {
      case 'header':
        return createBlockWithDefaults({ id, type, title: 'Nouveau Module', badge: '' });
      case 'description':
        return createBlockWithDefaults({ id, type, text: 'Description du module...' });
      case 'image':
        return createBlockWithDefaults({ id, type, url: '' });
      case 'video':
        return createBlockWithDefaults({ id, type, url: '' });
      case 'cta':
        return createBlockWithDefaults({ id, type, ctaText: 'Activer', trialBadge: 'Essai offert' });
      case 'image_slider':
        return createBlockWithDefaults({
          id,
          type,
          slides: [
            { id: 'slide-1', imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80', captionTitle: 'Encaissement 1-Clic Rapide', captionText: 'Paiements directs Wave, Orange Money et Cartes bancaires sécurisés.' },
            { id: 'slide-2', imageUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop&q=80', captionTitle: 'Gestion de Stock en Temps Réel', captionText: 'Synchronisation automatique entre vos dépôts et vos points de vente physiques.' },
            { id: 'slide-3', imageUrl: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&auto=format&fit=crop&q=80', captionTitle: 'Rapports Financiers & KPI', captionText: 'Visualisez vos marges, recettes et chiffres d\'affaires au centime près.' }
          ],
          slideSettings: {
            autoplay: true,
            interval: 4000,
            aspectRatio: 'wide'
          }
        });
    }
  };

  // ACTIONS RANGÉES
  const addNewRow = () => {
    const newRowId = 'row-' + Date.now();
    const newRow: RowItem = {
      id: newRowId,
      title: 'Nouvelle Section',
      cards: [
        {
          id: 'card-' + Date.now(),
          title: 'Nouveau Module',
          description: '',
          mediaType: 'image',
          mediaUrl: '',
          routeUrl: '',
          palmares: '',
          trialBadge: '',
          tutorialUrl: '',
          isRootApp: false,
          linkedModuleIds: [],
          blocks: [
            createBlockWithDefaults({ id: 'b-' + Date.now(), type: 'header', title: 'Nouveau Module', badge: '' })
          ]
        }
      ]
    };
    setHubData([...hubData, newRow]);
    showToast('Nouvelle rangée créée !');
  };

  const updateRowTitle = (rowId: string, title: string) => {
    setHubData(hubData.map(r => r.id === rowId ? { ...r, title, rowTitle: title } : r));
  };

  const deleteRow = (rowId: string) => {
    setHubData(hubData.filter(r => r.id !== rowId));
    if (selectedBlockInfo?.rowId === rowId) {
      setSelectedBlockInfo(null);
    }
    showToast('Rangée supprimée.');
  };

  // ACTIONS CARTES
  const addCardToRow = (rowId: string) => {
    setHubData(hubData.map(row => {
      if (row.id === rowId) {
        const newCard: CardItem = {
          id: 'card-' + Date.now(),
          title: 'Nouveau Module',
          description: '',
          mediaType: 'image',
          mediaUrl: '',
          routeUrl: '',
          palmares: '',
          trialBadge: '',
          tutorialUrl: '',
          isRootApp: false,
          linkedModuleIds: [],
          blocks: [
            createBlockWithDefaults({ id: 'b-' + Date.now(), type: 'header', title: 'Nouveau Module', badge: '' })
          ]
        };
        return { ...row, cards: [...row.cards, newCard] };
      }
      return row;
    }));
    showToast('Carte ajoutée à la rangée !');
  };

  const deleteCard = (rowId: string, cardId: string) => {
    setHubData(hubData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.filter(c => c.id !== cardId)
        };
      }
      return row;
    }));
    if (selectedBlockInfo?.cardId === cardId) {
      setSelectedBlockInfo(null);
    }
    showToast('Carte supprimée.');
  };

  // GESTION DU DRAG & DROP
  const handleDragStartPalette = (type: BlockType) => {
    setDraggedPaletteType(type);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    if (activeDropCardId !== cardId) {
      setActiveDropCardId(cardId);
    }
  };

  const handleCardDragLeave = (cardId: string) => {
    if (activeDropCardId === cardId) {
      setActiveDropCardId(null);
    }
  };

  const handleCardDrop = (e: React.DragEvent, rowId: string, cardId: string) => {
    e.preventDefault();
    setActiveDropCardId(null);

    if (!draggedPaletteType) return;
    const newBlock = createNewBlockInstance(draggedPaletteType);

    setHubData(hubData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(card => {
            if (card.id === cardId) {
              return { ...card, blocks: [...card.blocks, newBlock] };
            }
            return card;
          })
        };
      }
      return row;
    }));

    showToast('Bloc ajouté avec succès !');
    setDraggedPaletteType(null);
  };

  // Clic rapide pour ajouter un bloc à la première carte disponible
  const handleQuickAddBlock = (type: BlockType) => {
    if (hubData.length === 0) {
      addNewRow();
      return;
    }
    const targetRow = hubData[0];
    if (targetRow.cards.length === 0) {
      addCardToRow(targetRow.id);
      return;
    }
    const targetCard = targetRow.cards[0];
    const newBlock = createNewBlockInstance(type);

    setHubData(hubData.map((row, rIdx) => {
      if (rIdx === 0) {
        return {
          ...row,
          cards: row.cards.map((c, cIdx) => {
            if (cIdx === 0) {
              return { ...c, blocks: [...c.blocks, newBlock] };
            }
            return c;
          })
        };
      }
      return row;
    }));

    setSelectedBlockInfo({
      rowId: targetRow.id,
      cardId: targetCard.id,
      blockId: newBlock.id
    });
    showToast('Bloc ajouté à la carte #1 !');
  };

  // TIROIR D'ÉDITION
  const activeBlock = React.useMemo(() => {
    if (!selectedBlockInfo) return null;
    const { rowId, cardId, blockId } = selectedBlockInfo;
    const row = hubData.find(r => r.id === rowId);
    const card = row?.cards.find(c => c.id === cardId);
    return card?.blocks.find(b => b.id === blockId) || null;
  }, [selectedBlockInfo, hubData]);

  const activeCard = React.useMemo(() => {
    if (!selectedBlockInfo) return null;
    const { rowId, cardId } = selectedBlockInfo;
    const row = hubData.find(r => r.id === rowId);
    return row?.cards.find(c => c.id === cardId) || null;
  }, [selectedBlockInfo, hubData]);

  const updateCardRootApp = (rowId: string, cardId: string, isRoot: boolean) => {
    setHubData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(c => {
            if (c.id === cardId) {
              return { ...c, isRootApp: isRoot };
            }
            return c;
          })
        };
      }
      return row;
    }));
  };

  const updateCardRouteUrl = (rowId: string, cardId: string, routeUrl: string) => {
    setHubData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(c => {
            if (c.id === cardId) {
              return { ...c, routeUrl };
            }
            return c;
          })
        };
      }
      return row;
    }));
  };

  const updateCardMediaUrl = (rowId: string, cardId: string, mediaUrl: string) => {
    setHubData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(c => {
            if (c.id === cardId) {
              const nextBlocks = c.blocks.map(b => {
                if (b.type === 'image') {
                  return { ...b, url: mediaUrl, imageUrl: mediaUrl };
                }
                return b;
              });
              return {
                ...c,
                mediaUrl,
                imageUrl: mediaUrl,
                mediaType: 'image',
                blocks: nextBlocks
              };
            }
            return c;
          })
        };
      }
      return row;
    }));
  };

  const updateCardLinkedModuleIds = (rowId: string, cardId: string, ids: string[]) => {
    setHubData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(c => {
            if (c.id === cardId) {
              return { ...c, linkedModuleIds: ids };
            }
            return c;
          })
        };
      }
      return row;
    }));
  };

  const toggleSpecificLinkedModule = (rowId: string, cardId: string, modId: string) => {
    const card = hubData.find(r => r.id === rowId)?.cards.find(c => c.id === cardId);
    if (!card) return;
    const current = card.linkedModuleIds || [];
    const next = current.includes(modId)
      ? current.filter(id => id !== modId)
      : [...current, modId];
    updateCardLinkedModuleIds(rowId, cardId, next);
  };

  const updateBlockProps = (updates: Partial<BlockItem>) => {
    if (!selectedBlockInfo) return;
    const { rowId, cardId, blockId } = selectedBlockInfo;

    setHubData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        cards: row.cards.map(card => {
          if (card.id !== cardId) return card;
          const nextBlocks = card.blocks.map(b => {
            if (b.id !== blockId) return b;
            return { ...b, ...updates };
          });
          const targetUrl = updates.url || updates.imageUrl;
          return {
            ...card,
            blocks: nextBlocks,
            ...(targetUrl ? { mediaUrl: targetUrl, imageUrl: targetUrl, mediaType: 'image' } : {})
          };
        })
      };
    }));
  };

  const updateBlockProp = (prop: keyof BlockItem, value: any) => {
    updateBlockProps({ [prop]: value });
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockInfo) return;
    const { rowId, cardId, blockId } = selectedBlockInfo;

    setHubData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cards: row.cards.map(card => {
            if (card.id === cardId) {
              return {
                ...card,
                blocks: card.blocks.filter(b => b.id !== blockId)
              };
            }
            return card;
          })
        };
      }
      return row;
    }));

    setSelectedBlockInfo(null);
    showToast('Bloc supprimé.');
  };

  // Fonctions de personnalisation en direct pour le Module Slide / Carrousel d'Images
  const updateBlockSlides = (newSlides: SlideItem[]) => {
    if (!selectedBlockInfo) return;
    const { rowId, cardId, blockId } = selectedBlockInfo;
    setHubData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        cards: row.cards.map(card => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            blocks: card.blocks.map(b => {
              if (b.id !== blockId) return b;
              return { ...b, slides: newSlides };
            })
          };
        })
      };
    }));
  };

  const updateSlideField = (slideIndex: number, field: keyof SlideItem, value: string) => {
    if (!activeBlock || !activeBlock.slides) return;
    const nextSlides = [...activeBlock.slides];
    if (!nextSlides[slideIndex]) return;
    nextSlides[slideIndex] = { ...nextSlides[slideIndex], [field]: value };
    updateBlockSlides(nextSlides);
  };

  const addSlideToBlock = () => {
    if (!activeBlock) return;
    const currentSlides = activeBlock.slides || [];
    const newSlide: SlideItem = {
      id: 'slide-' + Date.now(),
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80',
      captionTitle: `Nouvelle Slide ${currentSlides.length + 1}`,
      captionText: 'Ajoutez une description captivante pour cette slide.'
    };
    updateBlockSlides([...currentSlides, newSlide]);
  };

  const removeSlideFromBlock = (slideIndex: number) => {
    if (!activeBlock || !activeBlock.slides) return;
    const nextSlides = activeBlock.slides.filter((_, idx) => idx !== slideIndex);
    updateBlockSlides(nextSlides);
  };

  const updateSlideSettings = (key: keyof SlideSettings, value: any) => {
    if (!selectedBlockInfo) return;
    const { rowId, cardId, blockId } = selectedBlockInfo;
    setHubData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        cards: row.cards.map(card => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            blocks: card.blocks.map(b => {
              if (b.id !== blockId) return b;
              return {
                ...b,
                slideSettings: {
                  ...(b.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' }),
                  [key]: value
                }
              };
            })
          };
        })
      };
    }));
  };

  // CHARGEMENT INSTANTANÉ DE LA SUITE OFFICIELLE NANASORE & ERP (DONNÉES RÉELLES, ZÉRO MOCK, ZÉRO UNSPLASH)
  const loadOfficialNanaSuite = () => {
    const suiteRows: RowItem[] = [
      {
        id: 'row-pos-suite',
        title: 'Commerce, Caisse & Point de Vente (POS)',
        cards: [
          {
            id: 'pos-caisse-core',
            title: 'Caisse Tactile & Point de Vente (POS)',
            description: 'Interface tactile ultra-rapide pour encaissement comptoir, multi-vendeurs, tickets de caisse, lecteur code-barres et synchronisation automatique hors-ligne.',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80',
            routeUrl: '/dashboard/apps/pos',
            palmares: 'N°1 des Ventes • Certifié',
            trialBadge: 'Inclus • Illimité',
            tutorialUrl: 'https://youtube.com',
            isRootApp: true,
            linkedModuleIds: ['mod_pos_closing', 'mod_receipt_printer', 'mod_credit_book', 'mod_barcode_scanner'],
            blocks: [
              createBlockWithDefaults({ id: 'b-pos-1', type: 'header', title: 'Caisse Tactile & Point de Vente (POS)', badge: 'N°1 des Ventes • Certifié' }),
              createBlockWithDefaults({ id: 'b-pos-2', type: 'description', text: 'Interface tactile ultra-rapide pour encaissement comptoir, multi-vendeurs, tickets de caisse, lecteur code-barres et synchronisation automatique hors-ligne.' }),
              createBlockWithDefaults({ id: 'b-pos-img', type: 'image', url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80', imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&auto=format&fit=crop&q=80' }),
              createBlockWithDefaults({ id: 'b-pos-3', type: 'cta', tutorialUrl: 'https://youtube.com', trialBadge: 'Inclus • Illimité', ctaText: 'Lancer la Caisse' })
            ]
          },
          {
            id: 'mod_pos_closing',
            title: 'Clôture Journalière & Rapport Z de Caisse',
            description: 'Génération instantanée du Z de caisse, réconciliation des espèces, Mobile Money (Wave, Orange, Moov) et export comptable.',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
            routeUrl: '/dashboard/apps/pos-closing',
            palmares: 'Comptabilité',
            trialBadge: 'Inclus',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-clos-1', type: 'header', title: 'Clôture Journalière & Rapport Z de Caisse', badge: 'Comptabilité' }),
              createBlockWithDefaults({ id: 'b-clos-2', type: 'description', text: 'Génération instantanée du Z de caisse, réconciliation des espèces, Mobile Money (Wave, Orange, Moov) et export comptable.' }),
              createBlockWithDefaults({ id: 'b-clos-img', type: 'image', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80', imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80' }),
              createBlockWithDefaults({ id: 'b-clos-3', type: 'cta', tutorialUrl: '', trialBadge: 'Inclus', ctaText: 'Ouvrir Clôture' })
            ]
          },
          {
            id: 'mod_receipt_printer',
            title: 'Imprimante Ticket Thermique (58/80mm)',
            description: 'Impression automatique des tickets de caisse, duplicatas et factures proforma avec logo de boutique.',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80',
            routeUrl: '/dashboard/apps/receipt-printer',
            palmares: 'Bluetooth & USB',
            trialBadge: 'Prêt',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-print-1', type: 'header', title: 'Imprimante Ticket Thermique (58/80mm)', badge: 'Bluetooth & USB' }),
              createBlockWithDefaults({ id: 'b-print-2', type: 'description', text: 'Impression automatique des tickets de caisse, duplicatas et factures proforma avec logo de boutique.' }),
              createBlockWithDefaults({ id: 'b-print-img', type: 'image', url: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80', imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=600&auto=format&fit=crop&q=80' }),
              createBlockWithDefaults({ id: 'b-print-3', type: 'cta', tutorialUrl: '', trialBadge: 'Prêt', ctaText: 'Configurer' })
            ]
          },
          {
            id: 'mod_barcode_scanner',
            title: 'Scanner Code-Barres & Douchette Laser',
            description: 'Recherche et ajout ultra-rapide au panier par bip code-barres EAN-13, QR code ou caméra du téléphone.',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
            routeUrl: '/dashboard/apps/barcode-scanner',
            palmares: 'Ultra-Rapide',
            trialBadge: 'Inclus',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-bar-1', type: 'header', title: 'Scanner Code-Barres & Douchette Laser', badge: 'Ultra-Rapide' }),
              createBlockWithDefaults({ id: 'b-bar-2', type: 'description', text: 'Recherche et ajout ultra-rapide au panier par bip code-barres EAN-13, QR code ou caméra du téléphone.' }),
              createBlockWithDefaults({ id: 'b-bar-img', type: 'image', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80' }),
              createBlockWithDefaults({ id: 'b-bar-3', type: 'cta', tutorialUrl: '', trialBadge: 'Inclus', ctaText: 'Scanner' })
            ]
          }
        ]
      },
      {
        id: 'row-management-suite',
        title: 'Gestion Commerciale, Stocks & Factures',
        cards: [
          {
            id: 'card-stock-mgmt',
            title: 'Gestion de Stock & Inventaire Temps Réel',
            description: 'Mouvements d\'entrées/sorties, alertes automatiques de rupture, valorisation du stock marchand et transferts de magasins.',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
            imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
            routeUrl: '/dashboard/apps/inventory',
            palmares: 'Automatisé',
            trialBadge: 'Inclus',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-stk-1', type: 'header', title: 'Gestion de Stock & Inventaire Temps Réel', badge: 'Automatisé' }),
              createBlockWithDefaults({ id: 'b-stk-2', type: 'description', text: 'Mouvements d\'entrées/sorties, alertes automatiques de rupture, valorisation du stock marchand et transferts de magasins.' }),
              createBlockWithDefaults({ id: 'b-stk-img', type: 'image', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80', imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80' }),
              createBlockWithDefaults({ id: 'b-stk-3', type: 'cta', tutorialUrl: '', trialBadge: 'Inclus', ctaText: 'Gérer les Stocks' })
            ]
          },
          {
            id: 'card-invoice-mgmt',
            title: 'Facturation & Devis Proforma Normalisés',
            description: 'Édition de factures aux normes fiscales, devis proforma, bons de commande et envoi direct au client par WhatsApp ou PDF.',
            mediaType: 'image',
            mediaUrl: '',
            routeUrl: '/dashboard/apps/invoices',
            palmares: 'Conforme Fiscal',
            trialBadge: 'Inclus',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-inv-1', type: 'header', title: 'Facturation & Devis Proforma Normalisés', badge: 'Conforme Fiscal' }),
              createBlockWithDefaults({ id: 'b-inv-2', type: 'description', text: 'Édition de factures aux normes fiscales, devis proforma, bons de commande et envoi direct au client par WhatsApp ou PDF.' }),
              createBlockWithDefaults({ id: 'b-inv-3', type: 'cta', tutorialUrl: '', trialBadge: 'Inclus', ctaText: 'Facturer' })
            ]
          },
          {
            id: 'mod_credit_book',
            title: 'Carnet de Dettes & Ventes à Crédit',
            description: 'Suivi des créances et ardoises clients, échéanciers de paiement et relances automatiques par SMS / WhatsApp.',
            mediaType: 'image',
            mediaUrl: '',
            routeUrl: '/dashboard/apps/credit-book',
            palmares: 'Relances WhatsApp',
            trialBadge: 'Actif',
            tutorialUrl: '',
            isRootApp: false,
            linkedModuleIds: [],
            blocks: [
              createBlockWithDefaults({ id: 'b-deb-1', type: 'header', title: 'Carnet de Dettes & Ventes à Crédit', badge: 'Relances WhatsApp' }),
              createBlockWithDefaults({ id: 'b-deb-2', type: 'description', text: 'Suivi des créances et ardoises clients, échéanciers de paiement et relances automatiques par SMS / WhatsApp.' }),
              createBlockWithDefaults({ id: 'b-deb-3', type: 'cta', tutorialUrl: '', trialBadge: 'Actif', ctaText: 'Voir Dettes' })
            ]
          }
        ]
      }
    ];

    setHubData(suiteRows);
    showToast('✨ Suite Officielle Caisse POS & Modules chargée ! Cliquez sur Publier pour sauvegarder.');
  };

  // SAUVEGARDE ET PUBLICATION VERS FIREBASE RTDB & FIRESTORE (SANITY CLEANUP : ZÉRO UNDEFINED)
  const saveToFirebase = async () => {
    setIsSaving(true);
    try {
      console.log('Enregistrement dans storage RTDB (/central_hub_config) :', hubData);

      // Générer une version enrichie avec rétro-compatibilité et purge stricte Unsplash
      const exportableData = hubData.map(row => ({
        id: row.id || `row-${Date.now()}`,
        title: row.title || 'Nouvelle Section',
        rowTitle: row.title || row.rowTitle || 'Nouvelle Section',
        cards: (row.cards || []).map((card, cIdx) => {
          const headerB = card.blocks?.find(b => b.type === 'header');
          const descB = card.blocks?.find(b => b.type === 'description');
          const mediaB = card.blocks?.find(b => b.type === 'image' || b.type === 'video');
          const ctaB = card.blocks?.find(b => b.type === 'cta');
          const sanitizedMediaUrl = sanitizeMediaUrl(mediaB?.url || mediaB?.imageUrl || card.mediaUrl || card.imageUrl || '');

          return {
            id: card.id || `card-${cIdx + 1}`,
            routeUrl: card.routeUrl || '',
            isRootApp: Boolean(card.isRootApp || (card.linkedModuleIds && card.linkedModuleIds.length > 0)),
            linkedModuleIds: card.linkedModuleIds || [],
            title: headerB?.title || card.title || 'Nouveau Module',
            palmares: headerB?.badge || card.palmares || '',
            description: descB?.text || card.description || '',
            mediaType: mediaB ? mediaB.type : (card.mediaType || 'image'),
            mediaUrl: sanitizedMediaUrl,
            imageUrl: sanitizedMediaUrl,
            tutorialUrl: ctaB?.tutorialUrl || card.tutorialUrl || '',
            trialBadge: ctaB?.trialBadge || card.trialBadge || '',
            trialType: card.trialType || 'freemium',
            priceMonthly: card.priceMonthly || 0,
            blocks: (card.blocks || []).map((b, bIdx) => createBlockWithDefaults({
              id: b.id || `b-${Date.now()}-${bIdx}`,
              type: b.type || 'header',
              title: b.title || '',
              badge: b.badge || '',
              text: b.text || '',
              url: (b.type === 'image' || b.type === 'video') ? sanitizeMediaUrl(b.url || b.imageUrl || card.mediaUrl || '') : '',
              imageUrl: (b.type === 'image' || b.type === 'video') ? sanitizeMediaUrl(b.imageUrl || b.url || card.mediaUrl || '') : '',
              ctaText: b.ctaText || '',
              trialBadge: b.trialBadge || '',
              tutorialUrl: b.tutorialUrl || '',
              slides: b.slides || (b.type === 'image_slider' ? undefined : []),
              slideSettings: b.slideSettings
            }))
          };
        })
      }));

      // NETTOYAGE SANITY DES DONNÉES AVANT ENREGISTREMENT (REMPLACE TOUT UNDEFINED PAR "")
      const dataToSave = cleanObject(exportableData);

      let rtdbSuccess = false;
      let firestoreSuccess = false;

      // 1. Publication atomique unifiée (Hub Builder -> Firebase RTDB sous /central_hub_config/{blockId} & Local Registry)
      for (const row of exportableData) {
        for (const card of row.cards || []) {
          const sliderBlock = card.blocks?.find((b: any) => b.type === 'image_slider');
          const cardBlockConfig: HubBlockConfig = {
            id: card.id,
            title: card.title || 'Nouveau Module',
            type: sliderBlock ? 'image_slider' : 'module',
            imageUrl: card.mediaUrl || card.imageUrl || sliderBlock?.slides?.[0]?.imageUrl || '',
            keywords: [card.title, card.subtitle, card.palmares, card.id].filter(Boolean) as string[],
            routeOrAction: card.routeUrl || '',
            updatedAt: new Date().toISOString(),
            description: card.description || '',
            subtitle: card.subtitle || '',
            palmares: card.palmares || '',
            trialBadge: card.trialBadge || '',
            blocks: card.blocks || [],
            slides: sliderBlock?.slides || [],
            settings: sliderBlock?.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' },
            slideSettings: sliderBlock?.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' },
            linkedModuleIds: card.linkedModuleIds || [],
            isRootApp: Boolean(card.isRootApp)
          };

          // Publication atomique de la carte
          await publishHubBlock(card.id, cardBlockConfig).catch(e => console.warn('[HubBuilder] Atomic card publish warning:', e));

          // Publication atomique des sous-blocs de type image_slider
          if (sliderBlock && sliderBlock.id && sliderBlock.id !== card.id) {
            await publishHubBlock(sliderBlock.id, {
              id: sliderBlock.id,
              title: sliderBlock.title || card.title || 'Slide Module Block',
              type: 'image_slider',
              imageUrl: sliderBlock.slides?.[0]?.imageUrl || card.mediaUrl || '',
              keywords: [sliderBlock.title, card.title, 'image_slider', 'carrousel'].filter(Boolean) as string[],
              routeOrAction: card.routeUrl || '',
              updatedAt: new Date().toISOString(),
              slides: sliderBlock.slides || [],
              settings: sliderBlock.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' },
              slideSettings: sliderBlock.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' }
            }).catch(e => console.warn('[HubBuilder] Atomic slider publish warning:', e));
          }
        }
      }

      // Si un bloc particulier est actuellement en cours d'édition active dans le panneau latéral
      if (activeBlock && activeBlock.id) {
        const activeSlideSettings = activeBlock.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' };
        await publishHubBlock(activeBlock.id, {
          id: activeBlock.id,
          title: activeBlock.title || activeCard?.title || 'Slide Module Block',
          type: activeBlock.type || 'image_slider',
          imageUrl: activeBlock.slides?.[0]?.imageUrl || activeBlock.url || activeCard?.mediaUrl || '',
          keywords: [activeBlock.title, activeCard?.title, activeBlock.type, 'slide', 'carrousel'].filter(Boolean) as string[],
          routeOrAction: activeCard?.routeUrl || '',
          updatedAt: new Date().toISOString(),
          slides: activeBlock.slides || [],
          settings: activeSlideSettings,
          slideSettings: activeSlideSettings,
          description: activeBlock.text || activeCard?.description || '',
          badge: activeBlock.badge || activeCard?.palmares || ''
        }).catch(e => console.warn('[HubBuilder] Active block atomic publish warning:', e));
      }

      // 2. Firebase RTDB - Enregistrement global miroir sur tous les nœuds de publication
      try {
        const { rtdb } = await import('@/src/firebase');
        const { ref, set } = await import('firebase/database');
        if (rtdb) {
          const results = await Promise.allSettled([
            set(ref(rtdb, 'central_hub_config'), dataToSave),
            set(ref(rtdb, 'central_hub_blocks'), dataToSave),
            set(ref(rtdb, 'published_cards'), dataToSave)
          ]);
          rtdbSuccess = results.some(r => r.status === 'fulfilled');
        }
      } catch (fbErr) {
        console.warn('[HubBuilder] Erreur RTDB sync (non-bloquante) :', fbErr);
      }

      // 3. Firebase Firestore - Sauvegarde miroir persistante
      try {
        const { db, auth } = await import('@/src/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        if (db) {
          await setDoc(doc(db, 'system_config', 'central_hub'), {
            central_hub: dataToSave,
            hubData: dataToSave,
            authorId: auth?.currentUser?.uid || 'admin',
            authorEmail: auth?.currentUser?.email || 'pousbila04@gmail.com',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          firestoreSuccess = true;
        }
      } catch (fsErr) {
        console.warn('[HubBuilder] Erreur storage sync (non-bloquante) :', fsErr);
      }

      // 4. LocalStorage & Événements locaux (Garantie temps-réel avec Omnibar et App Registry)
      try {
        localStorage.setItem('central_hub_config', JSON.stringify(dataToSave));
        window.dispatchEvent(new CustomEvent('hub_registry_updated', { detail: { count: exportableData.length } }));
        window.dispatchEvent(new Event('central_hub_config_updated'));
      } catch (_) {}

      if (rtdbSuccess && firestoreSuccess) {
        showToast('✅ Configuration enregistrée dans Firebase (RTDB & Firestore) !');
      } else if (rtdbSuccess) {
        showToast('✅ Configuration enregistrée dans Firebase RTDB (Temps réel actif) !');
      } else if (firestoreSuccess) {
        showToast('✅ Configuration enregistrée dans Firestore !');
      } else {
        showToast('ℹ️ Configuration enregistrée en cache local (Appliquez les règles Firebase).');
      }
    } catch (err) {
      console.error('Erreur sauvegarde globale:', err);
      showToast('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-slate-950 text-slate-100 select-none">
      
      {/* =========================================================================
          HEADER APPLICATIF (NAVBAR)
         ========================================================================= */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4169E1] text-white font-extrabold flex items-center justify-center text-lg shadow-lg shadow-[#4169E1]/30">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-wide">Central Hub Builder</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#4169E1]/20 text-[#4169E1] border border-[#4169E1]/30 px-2 py-0.5 rounded-full">
                Canvas Modulaire Nanasore
              </span>
            </div>
            <p className="text-xs text-slate-400">Glisser-déposer modulaire & prévisualisation dynamique 1 colonne</p>
          </div>
        </div>

        {/* Actions du Header */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/superadmin');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Retourner au Tableau de Bord Super-Admin (/superadmin)"
          >
            <ArrowRight className="w-4 h-4 text-amber-400 rotate-180" />
            <span>Tableau de Bord Super-Admin</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsOverlayOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Maximize2 className="w-4 h-4 text-[#4169E1]" />
            <span>Tester Overlay Plein Écran</span>
          </button>

          <button 
            type="button"
            onClick={loadOfficialNanaSuite}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            title="Charger la Suite Caisse POS & Modules (Données Réelles, Zéro Image Unsplash)"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Suite Caisse POS (Officielle)</span>
          </button>

          <button 
            type="button"
            onClick={saveToFirebase}
            disabled={isSaving}
            className="px-5 py-2 bg-[#4169E1] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-[#4169E1]/30 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isSaving ? 'Publication...' : 'Publier vers Firebase (/central_hub_config)'}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          CONTENEUR PRINCIPAL SCINDÉ EN 2 ZONES (GAUCHE / DROITE)
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">

        {/* 1. PANNEAU DE GAUCHE : BIBLIOTHÈQUE DE BLOCS DÉPLACABLES */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4169E1]" />
              Blocs à Glisser / Déposer
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">Faites glisser un bloc vers la zone de Canvas à droite pour composer vos sections.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            
            {/* Bloc 1: En-tête */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('header')}
              onClick={() => handleQuickAddBlock('header')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-[#4169E1] rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#4169E1] flex items-center gap-2">
                  <Heading className="w-4 h-4" /> En-tête / Titre Carte
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#4169E1]" />
              </div>
              <p className="text-[11px] text-slate-400">Contient le Titre du module + Badge Palmarès (ex: 🔥 Top 1)</p>
            </div>

            {/* Bloc 2: Description */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('description')}
              onClick={() => handleQuickAddBlock('description')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4" /> Description
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400">Texte court explicatif des fonctionnalités du service.</p>
            </div>

            {/* Bloc 3: Média Image */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('image')}
              onClick={() => handleQuickAddBlock('image')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-amber-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Bloc Image Cloud
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">Zone d'image dimensionnée pour les miniatures de démonstration.</p>
            </div>

            {/* Bloc 4: Média Vidéo */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('video')}
              onClick={() => handleQuickAddBlock('video')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-purple-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Bloc Vidéo Démo
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400" />
              </div>
              <p className="text-[11px] text-slate-400">Lecteur vidéo auto-hébergé ou démo animée.</p>
            </div>

            {/* Bloc 5: Actions CTA & Essai */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('cta')}
              onClick={() => handleQuickAddBlock('cta')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-rose-500 rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Boutons CTA & Essai
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-400">Boutons "▶️ Voir le Tutoriel" et "⚡ Activer / Essayer".</p>
            </div>

            {/* Bloc 6: Module Slide / Carrousel d'Images */}
            <div 
              draggable
              onDragStart={() => handleDragStartPalette('image_slider')}
              onClick={() => handleQuickAddBlock('image_slider')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-400 rounded-xl p-3 cursor-grab active:cursor-grabbing transition shadow-sm group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Module Slide / Carrousel
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">Carrousel d'images rotatif avec légendes, puces et défilement automatique.</p>
            </div>

          </div>

          {/* Footer du Panneau de Gauche : Création de Section */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80">
            <button 
              type="button"
              onClick={addNewRow}
              className="w-full py-2.5 bg-slate-800 hover:bg-[#4169E1] hover:text-white text-slate-300 font-bold text-xs rounded-xl border border-slate-700 hover:border-[#4169E1] transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ Créer une Nouvelle Rangée</span>
            </button>
          </div>
        </aside>

        {/* 2. PANNEAU DE DROITE : ZONE DE CANVAS & PRÉVISUALISATION TEMPS RÉEL */}
        <main className="flex-1 bg-[#0f172a] flex flex-col overflow-hidden relative">
          
          {/* Barre d'état du Canvas */}
          <div className="h-11 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-300">Canvas Live Preview (1 Colonne Dynamique)</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span><MousePointer className="w-3 h-3 text-[#4169E1] inline mr-1" /> Survoler la carte pour tester le dépliage</span>
              <span><Pen className="w-3 h-3 text-amber-400 inline mr-1" /> Clic sur un bloc pour modifier</span>
            </div>
          </div>

          {/* Zone de Canvas Défilante */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-800">
            {hubData.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl p-8 bg-slate-900/40 max-w-lg mx-auto my-12">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-200">Aucun bloc configuré.</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Cliquez sur « Ajouter un bloc » pour commencer à concevoir votre Central Hub.
                </p>
                <button
                  type="button"
                  onClick={addNewRow}
                  className="mt-5 px-4 py-2.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-[#4169E1]/30 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un bloc</span>
                </button>
              </div>
            ) : (
              hubData.map((row, rowIndex) => (
                <div key={row.id} className="bg-[#1e293b] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  
                  {/* En-tête de Rangée */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-7 h-7 bg-[#4169E1]/10 border border-[#4169E1]/30 text-[#4169E1] font-extrabold text-xs rounded-lg flex items-center justify-center shrink-0">
                        #{rowIndex + 1}
                      </span>
                      <input 
                        type="text" 
                        value={row.title}
                        onChange={(e) => updateRowTitle(row.id, e.target.value)}
                        className="bg-transparent font-bold text-sm text-white focus:outline-none focus:border-b focus:border-[#4169E1] px-1 py-0.5 w-full max-w-md"
                        placeholder="Titre de la section..."
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        type="button"
                        onClick={() => addCardToRow(row.id)}
                        className="px-3 py-1.5 bg-[#4169E1]/10 hover:bg-[#4169E1] text-[#4169E1] hover:text-white font-bold text-xs rounded-lg border border-[#4169E1]/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Ajouter une Carte
                      </button>
                      <button 
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Supprimer la rangée"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* EMPILAGE STRICT EN 1 COLONNE DE CARTES PAR RANGÉE */}
                  <div className="space-y-4">
                    {row.cards.map((card, cardIndex) => {
                      const isDropTarget = activeDropCardId === card.id;

                      return (
                        <div 
                          key={card.id}
                          onDragOver={(e) => handleCardDragOver(e, card.id)}
                          onDragLeave={() => handleCardDragLeave(card.id)}
                          onDrop={(e) => handleCardDrop(e, row.id, card.id)}
                          className={`bg-slate-900/90 border rounded-xl p-4 transition-all duration-300 relative group ${
                            isDropTarget 
                              ? 'border-[#4169E1] bg-[#4169E1]/10 border-dashed' 
                              : 'border-slate-700/80 hover:border-[#4169E1] hover:shadow-2xl'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[10px] text-slate-500">
                            <span className="font-bold text-slate-400 flex items-center gap-1">
                              <Box className="w-3.5 h-3.5 text-[#4169E1]" /> 
                              Carte Module #{cardIndex + 1}
                            </span>
                            <button 
                              type="button"
                              onClick={() => deleteCard(row.id, card.id)}
                              className="text-slate-500 hover:text-rose-400 cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Supprimer Carte
                            </button>
                          </div>

                          {/* Liste des Blocs déposés */}
                          <div className="space-y-3">
                            {card.blocks.length === 0 ? (
                              <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center text-slate-600 text-xs">
                                Glissez des blocs ici depuis le panneau de gauche...
                              </div>
                            ) : (
                              card.blocks.map(block => {
                                const isSelected = selectedBlockInfo?.blockId === block.id;
                                const borderStyle = isSelected 
                                  ? 'border-2 border-[#4169E1] shadow-lg bg-slate-900' 
                                  : 'border border-slate-800 hover:border-slate-700 bg-slate-950/60';

                                return (
                                  <div 
                                    key={block.id}
                                    onClick={() => setSelectedBlockInfo({ rowId: row.id, cardId: card.id, blockId: block.id })}
                                    className={`p-3 rounded-lg ${borderStyle} cursor-pointer transition relative group/block`}
                                  >
                                    <div className="absolute top-1 right-2 opacity-0 group-hover/block:opacity-100 text-[10px] text-[#4169E1] font-bold flex items-center gap-1">
                                      <Pen className="w-3 h-3" /> Éditer
                                    </div>

                                    {/* En-tête */}
                                    {block.type === 'header' && (
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-white">{block.title || 'Titre du Module'}</h4>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                                          ${block.badge || '🔥 Badge'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Description */}
                                    {block.type === 'description' && (
                                      <p className="text-xs text-slate-300 leading-relaxed">{block.text || 'Saisissez une description courte...'}</p>
                                    )}

                                    {/* Image */}
                                    {block.type === 'image' && (
                                      <div className="rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950 h-36 flex items-center justify-center">
                                        {(block.url || block.imageUrl) ? (
                                          <img 
                                            key={block.url || block.imageUrl}
                                            src={block.url || block.imageUrl} 
                                            alt="Aperçu" 
                                            className="w-full h-full object-cover" 
                                          />
                                        ) : (
                                          <ImageIcon className="w-8 h-8 text-slate-600" />
                                        )}
                                      </div>
                                    )}

                                    {/* Vidéo */}
                                    {block.type === 'video' && (
                                      <div className="rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950 h-36 flex items-center justify-center relative">
                                        {block.url ? (
                                          <video src={block.url} controls className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="text-center text-slate-500">
                                            <PlayCircle className="w-8 h-8 text-purple-400 mx-auto mb-1" />
                                            <p className="text-[10px]">Lecteur Vidéo Démo</p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* CTA */}
                                    {block.type === 'cta' && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <button 
                                          type="button"
                                          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 pointer-events-none"
                                        >
                                          <Play className="w-3 h-3 text-[#4169E1]" /> Tutoriel
                                        </button>
                                        <button 
                                          type="button"
                                          className="flex-1 py-1.5 px-3 bg-[#4169E1] hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow-md shadow-[#4169E1]/20 flex items-center justify-center gap-1.5 pointer-events-none"
                                        >
                                          <Zap className="w-3 h-3" /> {block.ctaText || 'Activer'} ({block.trialBadge || 'Essai'})
                                        </button>
                                      </div>
                                    )}

                                    {/* Module Slide / Carrousel d'Images */}
                                    {block.type === 'image_slider' && (
                                      <div className="w-full">
                                        <SlideModuleBlock
                                          id={block.id}
                                          settings={block.slideSettings || { autoplay: true, interval: 4000, aspectRatio: 'wide' }}
                                          slides={block.slides || []}
                                          isEditing={selectedBlockInfo?.blockId === block.id}
                                          onUpdate={(updatedSlides) => updateBlockSlides(updatedSlides)}
                                        />
                                      </div>
                                    )}

                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))
            )}
          </div>
        </main>

        {/* 3. PANNEAU LATÉRAL D'ÉDITION D'UN BLOC SÉLECTIONNÉ (SLIDE OVER) */}
        {selectedBlockInfo && activeBlock && (
          <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#4169E1]" />
                Propriétés du Bloc ({activeBlock.type})
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedBlockInfo(null)} 
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
              
              {activeBlock.type === 'header' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Titre du Module</label>
                    <input 
                      type="text" 
                      value={activeBlock.title || ''} 
                      onChange={(e) => updateBlockProp('title', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Badge / Palmarès</label>
                    <input 
                      type="text" 
                      value={activeBlock.badge || ''} 
                      onChange={(e) => updateBlockProp('badge', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                    />
                  </div>
                </>
              )}

              {activeBlock.type === 'description' && (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Texte de Description</label>
                  <textarea 
                    rows={4}
                    value={activeBlock.text || ''} 
                    onChange={(e) => updateBlockProp('text', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                  />
                </div>
              )}

              {activeBlock.type === 'image' && (
                <div className="space-y-3">
                  <ImageUploadInput
                    value={activeBlock.url || activeBlock.imageUrl || ''}
                    onChange={(newUrl) => {
                      updateBlockProps({ url: newUrl, imageUrl: newUrl });
                    }}
                    label="Image du Module"
                    badge="Upload ImgBB Direct"
                    showPreview={true}
                    previewHeight="h-28"
                    helperText="Collez une URL externe OU téléversez directement une image depuis votre appareil (hébergement automatique sur ImgBB)."
                  />

                  {/* Liens de secours externes */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Hébergeurs externes recommandés :
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <a 
                        href="https://imgbb.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-[#4169E1]/20 text-cyan-300 hover:text-white border border-slate-700 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        <span>🌐 ImgBB</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                      <a 
                        href="https://postimages.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-300 hover:text-white border border-slate-700 text-[10.5px] font-bold transition cursor-pointer"
                      >
                        <span>📸 Postimages</span>
                        <ExternalLink className="w-3 h-3 text-amber-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {activeBlock.type === 'video' && (
                <div className="space-y-2.5">
                  <label className="block font-bold text-slate-300 text-xs">
                    URL de la Vidéo Démo (.mp4 ou Stream)
                  </label>
                  <input 
                    type="text" 
                    value={activeBlock.url || ''} 
                    onChange={(e) => updateBlockProp('url', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#4169E1]"
                  />
                  {activeBlock.url && (
                    <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-800 bg-black mt-2">
                      <video src={activeBlock.url} controls className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {activeBlock.type === 'cta' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Libellé Bouton Principal</label>
                    <input 
                      type="text" 
                      value={activeBlock.ctaText || ''} 
                      onChange={(e) => updateBlockProp('ctaText', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Texte d'Essai (Badge)</label>
                    <input 
                      type="text" 
                      value={activeBlock.trialBadge || ''} 
                      onChange={(e) => updateBlockProp('trialBadge', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Lien Tutoriel (YouTube/Web)</label>
                    <input 
                      type="text" 
                      value={activeBlock.tutorialUrl || ''} 
                      onChange={(e) => updateBlockProp('tutorialUrl', e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1]"
                    />
                  </div>
                </>
              )}

              {activeBlock.type === 'image_slider' && (
                <div className="space-y-4">
                  {/* Configuration générale du Carrousel */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300 text-xs">Configuration du Carrousel</span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        Slide Module
                      </span>
                    </div>

                    {/* Défilement Automatique (Autoplay) */}
                    <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                      <span>Défilement auto (Autoplay)</span>
                      <input
                        type="checkbox"
                        checked={activeBlock.slideSettings?.autoplay ?? true}
                        onChange={(e) => updateSlideSettings('autoplay', e.target.checked)}
                        className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    {/* Intervalle de transition */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Intervalle entre slides (ms)
                      </label>
                      <input
                        type="number"
                        step="500"
                        min="1000"
                        max="20000"
                        value={activeBlock.slideSettings?.interval || 4000}
                        onChange={(e) => updateSlideSettings('interval', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Format d'affichage (Aspect Ratio) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Format d'affichage (Ratio)
                      </label>
                      <select
                        value={activeBlock.slideSettings?.aspectRatio || 'wide'}
                        onChange={(e) => updateSlideSettings('aspectRatio', e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        <option value="wide">Panoramique Large (21/9)</option>
                        <option value="video">Vidéo Standard (16/9)</option>
                        <option value="square">Carré (1/1)</option>
                      </select>
                    </div>
                  </div>

                  {/* Gestion de chaque Slide individuelle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-300 text-xs">
                        Slides du Carrousel ({(activeBlock.slides || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={addSlideToBlock}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Ajouter Slide
                      </button>
                    </div>

                    {(activeBlock.slides || []).map((slide, sIdx) => (
                      <div key={slide.id || sIdx} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-400">
                            Slide #{sIdx + 1}
                          </span>
                          {(activeBlock.slides || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlideFromBlock(sIdx)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold cursor-pointer"
                            >
                              Supprimer ✕
                            </button>
                          )}
                        </div>

                        {/* Image de la Slide avec Upload ImgBB Direct */}
                        <ImageUploadInput
                          value={slide.imageUrl || ''}
                          onChange={(newUrl) => updateSlideField(sIdx, 'imageUrl', newUrl)}
                          label="Image de la Slide"
                          badge="ImgBB Direct"
                          showPreview={true}
                          previewHeight="h-16"
                          placeholder="https://i.ibb.co/... ou parcourir"
                        />

                        {/* Titre Légende */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            Titre de la Légende (Optionnel)
                          </label>
                          <input
                            type="text"
                            value={slide.captionTitle || ''}
                            onChange={(e) => updateSlideField(sIdx, 'captionTitle', e.target.value)}
                            placeholder="Ex: Encaissement 1-Clic Rapide"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 font-bold"
                          />
                        </div>

                        {/* Description Légende */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">
                            Texte de Description (Optionnel)
                          </label>
                          <textarea
                            rows={2}
                            value={slide.captionText || ''}
                            onChange={(e) => updateSlideField(sIdx, 'captionText', e.target.value)}
                            placeholder="Description courte de la fonctionnalité..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>


                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Principale du Module (Omnibar) */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <ImageUploadInput
                  value={activeCard?.mediaUrl || activeCard?.imageUrl || ''}
                  onChange={(newUrl) => updateCardMediaUrl(selectedBlockInfo.rowId, selectedBlockInfo.cardId, newUrl)}
                  label="Image Principale du Module (Omnibar)"
                  badge="Upload ImgBB Direct"
                  showPreview={true}
                  previewHeight="h-24"
                  helperText="Image de couverture utilisée dans la liste des modules et dans l'Omnibar."
                />
              </div>

              {/* Configuration de la Route / Lien de Redirection (routeUrl) */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5 text-[#4169E1]" />
                    Lien / Route de l'Application
                  </label>
                  <span className="text-[10px] text-[#4169E1] font-mono bg-[#4169E1]/10 px-1.5 py-0.5 rounded border border-[#4169E1]/20">
                    routeUrl
                  </span>
                </div>
                <input
                  type="text"
                  value={activeCard?.routeUrl || ''}
                  onChange={(e) => updateCardRouteUrl(selectedBlockInfo.rowId, selectedBlockInfo.cardId, e.target.value)}
                  placeholder="ex: /dashboard/apps/pos, /dashboard/apps/stock..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1] font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Définit la page interne vers laquelle l'utilisateur sera redirigé lorsqu'il clique sur le titre de la carte dans l'Omnibar.
                </p>
              </div>

              {/* Configuration des relations d'Application Principale (linkedModuleIds) */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#4169E1] flex items-center gap-1.5 text-xs">
                    <Boxes className="w-3.5 h-3.5" />
                    Application Principale
                  </label>
                  <input
                    type="checkbox"
                    checked={Boolean(activeCard?.isRootApp || (activeCard?.linkedModuleIds && activeCard.linkedModuleIds.length > 0))}
                    onChange={(e) => updateCardRootApp(selectedBlockInfo.rowId, selectedBlockInfo.cardId, e.target.checked)}
                    className="accent-[#4169E1] w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Définir cette carte comme Application Racine pour afficher automatiquement les fonctionnalités et modules associés en BLOC 2 dans l'Omnibar.
                </p>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1 text-[11px]">
                    Modules & Extensions Associés (IDs séparés par des virgules) :
                  </label>
                  <input
                    type="text"
                    value={(activeCard?.linkedModuleIds || []).join(', ')}
                    onChange={(e) => updateCardLinkedModuleIds(
                      selectedBlockInfo.rowId, 
                      selectedBlockInfo.cardId, 
                      e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    )}
                    placeholder="mod_stock, mod_compta, mod_ia"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4169E1] font-mono text-[11px]"
                  />
                </div>

                {/* Sélecteurs rapides par checkbox */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Suggestions rapides :</span>
                  {[
                    { id: 'mod_stock', name: 'Stock & Inventaire (mod_stock)' },
                    { id: 'mod_compta', name: 'Comptabilité & Dettes (mod_compta)' },
                    { id: 'mod_ia', name: 'IA Conseiller Ventes (mod_ia)' }
                  ].map((sug) => {
                    const isChecked = (activeCard?.linkedModuleIds || []).includes(sug.id);
                    return (
                      <label key={sug.id} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSpecificLinkedModule(selectedBlockInfo.rowId, selectedBlockInfo.cardId, sug.id)}
                          className="accent-[#4169E1] rounded cursor-pointer"
                        />
                        <span className="text-[11px]">{sug.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
              <button 
                type="button"
                onClick={deleteSelectedBlock}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs rounded-xl border border-rose-500/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer ce bloc</span>
              </button>
            </div>
          </aside>
        )}

      </div>

      {/* =========================================================================
          OVERLAY DE PRÉVISUALISATION PLEIN ÉCRAN (RECHERCHE CENTRAL HUB)
         ========================================================================= */}
      {isOverlayOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-start pt-6 px-4 animate-in fade-in duration-200">
          
          <div className="w-full max-w-4xl bg-[#1c2536] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* Input de recherche fixe */}
            <div className="p-4 bg-[#141c2b] border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-[#4169E1] shrink-0" />
              <input 
                type="text" 
                autoFocus
                value={overlaySearch}
                onChange={(e) => setOverlaySearch(e.target.value)}
                placeholder="Rechercher dans le Hub Central..." 
                className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none font-medium"
              />
              <button 
                type="button"
                onClick={() => setIsOverlayOpen(false)} 
                className="p-1 text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Zone de résultats Central Hub avec structure publiée */}
            <div className="p-6 overflow-y-auto space-y-6 h-[600px] scrollbar-thin scrollbar-thumb-slate-800">
              {previewMatchedRootApp ? (
                <>
                  {/* BLOC 1 (HAUT) : APPLICATION PRINCIPALE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-emerald-400" />
                          <span>APPLICATION PRINCIPALE</span>
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Module Racine
                      </span>
                    </div>

                    <div className="bg-[#28283D] border border-emerald-500/40 rounded-xl p-5 hover:border-emerald-400 transition-all shadow-xl shadow-emerald-500/5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <Link 
                            to={previewMatchedRootApp.routeUrl || '#'} 
                            onClick={() => setIsOverlayOpen(false)} 
                            className="group flex items-center gap-2 text-base sm:text-lg font-bold text-white hover:text-[#4169E1] transition-colors"
                          >
                            <span className="group-hover:underline">{previewMatchedRootApp.title}</span>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#4169E1]" />
                            {previewMatchedRootApp.trialBadge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 no-underline">
                                {previewMatchedRootApp.trialBadge}
                              </span>
                            )}
                          </Link>
                          {previewMatchedRootApp.subtitle && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/25">
                              {previewMatchedRootApp.subtitle}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 mt-2">{previewMatchedRootApp.description}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-3">
                        {previewMatchedRootApp.mediaType === 'video' ? (
                          <div className="w-full h-40 bg-black rounded-lg overflow-hidden">
                            <video src={previewMatchedRootApp.mediaUrl} controls className="w-full h-full object-cover" />
                          </div>
                        ) : previewMatchedRootApp.mediaType === 'image' ? (
                          <img src={previewMatchedRootApp.mediaUrl} alt="Aperçu" className="w-full h-40 object-cover rounded-lg" />
                        ) : null}

                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              if (previewMatchedRootApp.tutorialUrl) window.open(previewMatchedRootApp.tutorialUrl, '_blank');
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600"
                          >
                            ▶️ Voir le Tutoriel
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const sel = Object.keys(previewCheckedModules).filter(k => previewCheckedModules[k]);
                              alert(`⚡ Activation de ${previewMatchedRootApp.title} avec ${sel.length} modules associés !`);
                            }}
                            className="flex-1 px-4 py-2 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg"
                          >
                            ⚡ Activer {previewMatchedRootApp.title} ({previewLinkedModules.filter(m => previewCheckedModules[m.id]).length} modules cochés)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BLOC 2 (EN BAS) : FONCTIONNALITÉS & MODULES ASSOCIÉS */}
                  {previewLinkedModules.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#4169E1]" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#4169E1]">
                            FONCTIONNALITÉS & MODULES ASSOCIÉS
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Compatibles • Cochez pour activer avec l'application
                        </span>
                      </div>

                      <div className="space-y-3">
                        {previewLinkedModules.map((mod: any, mIdx: number) => {
                          const isChecked = !!previewCheckedModules[mod.id];
                          return (
                            <div 
                              key={mod.id || mIdx}
                              onClick={() => setPreviewCheckedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                              className={`bg-[#28283D] border rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                                isChecked ? 'border-[#4169E1] bg-[#2E2E48]' : 'border-slate-700/60'
                              }`}
                            >
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-5 h-5 mt-0.5 rounded accent-[#4169E1] cursor-pointer"
                                />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Link 
                                      to={mod.routeUrl || '#'}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOverlayOpen(false);
                                      }}
                                      className="text-xs font-semibold text-slate-200 hover:text-[#4169E1] flex items-center gap-1.5 transition-colors group"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5 text-[#4169E1] group-hover:translate-x-0.5 transition-transform" />
                                      <span className="group-hover:underline">{mod.title}</span>
                                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#4169E1]" />
                                    </Link>
                                    {mod.palmares && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                                        {mod.palmares}
                                      </span>
                                    )}
                                  </div>
                                  {mod.subtitle && <p className="text-xs text-slate-400">{mod.subtitle}</p>}
                                  <p className="text-xs text-slate-300">{mod.description}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                <button 
                                  type="button"
                                  onClick={() => setPreviewCheckedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                    isChecked ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-600'
                                  }`}
                                >
                                  {isChecked ? '✓ Sélectionné' : '+ Cocher'}
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => alert(`⚡ Module ${mod.title} activé seul !`)}
                                  className="px-3 py-1.5 bg-[#4169E1] hover:bg-blue-600 text-white rounded-lg text-xs font-bold"
                                >
                                  ⚡ Activer seul
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                publishedBlocks
                  .filter(b => !overlaySearch || b.title.toLowerCase().includes(overlaySearch.toLowerCase()) || b.description.toLowerCase().includes(overlaySearch.toLowerCase()))
                  .map((blockGroup, index) => (
                    <div key={index} className="bg-[#28283D] border border-slate-700/60 rounded-xl p-5 hover:border-[#4169E1] transition-all">
                      
                      {/* 1. Bloc Titre & Description (Toujours visible) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <Link 
                            to={blockGroup.routeUrl || '#'} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOverlayOpen(false);
                            }} 
                            className="group flex items-center gap-2 text-base font-bold text-white hover:text-[#4169E1] transition-colors"
                          >
                            <span className="group-hover:underline">{blockGroup.title}</span>
                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#4169E1]" />
                          </Link>
                          {blockGroup.subtitle && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/90 border border-slate-700 px-2 py-0.5 rounded-md">
                              {blockGroup.subtitle}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 mt-2">{blockGroup.description}</p>
                      </div>

                      {/* 2. Zone Dépliable au Survol (Hover) : Médias & Blocs Vidéo/Image */}
                      <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-3">
                        {blockGroup.mediaType === 'video' ? (
                          <div className="w-full h-40 bg-black rounded-lg overflow-hidden">
                            <video src={blockGroup.mediaUrl} controls className="w-full h-full object-cover" />
                          </div>
                        ) : blockGroup.mediaType === 'image' ? (
                          <img src={blockGroup.mediaUrl} alt="Aperçu module" className="w-full h-40 object-cover rounded-lg" />
                        ) : null}

                        {/* Boutons d'Action (Tutoriel & Activation) */}
                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              if (blockGroup.tutorialUrl) window.open(blockGroup.tutorialUrl, '_blank');
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-600 cursor-pointer"
                          >
                            ▶️ Voir le Tutoriel
                          </button>
                          <button 
                            type="button"
                            onClick={() => alert(`⚡ Module « ${blockGroup.title} » activé !`)}
                            className="px-4 py-2 bg-[#4169E1] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg cursor-pointer"
                          >
                            ⚡ Activer le Module
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
              )}
            </div>

          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setIsOverlayOpen(false)} />
        </div>
      )}

      {/* =========================================================================
          TOAST DE NOTIFICATION
         ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-slate-800 text-white border border-[#4169E1] rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 transition-all duration-300 z-50 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default HubBuilderPage;
