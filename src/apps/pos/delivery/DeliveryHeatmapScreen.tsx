import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Package,
  CheckCircle2,
  Phone,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Radio,
  Flame,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Layers,
  Bike
} from 'lucide-react';
import confetti from 'canvas-confetti';
import L from 'leaflet';

import {
  playValidationBeep,
  playTapBeep,
  playNewOrderAlert,
  playCashChime
} from '../../../utils/audio';

// ============================================================================
// 1. TYPES DU SWARM DELIVERY HEATMAP
// ============================================================================

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  productName: string;
  productPrice: number;
  deliveryFee: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';
  liveTitle?: string;
  sellerName?: string;
  sellerAddress?: string;
  distanceKm?: number;
  createdAt: number;
}

export interface DeliveryCluster {
  id: string;
  neighborhood: string;
  city: string;
  centerLat: number;
  centerLng: number;
  orders: DeliveryOrder[];
  totalEarnings: number;
  estimatedDurationMin: number;
  totalDistanceKm: number;
}

export interface DeliveryHeatmapScreenProps {
  /** Liste initiale de commandes ├á projeter */
  initialOrders?: DeliveryOrder[];
  /** Nom du livreur partenaire */
  driverName?: string;
  /** Ville par d├®faut ('Ouagadougou' | 'Abidjan') */
  defaultCity?: 'Ouagadougou' | 'Abidjan';
  /** URL du serveur WebSocket (optionnel, se connecte automatiquement) */
  socketUrl?: string;
  /** Callback lorsqu'un lot de commandes est accept├® */
  onAcceptBatch?: (cluster: DeliveryCluster) => void;
  /** Callback lors de la fermeture de l'├®cran */
  onClose?: () => void;
  className?: string;
}

// Coordonn├®es des villes phares
const CITY_COORDINATES: Record<'Ouagadougou' | 'Abidjan', { lat: number; lng: number; zoom: number }> = {
  Ouagadougou: { lat: 12.3714, lng: -1.5197, zoom: 13 },
  Abidjan: { lat: 5.3484, lng: -4.0305, zoom: 13 }
};

// ============================================================================
// 2. MOCK DATA INITIAL (LOT DE 5 COMMANDES SUR OUAGA 2000)
// ============================================================================

