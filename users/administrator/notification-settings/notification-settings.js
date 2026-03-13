import { auth, db } from '/config/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { requestNotificationPermission, onMessageListener, checkNotificationStatus } from '/fcm.js';

// ====== FUNCIONES DE LOCALSTORAGE ======
function getUserFromStorage() {
    try {
        const localUser = localStorage.getItem('user');
        if (localUser) {
            return JSON.parse(localUser);
        }
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            return JSON.parse(sessionUser);
        }
        return null;
    } catch (error) {
        console.error('Error leyendo datos del storage:', error);
        return null;
    }
}

function saveTokenToStorage(token) {
    try {
        const userData = getUserFromStorage() || {};
        userData.fcmToken = token;
        userData.notificationsEnabled = true;
        userData.notificationsUpdatedAt = new Date().toISOString();
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ Token guardado en localStorage');
    } catch (error) {
        console.error('Error guardando token en storage:', error);
    }
}

function removeTokenFromStorage() {
    try {
        const userData = getUserFromStorage() || {};
        delete userData.fcmToken;
        userData.notificationsEnabled = false;
        userData.notificationsUpdatedAt = new Date().toISOString();
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ Token eliminado de localStorage');
    } catch (error) {
        console.error('Error eliminando token de storage:', error);
    }
}

function getTokenFromStorage() {
    const userData = getUserFromStorage();
    return userData?.fcmToken || null;
}

function areNotificationsEnabledInStorage() {
    const userData = getUserFromStorage();
    return userData?.notificationsEnabled || false;
}

// ====== ESTADO GLOBAL ======
let currentUser = null;
let userData = null;
let fcmToken = null;

// Elementos del DOM
const userInfo = document.getElementById('userInfo');
const notificationStatus = document.getElementById('notificationStatus');
const notificationToggle = document.getElementById('notificationToggle');
const tokenDisplay = document.getElementById('tokenDisplay');
const copyTokenBtn = document.getElementById('copyTokenBtn');
const deleteTokenBtn = document.getElementById('deleteTokenBtn');
const recentActivity = document.getElementById('recentActivity');

// ====== FUNCIONES PRINCIPALES ======
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        const localUser = getUserFromStorage();
        
        userInfo.innerHTML = `
            <i class="fas fa-user"></i> 
            ${localUser?.displayName || user.displayName || 'Usuario'} 
            (${localUser?.email || user.email})
        `;

        await loadUserData(user.uid);
        await initializeNotificationState();
        await loadRecentActivity(user.uid);
    } else {
        window.location.href = '/login.html';
    }
});

async function loadUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
        } else {
            userData = {
                uid: uid,
                email: currentUser.email,
                displayName: currentUser.displayName || '',
                fcmToken: null,
                notificationsEnabled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', uid), userData);
        }
        
        // Sincronizar localStorage con Firestore si es necesario
        const storedToken = getTokenFromStorage();
        const storedEnabled = areNotificationsEnabledInStorage();
        
        if (storedToken && !userData.fcmToken) {
            await updateDoc(doc(db, 'users', uid), {
                fcmToken: storedToken,
                notificationsEnabled: storedEnabled,
                updatedAt: new Date().toISOString()
            });
            userData.fcmToken = storedToken;
            userData.notificationsEnabled = storedEnabled;
        }
        
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
    }
}

async function initializeNotificationState() {
    try {
        const status = await checkNotificationStatus();
        const storedToken = getTokenFromStorage();
        const storedEnabled = areNotificationsEnabledInStorage();
        
        // Priorizar localStorage
        const hasToken = storedToken || userData?.fcmToken || false;
        
        notificationToggle.checked = (storedEnabled || userData?.notificationsEnabled) && status === 'granted';
        
        if (storedToken) {
            fcmToken = storedToken;
            tokenDisplay.textContent = storedToken;
            copyTokenBtn.disabled = false;
            deleteTokenBtn.disabled = false;
        } else if (userData?.fcmToken) {
            fcmToken = userData.fcmToken;
            tokenDisplay.textContent = userData.fcmToken;
            copyTokenBtn.disabled = false;
            deleteTokenBtn.disabled = false;
        } else {
            tokenDisplay.textContent = 'No token generated yet';
            copyTokenBtn.disabled = true;
            deleteTokenBtn.disabled = true;
        }

        updateNotificationStatus(status, hasToken);
        
    } catch (error) {
        console.error('Error inicializando estado:', error);
    }
}

function updateNotificationStatus(permission, hasToken) {
    let icon = '', title = '', description = '', className = '';
    
    if (permission === 'granted' && hasToken) {
        icon = '<i class="fas fa-check-circle"></i>';
        title = 'Notifications are active';
        description = 'You will receive real-time updates and offers';
        className = 'active';
    } else if (permission === 'denied') {
        icon = '<i class="fas fa-ban"></i>';
        title = 'Notifications are blocked';
        description = 'Please enable notifications in your browser settings';
        className = 'blocked';
    } else {
        icon = '<i class="fas fa-bell-slash"></i>';
        title = 'Notifications are inactive';
        description = 'Enable notifications to stay updated with the latest news';
        className = 'inactive';
    }
    
    notificationStatus.innerHTML = `
        <div class="status-section ${className}">
            <div class="status-icon ${className}">
                ${icon}
            </div>
            <div class="status-content">
                <div class="status-title">${title}</div>
                <div class="status-description">${description}</div>
            </div>
        </div>
    `;
}

notificationToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    if (enabled) {
        await enableNotifications();
    } else {
        await disableNotifications();
    }
});

