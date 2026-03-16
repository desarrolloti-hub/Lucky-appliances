// login.js - Lógica de inicio de sesión con almacenamiento en localStorage
import { auth } from '/config/firebase-config.js';
import { 
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { db } from '/config/firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Variables globales
let isSubmitting = false;

// Rutas según rol
const ROUTES = {
    ADMIN: '/users/administrator/dashAdmin/dashAdmin.html',
    COLLABORATOR: '/users/collaborator/dashboardGeneral/dashboardGeneral.html'
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Login page initialized');
        
        // Verificar si ya está autenticado
        await checkAuthStatus();
        
        // Configurar event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing login:', error);
        showError('Error initializing login. Please refresh the page.');
    }
});

// Configurar event listeners
function setupEventListeners() {
    const form = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');
    const submitBtn = document.getElementById('submitBtn');
    const forgotLink = document.getElementById('forgotPasswordLink');
    
    // Cargar credenciales guardadas si existen
    loadSavedCredentials();
    
    // Alternar visibilidad de contraseña
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    // Validación en tiempo real
    if (emailInput) {
        emailInput.addEventListener('blur', validateEmail);
        emailInput.addEventListener('input', clearFieldError);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', validatePassword);
        passwordInput.addEventListener('input', clearFieldError);
    }
    
    // Envío del formulario
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
    
    // Prevenir múltiples envíos
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            if (isSubmitting) {
                e.preventDefault();
            }
        });
    }
    
    // Forgot password link
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            showForgotPasswordDialog();
        });
    }
}

// Cargar credenciales guardadas
function loadSavedCredentials() {
    const savedCredentials = JSON.parse(localStorage.getItem('savedCredentials') || '{}');
    const rememberMe = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');
    
    if (savedCredentials.email && savedCredentials.remember) {
        if (emailInput) emailInput.value = savedCredentials.email;
        if (rememberMe) rememberMe.checked = true;
    }
}

// Guardar credenciales
function saveCredentials(email, remember) {
    if (remember) {
        localStorage.setItem('savedCredentials', JSON.stringify({
            email: email,
            remember: true
        }));
    } else {
        localStorage.removeItem('savedCredentials');
    }
}

// Validar email
function validateEmail() {
    const emailInput = document.getElementById('email');
    const errorElement = document.getElementById('emailError');
    
    if (!emailInput || !errorElement) return true;
    
    emailInput.classList.remove('error', 'success');
    errorElement.textContent = '';
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showFieldError(emailInput, 'Email is required');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showFieldError(emailInput, 'Please enter a valid email address');
        return false;
    }
    
    emailInput.classList.add('success');
    return true;
}

// Validar contraseña
function validatePassword() {
    const passwordInput = document.getElementById('password');
    const errorElement = document.getElementById('passwordError');
    
    if (!passwordInput || !errorElement) return true;
    
    passwordInput.classList.remove('error', 'success');
    errorElement.textContent = '';
    
    const password = passwordInput.value;
    
    if (!password) {
        showFieldError(passwordInput, 'Password is required');
        return false;
    }
    
    passwordInput.classList.add('success');
    return true;
}

// Validar formulario completo
function validateForm() {
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    
    return emailValid && passwordValid;
}

// Obtener ruta según rol
function getRouteByRole(role) {
    if (!role) {
        return null; // Usuario sin rol
    }
    
    const roleLower = role.toLowerCase();
    
    if (roleLower === 'admin') {
        return ROUTES.ADMIN;
    } else {
        return ROUTES.COLLABORATOR; // Cualquier otro rol va a collaborator
    }
}

