/* ------------------------ CONFIGURACIÓN API ------------------------ */
const API_URL = 'http://localhost:5017/api'; // Ajusta el puerto según tu configuración

/* ------------------------ ELEMENTOS DEL DOM ------------------------ */
const loginBtn = document.getElementById('loginBtn');
const roleSelect = document.getElementById('roleSelect');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

/* ------------------------ EVENT LISTENERS ------------------------ */
loginBtn.addEventListener('click', handleLogin);

passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

/* ------------------------ FUNCIÓN DE LOGIN ------------------------ */
async function handleLogin() {
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
                username: data.usuario.nombreCompleto,
                nombre: data.usuario.nombre,
                apellido: data.usuario.apellido,
                correo: data.usuario.correo,
                role: role,
                idRol: data.usuario.idRol,
                nombreRol: data.usuario.rol,
                loginTime: new Date().toISOString()
            };
            
            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            // Redirigir según el rol
            switch(role) {
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
                    window.location.href = 'administrador.html';
                    break;
                default:
                    alert('Rol no válido');
            }
        } else {
            // Login fallido
            alert(data.message || 'Credenciales inválidas. Por favor verifique sus datos.');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar Sesión';
        }
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        alert('Error al conectar con el servidor. Por favor verifique que el backend esté ejecutándose.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
    }
}