/**
 * @file firebase-admin-fallback.js
 * @description Neutralise les appels d'administration Firebase en environnement autonome
 */

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  admin = {
    apps: [],
    initializeApp: () => ({}),
    credential: {
      cert: () => ({})
    },
    firestore: Object.assign(() => null, {
      FieldValue: {
        serverTimestamp: () => new Date().toISOString(),
        increment: (n) => n,
        arrayUnion: (...items) => items,
        arrayRemove: (...items) => items,
      }
    }),
    auth: () => ({})
  };
}

module.exports = admin;
