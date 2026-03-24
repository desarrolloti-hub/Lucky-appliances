// protect-page-component.js - Script para proteger páginas administrativas
// Uso: <script src="/js/protect-page-component.js" data-module="products"></script>
(function() {
    // Obtener el módulo requerido
    const scripts = document.getElementsByTagName('script');
    let requiredModule = null;
    let alertMessage = 'You do not have permission to access this page.';
    
    // Buscar script con data-module
    for (let script of scripts) {
        if (script.src && script.src.includes('protect-page-component.js')) {
            const module = script.getAttribute('data-module');
            if (module) {
                requiredModule = module;
                alertMessage = script.getAttribute('data-message') || alertMessage;
                break;
            }
        }
    }
    
    if (!requiredModule) return;
    
    let redirected = false;
    
    function loadSweetAlert(callback) {
        if (typeof Swal !== 'undefined') {
            callback();
            return;
        }
        
        const swalScript = document.createElement('script');
        swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        swalScript.onload = callback;
        swalScript.onerror = callback;
        document.head.appendChild(swalScript);
    }
    
    function showLoading() {
        if (document.getElementById('page-protect-loading')) return;
        
        const loadingEl = document.createElement('div');
        loadingEl.id = 'page-protect-loading';
        loadingEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            backdrop-filter: blur(5px);
        `;
        loadingEl.innerHTML = `
            <div style="
                background: white;
                padding: 30px 40px;
                border-radius: 16px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            ">
                <i class="fas fa-spinner fa-spin fa-3x" style="color: #f5d742; margin-bottom: 20px;"></i>
                <p style="color: #333; margin: 0; font-family: 'Poppins', sans-serif;">
                    Verifying permissions...
                </p>
            </div>
        `;
        document.body.appendChild(loadingEl);
        
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
            document.head.appendChild(faLink);
        }
    }
    
    function hideLoading() {
        const loadingEl = document.getElementById('page-protect-loading');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
    
    function redirectToDashboard() {
        if (redirected) return;
        redirected = true;
        
        // Intentar ir a la página anterior
        if (document.referrer && document.referrer.includes(window.location.host)) {
            window.location.href = document.referrer;
        } else {
            // Si no hay página anterior, ir al dashboard
            window.location.href = '/users/collaborator/dashboardGeneral/dashboardGeneral.html';
        }
    }
    
    async function checkPermission() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) throw new Error('No user session');
            
            const currentUser = JSON.parse(userData);
            if (!currentUser.role) throw new Error('User has no role');
            
            showLoading();
            
            const module = await import('../classes/permission.js');
            const PermissionManager = module.PermissionManager;
            
            const permissionManager = new PermissionManager();
            await permissionManager.loadPermissions();
            
            const hasPermission = await permissionManager.checkPermission(currentUser.role, requiredModule);
            
            hideLoading();
            
            if (!hasPermission) {
                // Mostrar mensaje y redirigir después de 3 segundos
                loadSweetAlert(() => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error',
                            title: 'Access Denied',
                            text: alertMessage,
                            timer: 3000,
                            timerProgressBar: true,
                            showConfirmButton: false,
                            allowOutsideClick: false
                        }).then(() => {
                            redirectToDashboard();
                        });
                    } else {
                        // Si no hay SweetAlert, redirigir directamente
                        setTimeout(redirectToDashboard, 3000);
                    }
                });
            }
            
        } catch (error) {
            hideLoading();
            // En caso de error, redirigir directamente
            redirectToDashboard();
        }
    }
    
    // Ejecutar verificación
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPermission);
    } else {
        checkPermission();
    }
})();