const DEFAULT_ORDERS_MOCK: DeliveryOrder[] = [
  // Lot de 5 commandes dans le m├¬me quartier : Ouaga 2000
  {
    id: 'ord_swarm_1',
    orderNumber: 'CMD-8491',
    customerName: 'Awa Ouedraogo',
    customerPhone: '+226 70 12 34 56',
    address: 'Avenue Pascal Zagr├®, Villa 42',
    neighborhood: 'Ouaga 2000',
    lat: 12.3180,
    lng: -1.5030,
    productName: 'Coffret Karit├® Royal Prestige',
    productPrice: 18500,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    sellerAddress: 'Boutique Centrale Abidjan / Ouaga Mall',
    distanceKm: 1.2,
    createdAt: Date.now() - 1000 * 60 * 2
  },
  {
    id: 'ord_swarm_2',
    orderNumber: 'CMD-8492',
    customerName: 'Dr. Idrissa Sawadogo',
    customerPhone: '+226 76 98 76 54',
    address: 'Pr├¿s du Palais Polyvalent des Sports',
    neighborhood: 'Ouaga 2000',
    lat: 12.3165,
    lng: -1.5055,
    productName: 'Huile Pr├®cieuse Balanites Sauvage',
    productPrice: 12000,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    sellerAddress: 'Boutique Centrale Abidjan / Ouaga Mall',
    distanceKm: 1.5,
    createdAt: Date.now() - 1000 * 60 * 1
  },
  {
    id: 'ord_swarm_3',
    orderNumber: 'CMD-8493',
    customerName: 'Fatimata Kabor├®',
    customerPhone: '+226 78 55 44 33',
    address: 'Zone des Ambassades, Rue 15.102',
    neighborhood: 'Ouaga 2000',
    lat: 12.3195,
    lng: -1.5070,
    productName: 'Pack 3 Savons Noirs Purifiants',
    productPrice: 9500,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    sellerAddress: 'Boutique Centrale Abidjan / Ouaga Mall',
    distanceKm: 1.8,
    createdAt: Date.now() - 1000 * 45
  },
  {
    id: 'ord_swarm_4',
    orderNumber: 'CMD-8494',
    customerName: 'Michel Sanou',
    customerPhone: '+226 65 22 11 00',
    address: 'Boulevard Mouammar Kadhafi',
    neighborhood: 'Ouaga 2000',
    lat: 12.3140,
    lng: -1.5020,
    productName: 'Cr├¿me Anti-├ége Baobab Supreme',
    productPrice: 16000,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    sellerAddress: 'Boutique Centrale Abidjan / Ouaga Mall',
    distanceKm: 2.1,
    createdAt: Date.now() - 1000 * 20
  },
  {
    id: 'ord_swarm_5',
    orderNumber: 'CMD-8495',
    customerName: 'Ramatou Traor├®',
    customerPhone: '+226 71 88 99 00',
    address: 'Face H├┤tel Silmand├® Sud, Secteur 15',
    neighborhood: 'Ouaga 2000',
    lat: 12.3155,
    lng: -1.5040,
    productName: 'Coffret Karit├® Royal Prestige (Recharge)',
    productPrice: 14500,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    sellerAddress: 'Boutique Centrale Abidjan / Ouaga Mall',
    distanceKm: 1.6,
    createdAt: Date.now() - 1000 * 5
  },

  // Autres commandes dispers├®es
  {
    id: 'ord_swarm_6',
    orderNumber: 'CMD-8496',
    customerName: 'Souleymane Diallo',
    customerPhone: '+226 70 33 22 11',
    address: 'Avenue de la Nation, Immeuble Horizon',
    neighborhood: 'Koulouba',
    lat: 12.3685,
    lng: -1.5270,
    productName: 'Brume Hydratante Moringa',
    productPrice: 8000,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    distanceKm: 3.4,
    createdAt: Date.now() - 1000 * 60 * 3
  },
  {
    id: 'ord_swarm_7',
    orderNumber: 'CMD-8497',
    customerName: 'Mariam Compaor├®',
    customerPhone: '+226 75 44 11 22',
    address: 'Face ├ëchangeur de lÔÇÖEst',
    neighborhood: 'Dassasgho',
    lat: 12.3810,
    lng: -1.4890,
    productName: 'S├®rum ├ëclat Hibiscus Bio',
    productPrice: 13500,
    deliveryFee: 1000,
    status: 'PENDING',
    liveTitle: 'Vente Flash Prestige Wameet Live',
    sellerName: 'Awa Nana Empire',
    distanceKm: 4.1,
    createdAt: Date.now() - 1000 * 60 * 5
  }
];

// ============================================================================
// 3. COMPOSANT PRINCIPAL DeliveryHeatmapScreen
// ============================================================================

