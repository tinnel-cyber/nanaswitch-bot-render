import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

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

async function cleanFirestore() {
  console.log('Authenticating as SuperAdmin (admin@nanasore.com)...');
  await signInWithEmailAndPassword(auth, 'admin@nanasore.com', 'AdminSuper123!');
  console.log('Authenticated successfully as:', auth.currentUser.email);

  console.log('\n======================================================');
  console.log('1. NETTOYAGE DE LA COLLECTION "tenants"');
  console.log('(Ne conserver QUE de vrais domaines personnalisés externes)');
  console.log('======================================================');
  const tenantsSnap = await getDocs(collection(db, 'tenants'));
  console.log(`Nombre total de docs dans "tenants": ${tenantsSnap.size}`);

  for (const d of tenantsSnap.docs) {
    const id = d.id;
    const data = d.data();
    // Tout document lié aux anciens sous-domaines .nanasore.com ou aux slugs internes (/f/...) n'est pas un domaine externe
    const isSubdomain = id.includes('.nanasore.com') || id.includes('.nsore.shop');
    const isInternalSlug = ['ecouteur', 'pous', 'pous-masterclass'].includes(id);
    const hasNanasoreDomain = typeof data.customDomain === 'string' && (data.customDomain.includes('.nanasore.com') || data.customDomain.includes('.nsore.shop'));

    if (isSubdomain || isInternalSlug || hasNanasoreDomain) {
      console.log(`[DELETE] Suppression du tenant superflu / sous-domaine: tenants/${id}`);
      await deleteDoc(doc(db, 'tenants', id));
    } else {
      console.log(`[KEEP] Domaine personnalisé externe conservé: tenants/${id}`);
    }
  }

  console.log('\n======================================================');
  console.log('2. STANDARDISATION DE LA COLLECTION "funnels"');
  console.log('(Accessible directement par doc(db, "funnels", slug))');
  console.log('======================================================');
  const funnelsSnap = await getDocs(collection(db, 'funnels'));
  console.log(`Nombre total de docs dans "funnels": ${funnelsSnap.size}`);

  for (const d of funnelsSnap.docs) {
    const id = d.id;
    const data = d.data();

    if (id.includes('.nanasore.com') || id.includes('.nsore.shop') || id.includes('.localhost')) {
      console.log(`[DELETE] Suppression du doublon sous-domaine: funnels/${id}`);
      await deleteDoc(doc(db, 'funnels', id));
    } else {
      console.log(`[KEEP] Tunnel unifié conservé: funnels/${id}`);
      // Nettoyage de la valeur customDomain si elle pointait vers un sous-domaine .nanasore.com
      if (typeof data.customDomain === 'string' && (data.customDomain.includes('.nanasore.com') || data.customDomain.includes('.nsore.shop'))) {
        console.log(`  -> Nettoyage du champ customDomain obsolète sur funnels/${id}`);
        await updateDoc(doc(db, 'funnels', id), {
          customDomain: null,
          updatedAt: Date.now()
        });
      }
    }
  }

  console.log('\n======================================================');
  console.log('3. STANDARDISATION DE LA COLLECTION "deals"');
  console.log('(Accessible directement par doc(db, "deals", slug))');
  console.log('======================================================');
  const dealsSnap = await getDocs(collection(db, 'deals'));
  console.log(`Nombre total de docs dans "deals": ${dealsSnap.size}`);

  for (const d of dealsSnap.docs) {
    const id = d.id;
    const data = d.data();

    if (id.includes('.nanasore.com') || id.includes('.nsore.shop') || id.includes('.localhost')) {
      console.log(`[DELETE] Suppression du doublon sous-domaine: deals/${id}`);
      await deleteDoc(doc(db, 'deals', id));
    } else {
      console.log(`[KEEP] Offre unifiée conservée: deals/${id}`);
      if (typeof data.customDomain === 'string' && (data.customDomain.includes('.nanasore.com') || data.customDomain.includes('.nsore.shop'))) {
        console.log(`  -> Nettoyage du champ customDomain obsolète sur deals/${id}`);
        await updateDoc(doc(db, 'deals', id), {
          customDomain: null,
          updatedAt: Date.now()
        });
      }
    }
  }

  console.log('\n======================================================');
  console.log('INVENTAIRE FINAL APRÈS PURGE ET STANDARDISATION');
  console.log('======================================================');
  const finalTenants = await getDocs(collection(db, 'tenants'));
  console.log(`\nCollection tenants (${finalTenants.size} doc):`);
  finalTenants.docs.forEach(d => console.log(`  - ID: "${d.id}" | customDomain: "${d.data().customDomain}"`));

  const finalFunnels = await getDocs(collection(db, 'funnels'));
  console.log(`\nCollection funnels (${finalFunnels.size} docs standardisés par slug):`);
  finalFunnels.docs.forEach(d => console.log(`  - ID: "${d.id}" | slug: "${d.data().slug}" | title: "${d.data().title || d.data().funnelTitle}"`));

  const finalDeals = await getDocs(collection(db, 'deals'));
  console.log(`\nCollection deals (${finalDeals.size} docs standardisés par slug):`);
  finalDeals.docs.forEach(d => console.log(`  - ID: "${d.id}" | slug: "${d.data().slug}" | title: "${d.data().title}"`));

  console.log('\n=== NETTOYAGE ET STANDARDISATION TERMINÉS AVEC SUCCÈS ===');
  process.exit(0);
}

cleanFirestore().catch(err => {
  console.error('Erreur durant le nettoyage Firestore:', err);
  process.exit(1);
});
