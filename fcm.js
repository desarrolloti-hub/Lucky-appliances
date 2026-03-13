// /fcm.js
import { messaging } from '/config/firebase-config.js';
import { getToken, onMessage } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js';

// VAPID Key
const VAPID_KEY = 'BGohEYDtTyAGWfO5NeGrkBAN0D5ik6688GAuCO4htEPaHCwANrcEsxp3Nkjx_KbuPIMEdPV4DvBdsXuSlUdtIEQ';

// Solicitar permiso y obtener token
export async function requestNotificationPermission() {
    try {
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones');
            return null;
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido');
            
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY
            });
            
            console.log('Token FCM:', token);
            return token;
        } else {
            console.log('Permiso de notificaciones denegado');
            return null;
        }
    } catch (error) {
        console.error('Error al obtener permiso/token:', error);
        throw error;
    }
}

// Escuchar mensajes en primer plano
export function onMessageListener() {
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('Mensaje recibido en primer plano:', payload);
            resolve(payload);
        });
    });
}

// Verificar estado de notificaciones
export function checkNotificationStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}