// index.js
// Archivo simplificado - SOLO registra el Service Worker

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            console.log('📱 Intentando registrar Service Worker...');
            
            // Registrar el Service Worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/' // El alcance del SW (toda la aplicación)
            });
            
            console.log('✅ Service Worker registrado exitosamente:', registration.scope);
            
            // Opcional: Manejar actualizaciones (puedes comentar si no lo necesitas)
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nuevo Service Worker detectado');
            });
            
            return registration;
            
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
        }
    } else {
        console.log('ℹ️ Service Workers no soportados en este navegador');
    }
}

// Iniciar el registro cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
    registerServiceWorker();
}
