// register-sw.js
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            console.log('📱 Intentando registrar Service Worker...');
            
            // Registrar el Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/' // El alcance del SW (toda la aplicación)
            });
            
            console.log('✅ Service Worker registrado exitosamente:', registration.scope);
            
            // Manejar actualizaciones del SW
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nuevo Service Worker detectado');
                
                newWorker.addEventListener('statechange', () => {
                    console.log('📊 Estado del SW:', newWorker.state);
                    
                    // Si el nuevo SW está instalado y esperando
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification(registration);
                    }
                });
            });
            
            // Verificar si hay una actualización cada hora
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000); // 1 hora
            
            return registration;
            
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
            throw error;
        }
    } else {
        console.log('ℹ️ Service Workers no soportados en este navegador');
        return null;
    }
}

// Mostrar notificación de actualización disponible
function showUpdateNotification(registration) {
    // Crear notificación de actualización
    const updateDiv = document.createElement('div');
    updateDiv.id = 'sw-update-notification';
    updateDiv.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #2196F3;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
            animation: slideUp 0.3s ease;
            max-width: 400px;
        ">
            <div style="font-size: 24px;">🔄</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 4px;">¡Nueva versión disponible!</div>
                <div style="font-size: 14px; opacity: 0.9;">Actualiza para disfrutar las últimas mejoras</div>
            </div>
            <button onclick="updateSW()" style="
                background: white;
                color: #2196F3;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                border: none;
                transition: transform 0.2s;
            ">Actualizar</button>
        </div>
    `;
    
    document.body.appendChild(updateDiv);
    
    // Función global para actualizar
    window.updateSW = () => {
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        updateDiv.remove();
    };
    
    // Auto-cerrar después de 30 segundos
    setTimeout(() => {
        if (updateDiv.parentElement) {
            updateDiv.remove();
        }
    }, 30000);
}

export async function setupNotifications() {
    try {
        // Esperar a que el SW esté listo
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker listo para notificaciones');
        
        // Verificar soporte de notificaciones
        if (!('Notification' in window)) {
            console.log('ℹ️ Notificaciones no soportadas');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error configurando notificaciones:', error);
        return false;
    }
}