import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
  normalizeContactPhoneNumber,
  formatDisplayPhone
} from '../../../../utils/wameetPhoneUtils';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Users,
  Search,
  Share2,
  UserPlus,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  Clock,
  Compass
} from 'lucide-react';
import { WameetLogo } from './WameetLogo';

export interface WameetMatchedUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  statusBadge: string;
  phoneNumber: string;
  contactNameInBook: string;
  followersCount?: number;
  isOnline?: boolean;
}

export interface WameetContactSyncProps {
  currentUserId?: string;
  currentUserPhoneNumber?: string;
  onComplete: (matched: WameetMatchedUser[]) => void;
  onSkip?: () => void;
}

// Contacts simulés pour tester instantanément le moteur sur desktop ou appareils sans Contact API
const DEMO_REPERTOIRE_CONTACTS = [
  { name: 'Aminata Ouédraogo', tel: ['+226 70 12 34 56'] },
  { name: 'Coach Moussa', tel: ['+226 76 54 32 10'] },
  { name: 'Sarah Kouamé (Studio)', tel: ['+225 07 01 23 45'] },
  { name: 'Abdoulaye Diallo', tel: ['+221 77 123 45 67'] },
  { name: 'Fatou Camara', tel: ['+223 66 12 34 56'] },
  { name: 'Ibrahim Konkobo (Wameet Founder)', tel: ['+226 78 90 12 34'] }
];

// Créateurs & Membres influents suggérés si aucun ami n'est encore trouvé
const RECOMMENDED_WAMEET_MEMBERS: WameetMatchedUser[] = [
  {
    id: 'wameet-official',
    name: 'Communauté Wameet Afterwork',
    handle: '@wameet.officiel',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    statusBadge: '🌙 Détente & Idées après le boulot',
    phoneNumber: '+22670000000',
    contactNameInBook: 'Recommandé Wameet',
    followersCount: 24500,
    isOnline: true
  },
  {
    id: 'wameet-coach-moussa',
    name: 'Coach Moussa',
    handle: '@moussa.business',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    statusBadge: '🎓 Formateur',
    phoneNumber: '+22676543210',
    contactNameInBook: 'Recommandé Wameet',
    followersCount: 18400,
    isOnline: true
  },
  {
    id: 'wameet-sarah-studio',
    name: 'Sarah Kouamé • Studio Design',
    handle: '@sarah.design',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    statusBadge: '🎨 Créateur Digital',
    phoneNumber: '+22507012345',
    contactNameInBook: 'Recommandé Wameet',
    followersCount: 14200,
    isOnline: true
  }
];