// Manejar inicio de sesión con email/contraseña
async function handleLogin(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validar formulario
    if (!validateForm()) {
        return;
    }
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Configurar estado de envío
    setSubmittingState(true);
    
    try {
        // Iniciar sesión con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Login successful:', user.uid);
        
        // Obtener datos adicionales del usuario de Firestore
        const userData = await fetchUserData(user.uid);
        
        // Verificar si el usuario está activo
        if (userData) {
            // Si el campo active existe y es false, mostrar error
            if (userData.active !== undefined && userData.active === false) {
                // Cerrar sesión de Firebase ya que la cuenta está deshabilitada
                await auth.signOut();
                
                // Mostrar mensaje de error
                await Swal.fire({
                    icon: 'error',
                    title: '<div style="color: #dc3545;"><i class="fas fa-user-slash"></i> Account Disabled</div>',
                    html: `
                        <div style="text-align: center; padding: 10px 0;">
                            <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                Your account has been disabled.
                            </p>
                            <p style="color: #6c757d; font-size: 0.85rem;">
                                <i class="fas fa-info-circle"></i> 
                                Please contact your administrator for assistance.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f5d742',
                    showCancelButton: false
                });
                
                // Limpiar localStorage por seguridad
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('adminUser');
                
                setSubmittingState(false);
                return;
            }
            
            // VERIFICAR SI EL USUARIO TIENE ROL
            if (!userData.role) {
                // Usuario sin rol - cerrar sesión y mostrar error
                await auth.signOut();
                
                await Swal.fire({
                    icon: 'error',
                    title: '<div style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Access Denied</div>',
                    html: `
                        <div style="text-align: center; padding: 10px 0;">
                            <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                Your account does not have an assigned role.
                            </p>
                            <p style="color: #6c757d; font-size: 0.85rem;">
                                <i class="fas fa-info-circle"></i> 
                                Please contact your administrator to assign you a role.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f5d742',
                    showCancelButton: false
                });
                
                // Limpiar localStorage por seguridad
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('adminUser');
                
                setSubmittingState(false);
                return;
            }
        } else {
            // Usuario no existe en Firestore - cerrar sesión y mostrar error
            await auth.signOut();
            
            await Swal.fire({
                icon: 'error',
                title: '<div style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Account Not Found</div>',
                html: `
                    <div style="text-align: center; padding: 10px 0;">
                        <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                            Your account is not properly configured in the system.
                        </p>
                        <p style="color: #6c757d; font-size: 0.85rem;">
                            <i class="fas fa-info-circle"></i> 
                            Please contact your administrator for assistance.
                        </p>
                    </div>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#f5d742',
                showCancelButton: false
            });
            
            // Limpiar localStorage por seguridad
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('adminUser');
            
            setSubmittingState(false);
            return;
        }
        
        // Determinar ruta según el rol
        const destinationRoute = getRouteByRole(userData.role);
        
        if (!destinationRoute) {
            // Esto no debería ocurrir porque ya validamos que tenga rol, pero por seguridad
            await auth.signOut();
            
            await Swal.fire({
                icon: 'error',
                title: '<div style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Invalid Role</div>',
                html: `
                    <div style="text-align: center; padding: 10px 0;">
                        <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                            Your account has an invalid role: ${userData.role}
                        </p>
                        <p style="color: #6c757d; font-size: 0.85rem;">
                            <i class="fas fa-info-circle"></i> 
                            Please contact your administrator.
                        </p>
                    </div>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#f5d742',
                showCancelButton: false
            });
            
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('adminUser');
            
            setSubmittingState(false);
            return;
        }
        
        // Guardar datos del usuario en localStorage
        saveUserToLocalStorage(user, userData);
        
        // Guardar credenciales si se seleccionó "Remember me"
        saveCredentials(email, rememberMe);
        
        // Actualizar último login en Firestore
        await updateLastLogin(user.uid);
        
        // Mostrar mensaje de éxito con el rol
        const roleDisplay = userData.role === 'admin' ? 'Administrator' : 'Collaborator';
        showSuccess(`Login successful! Redirecting to ${roleDisplay} dashboard...`);
        
        // Redirigir según el rol después de 1.5 segundos
        setTimeout(() => {
            window.location.href = destinationRoute;
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error);
    } finally {
        setSubmittingState(false);
    }
}

// Obtener datos del usuario desde Firestore
async function fetchUserData(userId) {
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('User data from Firestore:', {
                id: userDoc.id,
                fullName: data.fullName,
                photo: data.photo ? 'base64 string present' : 'not present',
                active: data.active,
                email: data.email,
                role: data.role
            });
            return data;
        } else {
            console.log('No user data found in Firestore for ID:', userId);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// Guardar usuario en localStorage
function saveUserToLocalStorage(user, userData = null) {
    try {
        const userInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            providerData: user.providerData.map(provider => ({
                providerId: provider.providerId,
                email: provider.email,
                displayName: provider.displayName,
                photoURL: provider.photoURL
            })),
            metadata: {
                creationTime: user.metadata.creationTime,
                lastSignInTime: user.metadata.lastSignInTime
            },
            lastLogin: new Date().toISOString(),
            // Datos adicionales de Firestore
            fullName: userData?.fullName || user.displayName || user.email.split('@')[0],
            photo: userData?.photo || user.photoURL || null,
            active: userData?.active !== false,
            role: userData?.role || null // Guardar el rol explícitamente
        };
        
        // Guardar en localStorage con DOS CLAVES para compatibilidad
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
        localStorage.setItem('isLoggedIn', 'true');
        
        // También guardar como 'adminUser' para que el navbar lo pueda leer
        localStorage.setItem('adminUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: userInfo.fullName,
            photoURL: userInfo.photo,
            fullName: userInfo.fullName,
            photo: userInfo.photo,
            role: userInfo.role // Incluir rol también aquí
        }));
        
        console.log('User saved to localStorage with role:', userInfo.role);
        
    } catch (error) {
        console.error('Error saving user to localStorage:', error);
    }
}