export const DeliveryHeatmapScreen: React.FC<DeliveryHeatmapScreenProps> = ({
  initialOrders = DEFAULT_ORDERS_MOCK,
  driverName = 'Moussa Express (Moto #24)',
  defaultCity = 'Ouagadougou',
  socketUrl,
  onAcceptBatch,
  onClose,
  className = ''
}) => {
  // ├ëtats de l'interface
  const [orders, setOrders] = useState<DeliveryOrder[]>(initialOrders);
  const [selectedCluster, setSelectedCluster] = useState<DeliveryCluster | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [city, setCity] = useState<'Ouagadougou' | 'Abidjan'>(defaultCity);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [isAcceptedSuccess, setIsAcceptedSuccess] = useState(false);
  const [acceptedBatchId, setAcceptedBatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'ouaga2000' | 'recent'>('all');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // --------------------------------------------------------------------------
  // ALGORITHME DE CLUSTERING PAR QUARTIER
  // Regroupe les commandes proches pour former les "Lots" (ex: 5 commandes Ouaga 2000)
  // --------------------------------------------------------------------------
  const clusters = useMemo<DeliveryCluster[]>(() => {
    const neighborhoodMap = new Map<string, DeliveryOrder[]>();

    orders.forEach((ord) => {
      if (ord.status === 'ACCEPTED' || ord.status === 'DELIVERED') return;
      const key = ord.neighborhood || 'Autre';
      if (!neighborhoodMap.has(key)) {
        neighborhoodMap.set(key, []);
      }
      neighborhoodMap.get(key)!.push(ord);
    });

    const result: DeliveryCluster[] = [];

    neighborhoodMap.forEach((clusterOrders, neighborhood) => {
      const count = clusterOrders.length;
      const sumLat = clusterOrders.reduce((acc, o) => acc + o.lat, 0);
      const sumLng = clusterOrders.reduce((acc, o) => acc + o.lng, 0);
      const centerLat = sumLat / count;
      const centerLng = sumLng / count;
      const totalEarnings = clusterOrders.reduce((acc, o) => acc + (o.deliveryFee || 1000), 0);

      result.push({
        id: `cluster_${neighborhood.toLowerCase().replace(/\s+/g, '_')}`,
        neighborhood,
        city,
        centerLat,
        centerLng,
        orders: clusterOrders,
        totalEarnings,
        estimatedDurationMin: Math.min(15 + count * 5, 45),
        totalDistanceKm: Number((1.5 + count * 0.4).toFixed(1))
      });
    });

    // Trie pour mettre en avant les plus gros lots (ex: Ouaga 2000 avec 5 commandes)
    return result.sort((a, b) => b.orders.length - a.orders.length);
  }, [orders, city]);

  // S├®lectionne par d├®faut le cluster le plus volumineux au chargement
  useEffect(() => {
    if (!selectedCluster && clusters.length > 0) {
      const topCluster = clusters.find((c) => c.orders.length >= 3) || clusters[0];
      setSelectedCluster(topCluster);
    }
  }, [clusters, selectedCluster]);

  // --------------------------------------------------------------------------
  // INITIALISATION DE LA CARTE LEAFLET EN MODE DARK "MIDNIGHT"
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      try {
        // Injection dynamique des styles Leaflet (├®vite tout conflit SSR/Node)
        if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // ├ëvite la double initialisation
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
        }

        const cityCoords = CITY_COORDINATES[city];
        const map = L.map(mapContainerRef.current, {
          center: [cityCoords.lat, cityCoords.lng],
          zoom: cityCoords.zoom,
          zoomControl: false,
          attributionControl: false
        });

        // Tuiles sombres haute performance "Midnight" (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

        // Groupe de couches pour les marqueurs dynamiques
        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        leafletMapRef.current = map;

        if (isMounted) {
          renderMarkersOnMap(L, map, markersLayer);
        }
      } catch (err) {
        console.warn('[DeliveryHeatmap] Erreur initialisation Leaflet :', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [city]);

  // --------------------------------------------------------------------------
  // RENDU DES POINTS & BULLES DE CLUSTERING SUR LA CARTE
  // Directives UI/UX au millim├¿tre :
  // - Point isol├® : Rouge vif avec onde de choc (animate-ping)
  // - Lot de commandes (>= 3) : Bulle de fusion avec le chiffre centr├® (ex: "5")
  // --------------------------------------------------------------------------
  const renderMarkersOnMap = useCallback(
    (L: any, map: any, layer: any) => {
      layer.clearLayers();

      clusters.forEach((cluster) => {
        const orderCount = cluster.orders.length;

        // CAS A : LOT DE PLUSIEURS COMMANDES (CLUSTERING EN BULLE)
        if (orderCount >= 2) {
          const isSelected = selectedCluster?.id === cluster.id;
          const clusterHtml = `
            <div class="relative group cursor-pointer flex items-center justify-center">
              <!-- Halo d'onde de choc pulsant dor├®/rose -->
              <span class="absolute inline-flex w-12 h-12 rounded-full bg-rose-500 opacity-40 animate-ping"></span>
              
              <!-- Bulle principale avec le chiffre du lot (ex: "5") -->
              <div class="relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-red-600 text-white font-black text-sm shadow-[0_0_24px_rgba(244,63,94,0.8)] border-2 ${
                isSelected ? 'border-lime-400 scale-110 ring-4 ring-lime-400/50' : 'border-yellow-300 ring-2 ring-rose-500/40'
              } transition-transform hover:scale-115">
                <span class="drop-shadow-md text-base">${orderCount}</span>
              </div>
              
              <!-- Badge sous la bulle avec le nom du quartier -->
              <div class="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-700 text-[10px] font-black text-amber-300 shadow">
                ${cluster.neighborhood}
              </div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-icon',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          const marker = L.marker([cluster.centerLat, cluster.centerLng], {
            icon: clusterIcon
          });

          marker.on('click', () => {
            playTapBeep();
            setSelectedCluster(cluster);
            setSelectedOrder(null);
            map.flyTo([cluster.centerLat, cluster.centerLng], 14, { duration: 0.8 });
          });

          layer.addLayer(marker);

          // Si ce cluster est s├®lectionn├®, affiche aussi les points individuels en onde de choc
          if (isSelected) {
            cluster.orders.forEach((ord) => {
              const pingHtml = `
                <div class="relative flex h-4 w-4 items-center justify-center cursor-pointer">
                  <!-- Onde de choc anim├®e (animate-ping) -->
                  <span class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <!-- Point central rouge vif -->
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] border border-white"></span>
                </div>
              `;

              const singleIcon = L.divIcon({
                html: pingHtml,
                className: 'custom-ping-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });

              const subMarker = L.marker([ord.lat, ord.lng], { icon: singleIcon });
              subMarker.on('click', () => {
                playTapBeep();
                setSelectedOrder(ord);
              });
              layer.addLayer(subMarker);
            });
          }
        } else {
          // CAS B : COMMANDE UNIQUE (POINT ISOL├ë AVEC HALO ANIMATE-PING)
          const singleOrder = cluster.orders[0];
          const isSelected = selectedOrder?.id === singleOrder.id;

          const singleMarkerHtml = `
            <div class="relative flex h-4 w-4 items-center justify-center cursor-pointer">
              <!-- Halo anim├® en onde de choc -->
              <span class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              <!-- Point central rouge vif -->
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] border ${
                isSelected ? 'border-lime-400 scale-125' : 'border-white'
              }"></span>
            </div>
          `;

          const singleIcon = L.divIcon({
            html: singleMarkerHtml,
            className: 'custom-single-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const singleMarker = L.marker([singleOrder.lat, singleOrder.lng], {
            icon: singleIcon
          });

          singleMarker.on('click', () => {
            playTapBeep();
            setSelectedOrder(singleOrder);
            setSelectedCluster(cluster);
          });

          layer.addLayer(singleMarker);
        }
      });
    },
    [clusters, selectedCluster, selectedOrder]
  );

  // Synchronise les marqueurs lorsque les clusters ou s├®lections changent
  useEffect(() => {
    if (leafletMapRef.current && markersLayerRef.current) {
      import('leaflet').then((module) => {
        const L = module.default;
        renderMarkersOnMap(L, leafletMapRef.current, markersLayerRef.current);
      });
    }
  }, [clusters, selectedCluster, selectedOrder, renderMarkersOnMap]);

  // --------------------------------------------------------------------------
  // ├ëCOUTE DES ├ëV├ëNEMENTS WEBSOCKET EN DIRECT (COMMANDES LIVE)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ├ëcoute de l'├®v├®nement global 'wameet:live_order_placed'
    const handleNewOrderEvent = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const data = customEvent.detail;
      if (!data) return;

      const randomLat = 12.3150 + (Math.random() - 0.5) * 0.01;
      const randomLng = -1.5050 + (Math.random() - 0.5) * 0.01;

      const newOrder: DeliveryOrder = {
        id: `ord_live_${Date.now()}`,
        orderNumber: `CMD-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: data.buyerName || 'Client Live Wameet',
        customerPhone: '+226 70 00 11 22',
        address: 'Quartier Ouaga 2000, Rue en direct',
        neighborhood: 'Ouaga 2000',
        lat: randomLat,
        lng: randomLng,
        productName: data.productName || 'Produit Vente Flash',
        productPrice: data.amount || 15000,
        deliveryFee: 1000,
        status: 'PENDING',
        liveTitle: 'Vente Flash en direct',
        sellerName: 'Boutique Wameet',
        distanceKm: 1.7,
        createdAt: Date.now()
      };

      setOrders((prev) => [newOrder, ...prev]);

      if (isAudioEnabled) {
        try {
          playNewOrderAlert();
        } catch {}
      }
    };

    window.addEventListener('wameet:live_order_placed', handleNewOrderEvent);
    return () => {
      window.removeEventListener('wameet:live_order_placed', handleNewOrderEvent);
    };
  }, [isAudioEnabled]);

  // --------------------------------------------------------------------------
  // ACTIONS LIVREUR : ACCEPTATION DU LOT (LE CLOU DU SPECTACLE)
  // --------------------------------------------------------------------------
  const handleAcceptBatch = () => {
    if (!selectedCluster) return;

    if (isAudioEnabled) {
      try {
        playCashChime();
        playValidationBeep();
      } catch {}
    }

    // Explosion de confettis de c├®l├®bration pour le livreur
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.85, x: 0.5 },
        colors: ['#A3E635', '#10B981', '#FBBF24', '#38BDF8', '#FFFFFF']
      });
    } catch {}

    setIsAcceptedSuccess(true);
    setAcceptedBatchId(selectedCluster.id);

    // Marque les commandes du lot comme accept├®es
    setOrders((prev) =>
      prev.map((o) =>
        selectedCluster.orders.some((co) => co.id === o.id)
          ? { ...o, status: 'ACCEPTED' as const }
          : o
      )
    );

    if (onAcceptBatch) {
      onAcceptBatch(selectedCluster);
    }
  };

  // Simulation manuelle d'une commande Live suppl├®mentaire
  const handleSimulateLiveOrder = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wameet:live_order_placed', {
          detail: {
            buyerName: `Acheteur ${Math.floor(Math.random() * 100)}`,
            productName: 'Coffret Karit├® Royal Prestige',
            amount: 15000
          }
        })
      );
    }
  };

  // Recentre la carte sur le cluster s├®lectionn├®
  const handleRecenterOnCluster = (targetCluster: DeliveryCluster) => {
    setSelectedCluster(targetCluster);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(
        [targetCluster.centerLat, targetCluster.centerLng],
        14,
        { duration: 0.8 }
      );
    }
  };

  return (
    <div
      className={`relative w-full h-screen h-[100dvh] flex flex-col bg-slate-950 text-white overflow-hidden select-none font-sans ${className}`}
    >
      {/* =====================================================================
          1. HEADER HUD SUP├ëRIEUR : LIVREUR SWARM, STATS & DIRECT LIVE
         ===================================================================== */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Identit├® Livreur & Statut Swarm */}
          <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-md">
                <Bike className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>

            <div className="leading-tight text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white">{driverName}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/30 text-[9px] font-black uppercase">
                  Swarm Actif
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{city} ÔÇó Rayon 15 km</span>
              </div>
            </div>
          </div>

          {/* Contr├┤les Rapides & Simulation */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Bouton de simulation en 1 clic */}
            <button
              type="button"
              onClick={handleSimulateLiveOrder}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95"
              title="Simuler l'arriv├®e d'une commande en direct du Live"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              <span>+1 Commande Live</span>
            </button>

            {/* S├®lecteur de ville rapide */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setCity((prev) => (prev === 'Ouagadougou' ? 'Abidjan' : 'Ouagadougou'));
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
              title="Basculer de ville"
            >
              ­ƒîì {city === 'Ouagadougou' ? 'Ouaga' : 'Abidjan'}
            </button>

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setIsAudioEnabled(!isAudioEnabled);
              }}
              className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center transition cursor-pointer"
              title={isAudioEnabled ? 'D├®sactiver les alertes sonores' : 'Activer les alertes sonores'}
            >
              {isAudioEnabled ? (
                <Volume2 className="w-4 h-4 text-lime-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Bouton Fermer */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Quitter la carte"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barre de stats globales Swarm */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto max-w-7xl mx-auto">
          <div className="px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shrink-0 shadow">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Live Vendeur Actif</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shrink-0 shadow">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {orders.filter((o) => o.status === 'PENDING').length} commandes en attente
            </span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[11px] font-extrabold text-emerald-300 flex items-center gap-1.5 shrink-0 shadow">
            <span>­ƒÆ░</span>
            <span>
              Gains disponibles :{' '}
              {orders
                .filter((o) => o.status === 'PENDING')
                .reduce((acc, o) => acc + (o.deliveryFee || 1000), 0)
                .toLocaleString('fr-FR')}{' '}
              FCFA
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. LA CARTE PRINCIPALE DARK MODE ("MIDNIGHT" CARTODB)
         ===================================================================== */}
      <main className="relative flex-1 w-full h-full bg-[#0b0f19]">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Bouton flottant de g├®olocalisation & recentrage */}
        <div className="absolute right-4 top-24 z-20 flex flex-col gap-2">
          {clusters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleRecenterOnCluster(c)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-xl backdrop-blur-md transition-all cursor-pointer ${
                selectedCluster?.id === c.id
                  ? 'bg-rose-600 text-white ring-2 ring-yellow-400 scale-105'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{c.neighborhood}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] text-yellow-300">
                {c.orders.length}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              if (selectedCluster && leafletMapRef.current) {
                leafletMapRef.current.flyTo(
                  [selectedCluster.centerLat, selectedCluster.centerLng],
                  14,
                  { duration: 0.6 }
                );
              }
            }}
            className="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-lime-400 border border-slate-700 flex items-center justify-center shadow-xl transition cursor-pointer self-end"
            title="Recentrer sur le lot actif"
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* =====================================================================
          3. LE PANNEAU D'ACTION (BOTTOM SHEET GLISSANT)
             Directives UI/UX :
             - backdrop-blur-xl bg-slate-900/95 border-t border-slate-700 text-white
             - "Lot de 5 commandes d├®tect├® - Quartier X"
             - "Gain de livraison estim├® : 5000 FCFA"
             - Bouton vert fluo : "Accepter et R├®cup├®rer ce lot ­ƒÜÇ" avec hover:scale-105
         ===================================================================== */}
      {selectedCluster && (
        <section
          aria-label="D├®tail du lot de livraison"
          className="relative z-30 shrink-0 w-full backdrop-blur-xl bg-slate-900/95 border-t border-slate-700 text-white p-4 sm:p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] transition-all animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-2xl mx-auto space-y-3.5">
            {/* Poign├®e tactile d├®corative */}
            <div className="w-12 h-1 rounded-full bg-slate-700 mx-auto" />

            {/* En-t├¬te : Titre du Lot & Gains Estim├®s */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                    ­ƒöÑ Hotspot Swarm
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">
                    {selectedCluster.city}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Lot de {selectedCluster.orders.length} commandes d├®tect├® - Quartier{' '}
                  <span className="text-amber-400">{selectedCluster.neighborhood}</span>
                </h3>

                <p className="text-xs text-slate-400 flex items-center gap-2 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>~{selectedCluster.estimatedDurationMin} min de tourn├®e</span>
                  </span>
                  <span>ÔÇó</span>
                  <span>~{selectedCluster.totalDistanceKm} km cumul├®s</span>
                </p>
              </div>

              {/* Badge de Gain de livraison estim├® (ex: 5 000 FCFA) */}
              <div className="text-right shrink-0 bg-emerald-950/70 border border-emerald-500/50 p-2.5 rounded-2xl shadow-inner">
                <span className="block text-[10px] font-bold text-emerald-300 uppercase tracking-tight">
                  Gain de livraison estim├®
                </span>
                <span className="text-lg sm:text-xl font-black text-lime-400 tracking-tight">
                  +{selectedCluster.totalEarnings.toLocaleString('fr-FR')} FCFA
                </span>
                <span className="block text-[9px] text-emerald-300/80 font-semibold">
                  (1 000 FCFA / colis)
                </span>
              </div>
            </div>

            {/* Aper├ºu des colis du lot */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pr-1">
              {selectedCluster.orders.map((ord, idx) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                    selectedOrder?.id === ord.id
                      ? 'bg-slate-800/90 border-lime-400 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-[11px] shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-bold text-white truncate flex items-center gap-1.5">
                        <span>{ord.customerName}</span>
                        <span className="text-[10px] text-slate-400">({ord.orderNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {ord.productName} ÔÇó {ord.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-emerald-400 font-extrabold text-xs">
                      +{ord.deliveryFee} F
                    </span>
                    <a
                      href={`tel:${ord.customerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                      title="Appeler le client"
                    >
                      <Phone className="w-3.5 h-3.5 text-lime-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* ===============================================================
                BOUTON PRINCIPAL VERT FLUO ULTRA-GRATIFIANT
               =============================================================== */}
            {isAcceptedSuccess && acceptedBatchId === selectedCluster.id ? (
              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between gap-3 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-6 h-6 text-lime-400 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-white">
                      Lot accept├® avec succ├¿s ! ­ƒÜÇ
                    </div>
                    <div className="text-xs text-emerald-300">
                      En route pour la r├®cup├®ration chez le vendeur.
                    </div>
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedCluster.centerLat},${selectedCluster.centerLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Itin├®raire GPS</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAcceptBatch}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-lime-400 hover:bg-lime-300 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-[0_0_28px_rgba(163,230,53,0.45)] hover:scale-105 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 select-none"
              >
                <span>Accepter et R├®cup├®rer ce lot ­ƒÜÇ</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 text-xs font-black">
                  +{selectedCluster.totalEarnings.toLocaleString('fr-FR')} FCFA
                </span>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default DeliveryHeatmapScreen;
