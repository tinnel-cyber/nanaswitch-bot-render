import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "nanasore.firebaseapp.com",
  projectId: "nanasore",
  storageBucket: "nanasore.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToCheck = ['tenants', 'funnels', 'deals', 'stores'];

async function inspectAndClean() {
  console.log('=== INSPECTION ET NETTOYAGE DES DOCUMENTS FIRESTORE ===');

  for (const colName of collectionsToCheck) {
    console.log(`\n--- Collection: ${colName} ---`);
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Nombre total de documents dans '${colName}': ${snap.size}`);

      for (const d of snap.docs) {
        const id = d.id;
        const data = d.data();
        
        // Critères de documents superflus liés aux anciens sous-domaines automatiques :
        // 1. ID contenant '.nanasore.com' ou '.nsore.shop' (ex: pous.nanasore.com)
        // 2. Documents temporaires / espaces orphelins créés par auto-provisioning
        const isSubdomainDoc = id.includes('.nanasore.com') || id.includes('.nsore.shop') || id.includes('.localhost');
        const isTempSpace = id.startsWith('space_') || id.startsWith('temp_') || id.startsWith('sub_');

        if (isSubdomainDoc || isTempSpace) {
          console.log(`[DELETE] Suppression du document superflu: ${colName}/${id}`);
          await deleteDoc(doc(db, colName, id));
        } else {
          console.log(`[KEEP] Document conservé: ${colName}/${id} (slug standard ou domaine personnalisé valide)`);
        }
      }
    } catch (err) {
      console.error(`Erreur sur la collection '${colName}':`, err.message);
    }
  }

  console.log('\n=== NETTOYAGE FIRESTORE TERMINÉ AVEC SUCCÈS ===');
  process.exit(0);
}

inspectAndClean().catch((err) => {
  console.error('Erreur globale:', err);
  process.exit(1);
});
