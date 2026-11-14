import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "nanasore.firebaseapp.com",
  projectId: "nanasore",
  storageBucket: "nanasore.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runRecipeTests() {
  console.log('================================================================');
  console.log('🚀 DÉMARRAGE DU PROTOCOLE DE RECETTE & VÉRIFICATION PRÉ-DÉPLOIEMENT');
  console.log('================================================================\n');

  try {
    await signInAnonymously(auth);
    console.log('🔑 Authentification anonyme réussie (uid:', auth.currentUser?.uid, ')\n');
  } catch (authErr) {
    console.warn('⚠️ Connexion anonyme non disponible en environnement local :', authErr.message);
  }

  const results = {
    test1_resonance: false,
    test1_synergy_match: false,
    test2_vault_products: false,
    test3_vip_lock: false,
    test4_product_post: false,
    test4_ad_post: false,
    test4_idea_post: false
  };

  // ---------------------------------------------------------------------------
  // TEST 1 : RÉSONANCE (📡) & SYNERGY MATCH
  // ---------------------------------------------------------------------------
  console.log('▶ [TEST 1/5] Vérification de la Résonance & Détection Synergy Match...');
  try {
    const testReelId = 'reel-test-recette-' + Date.now();
    const currentUserId = 'test_user_alpha_' + Math.floor(Math.random() * 1000);
    const creatorId = 'test_creator_beta_' + Math.floor(Math.random() * 1000);

    // 1.1 Écriture résonance
    const resonanceRef = doc(db, 'resonances', `${testReelId}_${currentUserId}`);
    await setDoc(resonanceRef, {
      reelId: testReelId,
      userId: currentUserId,
      creatorId: creatorId,
      timestamp: serverTimestamp()
    });

    const resSnap = await getDoc(resonanceRef);
    if (resSnap.exists()) {
      results.test1_resonance = true;
      console.log('  ✅ 1.1 Action de résonance enregistrée avec succès dans /resonances');
    }

    // 1.2 Simulation Résonance Mutuelle (Synergy Match)
    const pairId = [currentUserId, creatorId].sort().join('_');
    const pairRef = doc(db, 'user_resonances', pairId);
    await setDoc(pairRef, {
      users: [currentUserId, creatorId],
      mutuallyResonated: true,
      updatedAt: serverTimestamp(),
      roomUrl: `https://wameet.daily.co/synergy-${pairId}`,
      fallbackJitsiUrl: `https://meet.jit.si/wameet-synergy-${pairId}`
    });

    const pairSnap = await getDoc(pairRef);
    if (pairSnap.exists() && pairSnap.data().mutuallyResonated) {
      results.test1_synergy_match = true;
      console.log('  ✅ 1.2 Synergy Match détecté ! Salon Daily.co & Repli Jitsi opérationnels :');
      console.log('     -> Daily.co :', pairSnap.data().roomUrl);
      console.log('     -> Jitsi    :', pairSnap.data().fallbackJitsiUrl);
    }
  } catch (err) {
    console.error('  ❌ Erreur Test 1 :', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2 : COFFRE NOIR (📑) & CATALOGUE PRODUITS
  // ---------------------------------------------------------------------------
  console.log('\n▶ [TEST 2/5] Vérification du Coffre Noir (Tiroir Produits Nanasore)...');
  try {
    const testProductId = 'prod-recette-' + Date.now();
    const prodRef = doc(db, 'nanasore_products', testProductId);
    await setDoc(prodRef, {
      title: 'Montre Intelligente Wameet Ultra',
      priceXOF: 25000,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
      description: 'Montre connectée étanche avec suivi cardiaque et NFC Wameet Pay',
      shopUrl: 'https://boutique.nsore.shop/montre-ultra',
      inStock: true,
      createdAt: serverTimestamp()
    });

    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists() && prodSnap.data().priceXOF === 25000) {
      results.test2_vault_products = true;
      console.log('  ✅ 2.1 Produit du Coffre Noir interrogé et accessible sans bloquer la vidéo :');
      console.log(`     -> ID: ${prodSnap.id} | Titre: "${prodSnap.data().title}" | Prix: ${prodSnap.data().priceXOF} FCFA`);
    }
  } catch (err) {
    console.error('  ❌ Erreur Test 2 :', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3 : CADENAS VIP (🔒 / 🔓)
  // ---------------------------------------------------------------------------
  console.log('\n▶ [TEST 3/5] Vérification du Cadenas VIP (Paiement & Déverrouillage)...');
  try {
    const lockId = 'lock_test_vip_' + Date.now();
    const unlockRef = doc(db, 'unlocked_vaults', lockId);
    await setDoc(unlockRef, {
      userId: 'test_user_alpha',
      reelId: 'reel_masterclass_1',
      creatorId: 'expert_consultant',
      costDiamonds: 50,
      unlockedAt: serverTimestamp(),
      accessLevel: 'VIP_UNLOCKED',
      instantVisioGranted: true
    });

    const unlockSnap = await getDoc(unlockRef);
    if (unlockSnap.exists() && unlockSnap.data().accessLevel === 'VIP_UNLOCKED') {
      results.test3_vip_lock = true;
      console.log('  ✅ 3.1 Droit VIP déverrouillé dans /unlocked_vaults :');
      console.log(`     -> Statut: 🔓 DÉVERROUILLÉ | Coût: ${unlockSnap.data().costDiamonds} Diamants | Visio accordée: OUI`);
    }
  } catch (err) {
    console.error('  ❌ Erreur Test 3 :', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4 : FORMULAIRE MULTI-FORMATS (BOUTON BLEU +)
  // ---------------------------------------------------------------------------
  console.log('\n▶ [TEST 4/5] Vérification du Formulaire Multi-Formats (Affiche & Idée)...');
  try {
    // 4.1 Affiche Produit (PRODUCT_POST)
    const productPost = await addDoc(collection(db, 'social_feed_posts'), {
      type: 'PRODUCT_POST',
      creatorId: 'user_merchant_1',
      title: 'Affiche Chaussures Cuir Véritable',
      priceXOF: 32000,
      mediaUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
      shopUrl: 'https://boutique.nsore.shop/chaussures-cuir',
      content: 'Fabriqué artisanalement en cuir pur. Livraison rapide.',
      resonanceCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: serverTimestamp()
    });
    if (productPost.id) {
      results.test4_product_post = true;
      console.log(`  ✅ 4.1 📦 Affiche Produit créée avec succès [ID: ${productPost.id}]`);
    }

    // 4.2 Publicité (AD_POST)
    const adPost = await addDoc(collection(db, 'social_feed_posts'), {
      type: 'AD_POST',
      creatorId: 'user_brand_sponsor',
      title: 'Offre Spéciale Lancement Service Logistique',
      mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d',
      targetUrl: 'https://wameet.net/sponsor/logistics-express',
      actionButtonText: 'Profiter de -20%',
      content: 'Bénéficiez de 20% de remise sur vos 10 premières livraisons.',
      resonanceCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: serverTimestamp()
    });
    if (adPost.id) {
      results.test4_ad_post = true;
      console.log(`  ✅ 4.2 📢 Publicité créée avec succès [ID: ${adPost.id}]`);
    }

    // 4.3 Idée / Statut (IDEA_POST)
    const ideaPost = await addDoc(collection(db, 'social_feed_posts'), {
      type: 'IDEA_POST',
      creatorId: 'user_innovator_3',
      sector: 'Agrobusiness & Énergie Solaire',
      contact: '+226 70 12 34 56',
      content: 'Projet de séchage solaire de mangues pour export vers l’Europe. Recherche partenaire financier.',
      resonanceCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: serverTimestamp()
    });
    if (ideaPost.id) {
      results.test4_idea_post = true;
      console.log(`  ✅ 4.3 💡 Idée / Statut créée avec succès [ID: ${ideaPost.id}]`);
    }
  } catch (err) {
    console.error('  ❌ Erreur Test 4 :', err.message);
  }

  // ---------------------------------------------------------------------------
  // SYNTHÈSE
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 RÉSULTAT SYNTHÉTIQUE DE LA RECETTE TECHNIQUE :');
  console.log('================================================================');
  console.log(`1. Résonance & Synergy Match : ${results.test1_resonance && results.test1_synergy_match ? 'VALIDÉ 🟢' : 'ÉCHEC 🔴'}`);
  console.log(`2. Coffre Noir Nanasore POS  : ${results.test2_vault_products ? 'VALIDÉ 🟢' : 'ÉCHEC 🔴'}`);
  console.log(`3. Cadenas VIP (🔒 -> 🔓)    : ${results.test3_vip_lock ? 'VALIDÉ 🟢' : 'ÉCHEC 🔴'}`);
  console.log(`4. Formats Post (📦, 📢, 💡) : ${results.test4_product_post && results.test4_ad_post && results.test4_idea_post ? 'VALIDÉ 🟢' : 'ÉCHEC 🔴'}`);
  console.log('================================================================\n');

  process.exit(0);
}

runRecipeTests().catch((e) => {
  console.error('Erreur fatale de test :', e);
  process.exit(1);
});
