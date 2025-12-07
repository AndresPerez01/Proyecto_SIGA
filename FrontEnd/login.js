/* ======================== CONFIGURACIÓN API ======================== */
const API_URL = 'http://localhost:5017/api';

/* ======================== ELEMENTOS DEL DOM ======================== */
const loginBtn = document.getElementById('loginBtn');
const roleSelect = document.getElementById('roleSelect');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

/* ======================== EVENT LISTENERS ======================== */
loginBtn.addEventListener('click', handleLogin);

passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

// Verificar si ya hay sesión activa al cargar la página
window.addEventListener('load', verificarSesionActiva);

/* ======================== FUNCIÓN DE LOGIN ======================== */
async function handleLogin() {
    const role = roleSelect.value;
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Validaciones
    if (!role) {
        mostrarAlerta('Por favor seleccione un rol', 'warning');
        roleSelect.focus();
        return;
    }
    
    if (!username) {
        mostrarAlerta('Por favor ingrese su correo electrónico', 'warning');
        usernameInput.focus();
        return;
    }
    
    if (!password) {
        mostrarAlerta('Por favor ingrese su contraseña', 'warning');
        passwordInput.focus();
        return;
    }
    
    // Validar formato de correo
    if (!validarEmail(username)) {
        mostrarAlerta('Por favor ingrese un correo electrónico válido', 'warning');
        usernameInput.focus();
        return;
    }
    
    // Deshabilitar botón mientras se procesa
    loginBtn.disabled = true;
    loginBtn.textContent = 'Iniciando sesión...';
    
    try {
        // Hacer petición al backend
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Login exitoso - guardar datos del usuario
            const userData = {
                idUsuario: data.usuario.idUsuario,
                uuidUsuario: data.usuario.uuidUsuario,
                username: data.usuario.nombreCompleto,
                nombre: data.usuario.nombre,
                apellido: data.usuario.apellido,
                correo: data.usuario.correo,
                role: role,
                idRol: data.usuario.idRol,
                nombreRol: data.usuario.rol,
                loginTime: new Date().toISOString()
            };
            
            // Guardar en localStorage
            localStorage.setItem('usuario', JSON.stringify(userData));
            
            // Mostrar mensaje de éxito
            mostrarAlerta('¡Bienvenido! Redirigiendo...', 'success');
            
            // Pequeño delay para mostrar el mensaje
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Redirigir según el rol
            redirigirPorRol(role);
        } else {
            // Login fallido
            mostrarAlerta(data.message || 'Credenciales inválidas. Por favor verifique sus datos.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
            
            // Limpiar contraseña por seguridad
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        mostrarAlerta('Error al conectar con el servidor. Por favor verifique que el backend esté ejecutándose.', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
    }
}

/* ======================== VERIFICAR SESIÓN ACTIVA ======================== */
function verificarSesionActiva() {
    // SOLO verificar sesión si NO estamos en la página de login
    // Esto evita que redirija automáticamente sin haber iniciado sesión
    const esPaginaLogin = window.location.pathname.endsWith('index.html') || 
                          window.location.pathname === '/' || 
                          window.location.pathname.endsWith('/');
    
    if (!esPaginaLogin) {
        // Estamos en una página protegida, verificar sesión
        const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
        
        if (!usuario || !usuario.uuidUsuario) {
            // No hay sesión, redirigir al login
            window.location.href = '/index.html';
        }
    }
}

/* ======================== REDIRECCIÓN POR ROL ======================== */
function redirigirPorRol(role) {
    switch(role.toLowerCase()) {
        case 'director':
            window.location.href = 'director/director.html';
            break;
        case 'profesor':
            window.location.href = 'profesor/profesor.html';
            break;
        case 'estudiante':
            window.location.href = 'estudiante/estudiante.html';
            break;
        case 'administrador':
            window.location.href = 'administrador/administrador.html';
            break;
        default:
            mostrarAlerta('Rol no válido', 'error');
    }
}

/* ======================== VALIDAR EMAIL ======================== */
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/* ======================== MOSTRAR ALERTAS ======================== */
function mostrarAlerta(mensaje, tipo = 'info') {
    // Tipos: success, error, warning, info
    
    // Remover alertas anteriores
    const alertaAnterior = document.querySelector('.alerta-login');
    if (alertaAnterior) {
        alertaAnterior.remove();
    }
    
    // Crear nueva alerta
    const alerta = document.createElement('div');
    alerta.className = `alerta-login alerta-${tipo}`;
    alerta.textContent = mensaje;
    
    // Insertar antes del formulario
    const contenedor = document.querySelector('.login-container') || document.body;
    contenedor.insertBefore(alerta, contenedor.firstChild);
    
    // Animación de entrada
    setTimeout(() => alerta.classList.add('visible'), 10);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alerta.classList.remove('visible');
        setTimeout(() => alerta.remove(), 300);
    }, 5000);
}