async function enableNotifications() {
    try {
        Swal.fire({
            title: 'Activando notificaciones...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
        
        const token = await requestNotificationPermission();
        
        if (token) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                fcmToken: token,
                notificationsEnabled: true,
                updatedAt: new Date().toISOString()
            });
            
            saveTokenToStorage(token);
            
            fcmToken = token;
            tokenDisplay.textContent = token;
            copyTokenBtn.disabled = false;
            deleteTokenBtn.disabled = false;
            
            await saveNotificationActivity('enabled', 'Notifications enabled successfully');
            updateNotificationStatus('granted', true);
            
            Swal.fire({
                icon: 'success',
                title: '¡Notificaciones activadas!',
                text: 'Ahora recibirás actualizaciones en tiempo real',
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            notificationToggle.checked = false;
            Swal.fire({
                icon: 'error',
                title: 'No se pudo activar',
                text: 'Por favor, permite las notificaciones en tu navegador',
                confirmButtonColor: '#0a2540'
            });
        }
    } catch (error) {
        console.error('Error activando notificaciones:', error);
        notificationToggle.checked = false;
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al activar las notificaciones',
            confirmButtonColor: '#0a2540'
        });
    } finally {
        Swal.close();
    }
}

async function disableNotifications() {
    try {
        const result = await Swal.fire({
            title: '¿Desactivar notificaciones?',
            text: 'Dejarás de recibir actualizaciones importantes',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Desactivando notificaciones...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });
            
            await updateDoc(doc(db, 'users', currentUser.uid), {
                fcmToken: null,
                notificationsEnabled: false,
                updatedAt: new Date().toISOString()
            });
            
            removeTokenFromStorage();
            
            fcmToken = null;
            tokenDisplay.textContent = 'No token generated yet';
            copyTokenBtn.disabled = true;
            deleteTokenBtn.disabled = true;
            
            await saveNotificationActivity('disabled', 'Notifications disabled');
            updateNotificationStatus(await checkNotificationStatus(), false);
            
            Swal.fire({
                icon: 'success',
                title: 'Notificaciones desactivadas',
                text: 'Puedes volver a activarlas cuando quieras',
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            notificationToggle.checked = true;
        }
    } catch (error) {
        console.error('Error desactivando notificaciones:', error);
        notificationToggle.checked = true;
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al desactivar las notificaciones',
            confirmButtonColor: '#0a2540'
        });
    } finally {
        Swal.close();
    }
}

copyTokenBtn.addEventListener('click', () => {
    if (fcmToken) {
        navigator.clipboard.writeText(fcmToken).then(() => {
            Swal.fire({
                icon: 'success',
                title: '¡Copiado!',
                text: 'Token copiado al portapapeles',
                timer: 2000,
                showConfirmButton: false
            });
        }).catch(() => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo copiar el token',
                confirmButtonColor: '#0a2540'
            });
        });
    }
});

deleteTokenBtn.addEventListener('click', async () => {
    if (!fcmToken) return;
    
    const result = await Swal.fire({
        title: '¿Eliminar token?',
        text: 'Esto desactivará las notificaciones en este dispositivo',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({
                title: 'Eliminando token...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });
            
            await updateDoc(doc(db, 'users', currentUser.uid), {
                fcmToken: null,
                notificationsEnabled: false,
                updatedAt: new Date().toISOString()
            });
            
            removeTokenFromStorage();
            
            fcmToken = null;
            tokenDisplay.textContent = 'No token generated yet';
            copyTokenBtn.disabled = true;
            deleteTokenBtn.disabled = true;
            notificationToggle.checked = false;
            
            await saveNotificationActivity('token_deleted', 'Notification token deleted');
            updateNotificationStatus(await checkNotificationStatus(), false);
            
            Swal.fire({
                icon: 'success',
                title: 'Token eliminado',
                text: 'Las notificaciones han sido desactivadas',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error eliminando token:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el token',
                confirmButtonColor: '#0a2540'
            });
        } finally {
            Swal.close();
        }
    }
});

// Guardar actividad - SIN ÍNDICE
async function saveNotificationActivity(action, details) {
    try {
        // Guardar sin ordenamiento complicado
        await addDoc(collection(db, 'notification_activity'), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform
        });
    } catch (error) {
        console.error('Error guardando actividad:', error);
    }
}

// Cargar actividad - SIN ÍNDICE
async function loadRecentActivity(uid) {
    try {
        // SOLO EL WHERE, SIN ORDER BY - así no necesita índice
        const q = query(
            collection(db, 'notification_activity'),
            where('userId', '==', uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            recentActivity.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell"></i>
                    <h3>No recent activity</h3>
                    <p>Your notification activity will appear here</p>
                </div>
            `;
            return;
        }

        // Ordenar manualmente en JavaScript
        let activities = [];
        querySnapshot.forEach((doc) => {
            activities.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordenar por timestamp (más reciente primero)
        activities.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });
        
        // Solo los últimos 5
        activities = activities.slice(0, 5);

        let html = '';
        activities.forEach((data) => {
            const date = new Date(data.timestamp);
            const timeAgo = getTimeAgo(date);
            
            let icon = 'fa-bell';
            if (data.action?.includes('enable')) icon = 'fa-check-circle';
            else if (data.action?.includes('disable')) icon = 'fa-ban';
            else if (data.action?.includes('delete')) icon = 'fa-trash';
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${data.details || 'Actividad'}</div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        });
        
        recentActivity.innerHTML = html;
    } catch (error) {
        console.error('Error cargando actividad:', error);
        recentActivity.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading activity</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#0a2540'
    });
}

// Escuchar mensajes en primer plano
onMessageListener().then((payload) => {
    console.log('Mensaje recibido:', payload);
    
    Swal.fire({
        icon: 'info',
        title: payload.notification?.title || 'Nueva notificación',
        text: payload.notification?.body || '',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true
    });
    
    if (currentUser) {
        loadRecentActivity(currentUser.uid);
    }
});