// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDNpBEwRpJ4qHd-WuW8_4iA3vGgT2NEdjg",
  authDomain: "kolekkita.firebaseapp.com",
  projectId: "kolekkita",
  storageBucket: "kolekkita.firebasestorage.app",
  messagingSenderId: "606427939452",
  appId: "1:606427939452:web:25f650d0a2a86403367ff9",
  measurementId: "G-3EQML2DNQ5"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png', // Add your app icon
    badge: '/badge-72x72.png', // Add a badge icon
    tag: payload.data?.notificationId || 'default',
    requireInteraction: false,
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.', event);
  
  event.notification.close();
  
  // Open or focus the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});