// Actualizar último login en Firestore
async function updateLastLogin(userId) {
    try {
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log('Last login updated for user:', userId);
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Manejar errores de login
function handleLoginError(error) {
    let errorMessage = 'Login failed. Please try again.';
    
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
        case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
        case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
        default:
            errorMessage = error.message || 'Login failed.';
    }
    
    showError(errorMessage);
}

// Verificar estado de autenticación
async function checkAuthStatus() {
    try {
        // Verificar si ya está autenticado
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (isLoggedIn) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // Verificar que el usuario aún exista en Firebase y tenga rol
            if (currentUser.uid && auth.currentUser && currentUser.role) {
                console.log('User already logged in with role:', currentUser.role);
                
                // Determinar ruta según el rol guardado
                const destinationRoute = getRouteByRole(currentUser.role);
                
                if (destinationRoute) {
                    // Redirigir al dashboard correspondiente
                    setTimeout(() => {
                        window.location.href = destinationRoute;
                    }, 500);
                } else {
                    // Si no tiene rol válido, limpiar sesión
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('adminUser');
                }
            } else {
                // Si no tiene datos completos, limpiar sesión
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('adminUser');
            }
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

// Mostrar error en campo
function showFieldError(field, message) {
    field.classList.add('error');
    field.classList.remove('success');
    
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }
}

// Limpiar error del campo
function clearFieldError(e) {
    const field = e.target;
    const errorElement = document.getElementById(field.id + 'Error');
    
    if (errorElement) {
        errorElement.textContent = '';
        field.classList.remove('error');
    }
}

// Configurar estado de envío
function setSubmittingState(submitting) {
    isSubmitting = submitting;
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    
    if (submitting) {
        if (submitBtn) submitBtn.disabled = true;
        if (loading) loading.style.display = 'flex';
    } else {
        if (submitBtn) submitBtn.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

// Mostrar notificación de éxito
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: message,
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
    });
}

// Mostrar notificación de error
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
    });
}

// ============ FORGOT PASSWORD FUNCTIONALITY ============

// Show forgot password dialog using SweetAlert2
async function showForgotPasswordDialog() {
    try {
        const { value: email } = await Swal.fire({
            title: '<div style="color: #0a2540;"><i class="fas fa-key"></i> Reset Password</div>',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 20px; color: #666; font-size: 0.95rem;">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">
                            <i class="fas fa-envelope" style="color: #f5d742; margin-right: 5px;"></i> 
                            Email Address
                        </label>
                        <input 
                            type="email" 
                            id="swal-email" 
                            class="swal2-input" 
                            placeholder="Enter your email"
                            required
                            style="width: 100%; padding: 12px 15px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem;"
                            value="${document.getElementById('email')?.value || ''}"
                        >
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-paper-plane"></i> Send Reset Link',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            confirmButtonColor: '#f5d742',
            cancelButtonColor: '#6c757d',
            showLoaderOnConfirm: true,
            preConfirm: () => {
                const emailInput = Swal.getPopup().querySelector('#swal-email');
                const email = emailInput?.value.trim();
                
                if (!email) {
                    Swal.showValidationMessage('Email is required');
                    return false;
                }
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }
                
                return email;
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (email) {
            Swal.fire({
                title: 'Sending reset link...',
                text: 'Please wait while we send the password reset email',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                await sendPasswordResetEmail(auth, email);
                
                Swal.close();
                
                await Swal.fire({
                    icon: 'success',
                    title: '<div style="color: #28a745;"><i class="fas fa-check-circle"></i> Email Sent!</div>',
                    html: `
                        <div style="text-align: center; padding: 10px 0;">
                            <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                If an account exists with the email:
                                <br>
                                <strong style="color: #0a2540;">${email}</strong>
                                <br>
                                you will receive a password reset link shortly.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f5d742',
                    showCancelButton: false,
                    timer: 10000,
                    timerProgressBar: true
                });
                
            } catch (error) {
                console.error('Password reset error:', error);
                Swal.close();
                
                await Swal.fire({
                    icon: 'info',
                    title: '<div style="color: #17a2b8;"><i class="fas fa-info-circle"></i> Check Your Email</div>',
                    html: `
                        <div style="text-align: center; padding: 10px 0;">
                            <p style="color: #666; margin-bottom: 15px; font-size: 0.95rem;">
                                If an account exists with the email you provided, 
                                you should receive a password reset link shortly.
                            </p>
                            <p style="color: #6c757d; font-size: 0.85rem;">
                                <i class="fas fa-lightbulb" style="color: #f5d742;"></i> 
                                <strong>Tip:</strong> Check your spam folder if you don't see the email.
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#f5d742',
                    showCancelButton: false
                });
            }
        }
    } catch (error) {
        console.error('Dialog error:', error);
    }
}

// Función para cerrar sesión (para uso global)
window.logoutUser = async function() {
    try {
        await auth.signOut();
        
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('savedCredentials');
        localStorage.removeItem('pushSubscription');
        localStorage.removeItem('adminUser');
        
        window.location.href = '/visitor/login/login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// Función para obtener usuario actual (para uso global)
window.getCurrentUser = function() {
    try {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};

// Función para verificar autenticación (para uso global)
window.isAuthenticated = function() {
    return localStorage.getItem('isLoggedIn') === 'true' && window.getCurrentUser() !== null;
};

// Función para obtener el rol del usuario actual
window.getUserRole = function() {
    const user = window.getCurrentUser();
    return user?.role || null;
};

// Exportar funciones si se necesita
export { saveUserToLocalStorage, checkAuthStatus };