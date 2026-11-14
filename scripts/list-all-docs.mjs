import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listDocs() {
  for (const col of ['tenants', 'funnels', 'deals']) {
    console.log(`\n=== Collection: ${col} ===`);
    const snap = await getDocs(collection(db, col));
    snap.docs.forEach(d => {
      console.log(` - ID: "${d.id}" | title: "${d.data().title || d.data().storeName || ''}" | customDomain: "${d.data().customDomain || ''}"`);
    });
  }
  process.exit(0);
}

listDocs().catch(console.error);
