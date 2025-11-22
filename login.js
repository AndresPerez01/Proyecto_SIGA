// Elementos del DOM
const loginBtn = document.getElementById('loginBtn');
const roleSelect = document.getElementById('roleSelect');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Event Listener
loginBtn.addEventListener('click', handleLogin);

// Permitir login con Enter
passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// Función de Login
function handleLogin() {
    const role = roleSelect.value;
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Validaciones
    if (!role) {
        alert('Por favor seleccione un rol');
        roleSelect.focus();
        return;
    }
    
    if (!username) {
        alert('Por favor ingrese su usuario');
        usernameInput.focus();
        return;
    }
    
    if (!password) {
        alert('Por favor ingrese su contraseña');
        passwordInput.focus();
        return;
    }
    
    // Guardar datos del usuario en sessionStorage
    const userData = {
        username: username,
        role: role,
        loginTime: new Date().toISOString()
    };
    
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Redirigir según el rol
    switch(role) {
        case 'director':
            window.location.href = 'director.html';
            break;
        case 'profesor':
            window.location.href = 'profesor.html';
            break;
        case 'estudiante':
            alert('Interfaz de Estudiante en desarrollo');
            // window.location.href = 'estudiante.html';
            break;
        case 'administrador':
            alert('Interfaz de Administrador en desarrollo');
            // window.location.href = 'administrador.html';
            break;
        default:
            alert('Rol no válido');
    }
}