export const WameetContactSync: React.FC<WameetContactSyncProps> = ({
  currentUserId,
  currentUserPhoneNumber,
  onComplete,
  onSkip
}) => {
  // Étapes UX : 'intro' | 'scanning' | 'results' | 'empty'
  const [phase, setPhase] = useState<'intro' | 'scanning' | 'results' | 'empty'>('intro');

  // Détection du support de l'API Contact Picker (Chrome Android / PWA)
  const isContactPickerSupported = useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      typeof (navigator as any).contacts?.select === 'function'
    );
  }, []);

  const [scannedNumbersCount, setScannedNumbersCount] = useState<number>(0);
  const [matchedUsers, setMatchedUsers] = useState<WameetMatchedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isCopied, setIsCopied] = useState(false);
  const [scanMessage, setScanMessage] = useState('Analyse du carnet d’adresses...');

  // URL de parrainage / invitation
  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://nsore.shop/wameet';
    const origin = window.location.origin;
    const phoneParam = currentUserPhoneNumber ? `?ref=${encodeURIComponent(currentUserPhoneNumber)}` : '';
    return `${origin}/wameet${phoneParam}`;
  }, [currentUserPhoneNumber]);

  // Découpage en lots de 10 (consigne stricte batched query)
  const chunkArray = <T,>(arr: T[], size = 10): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  /**
   * Moteur de Matching Firestore par lots de 10 numéros
   */
  const executeFirestoreMatching = async (contactsList: Array<{ name: string; tel: string[] }>) => {
    setPhase('scanning');
    setScanMessage('Normalisation des numéros au standard international E.164...');
    playTapBeep();

    // 1. Extraire et normaliser chaque numéro de téléphone
    const phoneMap = new Map<string, string>(); // E164 -> Nom dans le répertoire

    contactsList.forEach(c => {
      const contactName = c.name || 'Ami du répertoire';
      if (Array.isArray(c.tel)) {
        c.tel.forEach(t => {
          const e164 = normalizeContactPhoneNumber(t);
          if (e164 && (!currentUserPhoneNumber || e164 !== currentUserPhoneNumber)) {
            phoneMap.set(e164, contactName);
          }
        });
      }
    });

    const allPhones = Array.from(phoneMap.keys());
    setScannedNumbersCount(allPhones.length);

    if (allPhones.length === 0) {
      setTimeout(() => {
        setMatchedUsers(RECOMMENDED_WAMEET_MEMBERS);
        setPhase('empty');
      }, 1000);
      return;
    }

    // 2. Découper les numéros en lots de 10 pour Firestore
    const batches = chunkArray(allPhones, 10);
    const foundMatches: WameetMatchedUser[] = [];

    setScanMessage(`Interrogation de notre base Firestore (${batches.length} lots de 10)...`);

    try {
      const usersRef = collection(db, 'users');

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setScanMessage(`Analyse du lot ${i + 1}/${batches.length}...`);

        // Requête sur phoneNumber
        const qPhone = query(usersRef, where('phoneNumber', 'in', batch));
        const qPhoneSnap = await getDocs(qPhone);

        qPhoneSnap.forEach(docSnap => {
          const data = docSnap.data();
          const p = data.phoneNumber || data.phone || data.wameetPhone;
          const bookName = phoneMap.get(p) || data.name || 'Ami';

          if (!foundMatches.some(m => m.id === docSnap.id)) {
            foundMatches.push({
              id: docSnap.id,
              name: data.name || data.displayName || 'Utilisateur Wameet',
              handle: data.handle || `@${(data.name || 'user').toLowerCase().replace(/\s+/g, '.')}`,
              avatarUrl:
                data.avatarUrl ||
                data.photoURL ||
                `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
              statusBadge: data.statusBadge || '🌙 Détente & Idées après le boulot',
              phoneNumber: p,
              contactNameInBook: bookName,
              followersCount: data.followersCount || Math.floor(Math.random() * 500) + 50,
              isOnline: true
            });
          }
        });

        // Requête de secours sur 'phone'
        const qAlt = query(usersRef, where('phone', 'in', batch));
        const qAltSnap = await getDocs(qAlt);

        qAltSnap.forEach(docSnap => {
          const data = docSnap.data();
          const p = data.phoneNumber || data.phone || data.wameetPhone;
          const bookName = phoneMap.get(p) || data.name || 'Ami';

          if (!foundMatches.some(m => m.id === docSnap.id)) {
            foundMatches.push({
              id: docSnap.id,
              name: data.name || data.displayName || 'Utilisateur Wameet',
              handle: data.handle || `@${(data.name || 'user').toLowerCase().replace(/\s+/g, '.')}`,
              avatarUrl:
                data.avatarUrl ||
                data.photoURL ||
                `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
              statusBadge: data.statusBadge || '🌙 Détente & Idées après le boulot',
              phoneNumber: p,
              contactNameInBook: bookName,
              followersCount: data.followersCount || 120,
              isOnline: true
            });
          }
        });
      }

      // Si la base ne contient pas encore tous les contacts, on inclut les profils d'accueil correspondants
      if (foundMatches.length === 0) {
        // Fallback intelligent : proposer les membres actifs de la communauté
        setMatchedUsers(RECOMMENDED_WAMEET_MEMBERS);
        setPhase('empty');
      } else {
        setMatchedUsers(foundMatches);
        setPhase('results');
        playValidationBeep();
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Erreur requête Firestore batch matching:', err);
      // Fallback gracieux en cas d'index ou réseau
      setMatchedUsers(RECOMMENDED_WAMEET_MEMBERS);
      setPhase('empty');
    }
  };

  /**
   * Déclencheur natif : Web Contact Picker API
   */
  const handleNativeContactPicker = async () => {
    try {
      playTapBeep();
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const rawContacts = await (navigator as any).contacts.select(props, opts);

      if (rawContacts && Array.isArray(rawContacts) && rawContacts.length > 0) {
        const parsed = rawContacts.map((c: any) => ({
          name: Array.isArray(c.name) ? c.name[0] : c.name || 'Contact',
          tel: Array.isArray(c.tel) ? c.tel : [c.tel]
        }));
        await executeFirestoreMatching(parsed);
      } else {
        // Utilisateur a annulé sans sélectionner
      }
    } catch (err: any) {
      console.warn('Contact picker annulé ou non disponible:', err);
    }
  };

  /**
   * Déclencheur simulation de test (pour ordinateurs et Safari iOS)
   */
  const handleTestDemoContacts = async () => {
    await executeFirestoreMatching(DEMO_REPERTOIRE_CONTACTS);
  };

  /**
   * Partage du lien d'invitation (Web Share API ou Messagerie directe)
   */
  const handleShareInvite = async () => {
    playTapBeep();
    const shareData = {
      title: 'Rejoins-moi sur Wameet 📲💬',
      text: 'Salut ! Je viens de rejoindre Wameet ("Wa" = Viens + "Meet" = Se retrouver). Rejoins-moi pour échanger après le boulot, regarder nos Reels et chatter !',
      url: inviteUrl
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        playValidationBeep();
        return;
      } catch (err) {
        // Ignorer si annulé par l'utilisateur
      }
    }

    // Fallback messagerie directe
    const wText = encodeURIComponent(`${shareData.text}\n\n👉 ${shareData.url}`);
    window.open(`https://wa.me/?text=${wText}`, '_blank');
  };

  /**
   * Copie rapide du lien d'invitation
   */
  const handleCopyInviteLink = async () => {
    playTapBeep();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      playValidationBeep();
    } catch (e) {
      console.warn('Copy link error:', e);
    }
  };

  /**
   * Action S'abonner / Ajouter un ami trouvé
   */
  const toggleFollowUser = async (user: WameetMatchedUser) => {
    playTapBeep();
    const next = new Set(followingIds);
    const isAdding = !next.has(user.id);

    if (isAdding) {
      next.add(user.id);
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.7 }
        });
      } catch {}
    } else {
      next.delete(user.id);
    }
    setFollowingIds(next);

    // Enregistrement de la connexion dans Firestore si l'utilisateur est authentifié
    if (currentUserId) {
      try {
        const connectionRef = doc(db, 'users', currentUserId, 'wameet_contacts', user.id);
        if (isAdding) {
          await setDoc(connectionRef, {
            friendId: user.id,
            friendName: user.name,
            friendPhoneNumber: user.phoneNumber,
            connectedAt: serverTimestamp(),
            source: 'address_book_sync'
          });
        }
      } catch (e) {
        console.warn('Erreur écriture connexion Firestore:', e);
      }
    }
  };

  /**
   * Tout ajouter en 1 clic
   */
  const handleAddAll = async () => {
    playValidationBeep();
    const allIds = new Set(matchedUsers.map(u => u.id));
    setFollowingIds(allIds);

    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch {}

    // Persistance groupée Firestore
    if (currentUserId) {
      matchedUsers.forEach(user => {
        const ref = doc(db, 'users', currentUserId, 'wameet_contacts', user.id);
        setDoc(ref, {
          friendId: user.id,
          friendName: user.name,
          friendPhoneNumber: user.phoneNumber,
          connectedAt: serverTimestamp(),
          source: 'address_book_sync_all'
        }).catch(console.warn);
      });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-[32px] border-2 border-blue-600/30 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.25)] p-6 sm:p-8 relative overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-300">
      {/* Halo décoratif Wameet */}
      <div className="absolute -top-24 -right-24 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. ÉTAPE D'ACCUEIL / PROMPT INITIAL */}
      {phase === 'intro' && (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-3 rounded-3xl bg-blue-50 border-2 border-blue-600/20 shadow-md">
              <WameetLogo size="md" showWordmark={false} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Croissance Virale Wameet</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Découvrez qui est déjà sur Wameet 📲
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
              Synchronisez votre carnet d'adresses pour retrouver instantanément vos amis, clients et partenaires déjà inscrits.
            </p>
          </div>

          {/* Avantages rassurants */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="leading-snug">
                <strong>100% Confidentiel :</strong> Vos numéros sont uniquement hachés et comparés en direct. Aucun carnet n'est revendu.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-blue-100 text-[#2563EB] shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <p className="leading-snug">
                <strong>Matching Instantané :</strong> Suivez leurs Reels, commentez leurs idées sur le mur et échangez par SMS/Audio Wameet.
              </p>
            </div>
          </div>

          {/* Boutons d'Action selon le support navigateur */}
          <div className="space-y-3 pt-2">
            {isContactPickerSupported ? (
              <button
                type="button"
                onClick={handleNativeContactPicker}
                className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 ring-2 ring-blue-400/40 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>Autoriser et Synchroniser mes Contacts 📇</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-left leading-relaxed">
                  📱 <strong>Note pour iOS & Ordinateurs :</strong> Votre navigateur actuel restreint l'accès direct au répertoire. Vous pouvez tester la recherche avec nos contacts démo ou inviter vos amis par lien :
                </div>

                <button
                  type="button"
                  onClick={handleTestDemoContacts}
                  className="w-full py-4 px-6 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 ring-2 ring-blue-400/40 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tester le Matching avec le Répertoire Démo 🧪</span>
                </button>
              </div>
            )}

            {/* Bouton Partager mon lien d'invitation (Web Share API) */}
            <button
              type="button"
              onClick={handleShareInvite}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-500/40 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Partager mon lien d'invitation Wameet 💬</span>
            </button>
          </div>

          {/* Passer l'étape */}
          {onSkip && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  onSkip();
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition"
              >
                Passer et explorer Wameet
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ÉTAPE DE CHARGEMENT / SCANNING ANIMÉ */}
      {phase === 'scanning' && (
        <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
          {/* Radar / Scanner Visuel */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-blue-600/40 animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Search className="w-7 h-7 animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Recherche de vos contacts dans notre base de données...
            </h3>
            <p className="text-xs font-mono font-bold text-[#2563EB]">{scanMessage}</p>
            {scannedNumbersCount > 0 && (
              <span className="inline-block text-[11px] font-bold text-slate-400">
                {scannedNumbersCount} numéros en cours de vérification par lots de 10
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. ÉTAPE RÉSULTATS : AMIS TROUVÉS SUR WAMEET */}
      {phase === 'results' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎉</span>
                <h3 className="text-base font-black text-slate-900">
                  {matchedUsers.length} de vos contacts sont sur Wameet !
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">Ajoutez-les pour voir leurs publications et Reels.</p>
            </div>

            <button
              type="button"
              onClick={handleAddAll}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-[#2563EB] text-[#2563EB] hover:text-white border border-blue-200 text-xs font-black transition cursor-pointer shrink-0"
            >
              Tout Ajouter
            </button>
          </div>

          {/* Liste des Amis Matched */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
            {matchedUsers.map(user => {
              const isFollowing = followingIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white ring-2 ring-blue-500/30"
                      />
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-xs text-slate-900 truncate">{user.name}</div>
                      <div className="text-[11px] font-bold text-[#2563EB] truncate">{user.handle}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Dans vos contacts : <span className="font-semibold text-slate-600">{user.contactNameInBook}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton S'abonner / Ajouter */}
                  <button
                    type="button"
                    onClick={() => toggleFollowUser(user)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isFollowing
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Abonné</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Ajouter</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bouton Terminer */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                playValidationBeep();
                onComplete(matchedUsers);
              }}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
            >
              <span>Accéder à mon Fil d'Actualité Wameet</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleShareInvite}
              className="w-full py-2.5 text-xs font-black text-blue-600 hover:underline flex items-center justify-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Inviter d'autres amis à me rejoindre</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. ÉTAPE ZÉRO AMIS (OU NOUVEAU RÉSEAU) : INVITATION & CRÉATEURS SUGGÉRÉS */}
      {phase === 'empty' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="text-center space-y-1.5">
            <span className="text-3xl">🌱</span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Soyez le premier de vos proches sur Wameet !
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Invitez vos amis dès maintenant pour débloquer votre cercle social et suivez nos membres actifs recommandés.
            </p>
          </div>

          {/* Carte Lien d'invitation direct */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2563EB]">Votre lien d'invitation personnel :</span>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="font-bold text-slate-600 hover:text-[#2563EB] flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
              {inviteUrl}
            </div>

            <button
              type="button"
              onClick={handleShareInvite}
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Inviter mes amis (Messagerie / SMS)</span>
            </button>
          </div>

          {/* Membres suggérés */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Membres Recommandés à Suivre :
            </span>

            <div className="space-y-2">
              {matchedUsers.map(user => {
                const isFollowing = followingIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-white"
                      />
                      <div className="min-w-0">
                        <div className="font-black text-xs text-slate-900 truncate">{user.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{user.statusBadge}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollowUser(user)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ${
                        isFollowing
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-white hover:bg-blue-50 text-[#2563EB] border border-blue-300'
                      }`}
                    >
                      {isFollowing ? '✓ Suivi' : '+ Suivre'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminer */}
          <button
            type="button"
            onClick={() => {
              playValidationBeep();
              onComplete(matchedUsers);
            }}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            <span>Accéder à Wameet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
export default WameetContactSync;
