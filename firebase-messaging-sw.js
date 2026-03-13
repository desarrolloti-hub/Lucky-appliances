// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCshx_L8LxIL0PCp71kIbztppgh_ngXSq0",
    authDomain: "lucky-appliances.firebaseapp.com",
    projectId: "lucky-appliances",
    storageBucket: "lucky-appliances.firebasestorage.app",
    messagingSenderId: "72948063957",
    appId: "1:72948063957:web:0118d92ba1d78c7c788c5c",
    measurementId: "G-QMVW9NR9WZ"
};

// Inicializar Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('Recibida notificación en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || 'Lucky Appliances';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: '/assets/icons/Logo Lucky Apliances.png',
        badge: '/badge-72x72.png',
        data: payload.data,
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ],
        vibrate: [200, 100, 200],
        timestamp: Date.now()
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en las notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                for (let client of windowClients) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});