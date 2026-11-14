// Scripts Firebase Compat pour Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuration Firebase nanasore
firebase.initializeApp({
  apiKey: "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: "nanasore.firebaseapp.com",
  projectId: "nanasore",
  storageBucket: "nanasore.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494"
});

const messaging = firebase.messaging();

// Gestionnaire des notifications FCM en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Push reçu en arrière-plan :', payload);
  const title = payload.notification?.title || payload.data?.title || 'NaNa Studio';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || '/icon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

// Écouteur de clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
