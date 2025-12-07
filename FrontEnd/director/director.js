const API_URL = 'http://localhost:5017/api';

// Variables globales
let profesorSeleccionado = null;
let estudianteSeleccionado = null;
let materiaSeleccionada = null;
let calificacionSeleccionada = null;
let asistenciaSeleccionada = null;
let observacionSeleccionada = null;
let todosProfesores = [];
let todosEstudiantes = [];

// ==================== NAVEGACIÓN ====================
function mostrar(seccionId) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('visible'));
    document.getElementById(seccionId).classList.add('visible');
    
    if (seccionId === 'inicio') cargarDashboard();
    if (seccionId === 'gestionProfesores') inicializarGestionProfesores();
    if (seccionId === 'gestionEstudiantes') inicializarGestionEstudiantes();
    if (seccionId === 'gestionMaterias') inicializarGestionMaterias();
    if (seccionId === 'calificaciones') inicializarCalificaciones();
    if (seccionId === 'asistencia') inicializarAsistencia();
    if (seccionId === 'observaciones') inicializarObservaciones();
    if (seccionId === 'alertas') inicializarAlertas();
    if (seccionId === 'perfil') cargarPerfil();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        localStorage.removeItem('usuario');
        // Redirigir a la raíz del proyecto
        window.location.href = '../index.html';
    }
});

// ==================== DASHBOARD ====================
async function cargarDashboard() {
    try {
        const res = await fetch(`${API_URL}/Director/dashboard`);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error del servidor:', errorText);
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        document.getElementById('totalEstudiantes').textContent = data.totalEstudiantes || 0;
        document.getElementById('totalProfesores').textContent = data.totalProfesores || 0;
        document.getElementById('promedioGeneral').textContent = (data.promedioGeneral || 0).toFixed(2);
        document.getElementById('alertasActivas').textContent = data.alertasActivas || 0;
    } catch (error) {
        console.error('Error completo:', error);
        
        // Mostrar valores por defecto en caso de error
        document.getElementById('totalEstudiantes').textContent = '0';
        document.getElementById('totalProfesores').textContent = '0';
        document.getElementById('promedioGeneral').textContent = '0.00';
        document.getElementById('alertasActivas').textContent = '0';
        
        // Solo mostrar alerta si no es un problema de conexión inicial
        if (error.message !== 'Failed to fetch') {
            mostrarAlerta('Error al cargar el dashboard. Mostrando valores por defecto.', 'warning');
        }
    }
}

// ==================== GESTIÓN DE PROFESORES ====================
async function inicializarGestionProfesores() {
    await cargarProfesores();
    await cargarPeriodos('periodoAsignar');
}

async function cargarProfesores() {
    try {
        const res = await fetch(`${API_URL}/Director/profesores`);
        todosProfesores = await res.json();
        mostrarProfesores(todosProfesores);
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar profesores', 'danger');
    }
}

function mostrarProfesores(profesores) {
    const tbody = document.getElementById('tablaProfesores');
    tbody.innerHTML = '';
    
    profesores.forEach(prof => {
        const tr = document.createElement('tr');
        const estadoClass = prof.estado === 'activo' ? 'estado-activo' : 'estado-inactivo';
        
        tr.innerHTML = `
            <td>${prof.nombre} ${prof.apellido}</td>
            <td>${prof.correo}</td>
            <td>${prof.titulo || 'N/A'}</td>
            <td><span class="${estadoClass}">${prof.estado}</span></td>
            <td>${prof.materiasAsignadas || 0}</td>
            <td>
                <button class="btn-sm btn-info" onclick="abrirModalAsignarMateria(${prof.idUsuario})">Asignar Materias</button>
                <button class="btn-sm ${prof.estado === 'activo' ? 'btn-warning' : 'btn-success'}" 
                    onclick="cambiarEstadoProfesor(${prof.idUsuario}, '${prof.estado}')">
                    ${prof.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button class="btn-sm btn-danger" onclick="resetearContrasenaProfesor(${prof.idUsuario})">Resetear Contraseña</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function buscarEnTablaProfesores() {
    const busqueda = document.getElementById('buscarProfesor').value.toLowerCase();
    const filtrados = busqueda ? todosProfesores.filter(prof => 
        prof.nombre.toLowerCase().includes(busqueda) ||
        prof.apellido.toLowerCase().includes(busqueda) ||
        prof.correo.toLowerCase().includes(busqueda)
    ) : todosProfesores;
    
    mostrarProfesores(filtrados);
}

async function crearProfesor() {
    const nombre = document.getElementById('profNombre').value.trim();
    const apellido = document.getElementById('profApellido').value.trim();
    const correo = document.getElementById('profCorreo').value.trim();
    const titulo = document.getElementById('profTitulo').value.trim();
    const contrasena = document.getElementById('profContrasena').value;
    
    if (!nombre || !apellido || !correo || !contrasena) {
        mostrarAlerta('Complete todos los campos obligatorios', 'warning');
        return;
    }
    
    if (contrasena.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/crear-profesor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, correo, contrasena, titulo })
        });
        
        if (res.ok) {
            mostrarAlerta('Profesor creado exitosamente', 'success');
            document.getElementById('profNombre').value = '';
            document.getElementById('profApellido').value = '';
            document.getElementById('profCorreo').value = '';
            document.getElementById('profTitulo').value = '';
            document.getElementById('profContrasena').value = '';
            cargarProfesores();
        } else {
            mostrarAlerta('Error al crear profesor', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al crear profesor', 'danger');
    }
}

async function cambiarEstadoProfesor(idUsuario, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    if (!confirm(`¿Está seguro de ${nuevoEstado === 'activo' ? 'activar' : 'desactivar'} este profesor?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cambiar-estado-profesor/${idUsuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (res.ok) {
            mostrarAlerta('Estado actualizado correctamente', 'success');
            cargarProfesores();
        } else {
            mostrarAlerta('Error al cambiar el estado', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cambiar el estado', 'danger');
    }
}

async function resetearContrasenaProfesor(idUsuario) {
    const nuevaContrasena = prompt('Ingrese la nueva contraseña (mínimo 8 caracteres):');
    if (!nuevaContrasena || nuevaContrasena.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
    }
    
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const res = await fetch(`${API_URL}/Director/resetear-contrasena`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idUsuarioObjetivo: idUsuario, 
                contrasenaNueva: nuevaContrasena,
                idUsuarioAdmin: usuario.idUsuario
            })
        });
        
        if (res.ok) {
            mostrarAlerta('Contraseña reseteada exitosamente', 'success');
        } else {
            mostrarAlerta('Error al resetear contraseña', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al resetear contraseña', 'danger');
    }
}

async function abrirModalAsignarMateria(idProfesor) {
    profesorSeleccionado = idProfesor;
    const profesor = todosProfesores.find(p => p.idUsuario === idProfesor);
    document.getElementById('nombreProfesorModal').textContent = `Profesor: ${profesor.nombre} ${profesor.apellido}`;
    document.getElementById('modalAsignarMateria').style.display = 'block';
    await cargarMateriasAsignadasProfesor(idProfesor);
}

function cerrarModalMateria() {
    document.getElementById('modalAsignarMateria').style.display = 'none';
    profesorSeleccionado = null;
}

async function cargarAsignaturasDisponibles() {
    const periodo = document.getElementById('periodoAsignar').value;
    if (!periodo) return;
    
    try {
        const [resAsig, resCursos] = await Promise.all([
            fetch(`${API_URL}/Director/asignaturas`),
            fetch(`${API_URL}/Director/cursos-paralelos`)
        ]);
        
        const asignaturas = await resAsig.json();
        const cursos = await resCursos.json();
        
        const selectAsig = document.getElementById('asignaturaAsignar');
        selectAsig.innerHTML = '<option value="">Seleccione asignatura</option>';
        asignaturas.forEach(a => {
            selectAsig.innerHTML += `<option value="${a.idAsignatura}">${a.nombre}</option>`;
        });
        
        const selectCurso = document.getElementById('cursoParaleloAsignar');
        selectCurso.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
        cursos.forEach(c => {
            selectCurso.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function asignarMateriaProfesor() {
    const asignatura = document.getElementById('asignaturaAsignar').value;
    const cursoParalelo = document.getElementById('cursoParaleloAsignar').value;
    const cupoMaximo = document.getElementById('cupoMaximo').value;
    const aula = document.getElementById('aulaAsignar').value.trim();
    
    if (!asignatura || !cursoParalelo) {
        mostrarAlerta('Complete todos los campos requeridos', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/asignar-profesor-asignatura`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProfesor: profesorSeleccionado,
                idAsignatura: parseInt(asignatura),
                idCursoParalelo: parseInt(cursoParalelo),
                cupoMaximo: parseInt(cupoMaximo),
                aula: aula || null
            })
        });
        
        if (res.ok) {
            mostrarAlerta('Materia asignada exitosamente', 'success');
            cargarMateriasAsignadasProfesor(profesorSeleccionado);
            document.getElementById('asignaturaAsignar').value = '';
            document.getElementById('cursoParaleloAsignar').value = '';
            document.getElementById('aulaAsignar').value = '';
        } else {
            mostrarAlerta('Error al asignar materia', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al asignar materia', 'danger');
    }
}

async function cargarMateriasAsignadasProfesor(idProfesor) {
    try {
        const res = await fetch(`${API_URL}/Director/materias-asignadas-profesor/${idProfesor}`);
        const materias = await res.json();
        
        const tbody = document.getElementById('tablaMateriasProfesor');
        tbody.innerHTML = materias.map(mat => `
            <tr>
                <td>${mat.periodo}</td>
                <td>${mat.asignatura}</td>
                <td>${mat.cursoParalelo}</td>
                <td>${mat.cupoActual}/${mat.cupoMaximo}</td>
                <td>
                    <button class="btn-sm btn-danger" onclick="eliminarAsignacionProfesor(${mat.idProfesorAsignatura})">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarAsignacionProfesor(idProfesorAsignatura) {
    if (!confirm('¿Está seguro de eliminar esta asignación?')) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/eliminar-asignacion/${idProfesorAsignatura}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            mostrarAlerta('Asignación eliminada correctamente', 'success');
            cargarMateriasAsignadasProfesor(profesorSeleccionado);
            cargarProfesores();
        } else {
            mostrarAlerta('Error al eliminar asignación', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==================== GESTIÓN DE ESTUDIANTES ====================
async function inicializarGestionEstudiantes() {
    await cargarPeriodos('estPeriodo');
    await cargarPeriodos('filtroEstPeriodo');
    await cargarCursosParalelos('estCursoParalelo');
    await cargarEstudiantes();
}

async function cargarEstudiantes() {
    try {
        const res = await fetch(`${API_URL}/Director/estudiantes-completo`);
        todosEstudiantes = await res.json();
        mostrarEstudiantes(todosEstudiantes);
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar estudiantes', 'danger');
    }
}

function mostrarEstudiantes(estudiantes) {
    const tbody = document.getElementById('tablaEstudiantes');
    tbody.innerHTML = '';
    
    estudiantes.forEach(est => {
        const estadoClass = est.estado === 'activo' ? 'estado-activo' : 'estado-inactivo';
        const fecha = new Date(est.fechaCreacion).toLocaleDateString();
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${est.nombre} ${est.apellido}</td>
            <td>${est.correo}</td>
            <td>${est.periodo || 'N/A'}</td>
            <td>${est.cursoParalelo || 'N/A'}</td>
            <td><span class="${estadoClass}">${est.estado}</span></td>
            <td>${fecha}</td>
            <td>
                <button class="btn-sm btn-info" onclick="abrirModalEditarEstudiante(${est.idUsuario})">Editar</button>
                <button class="btn-sm ${est.estado === 'activo' ? 'btn-warning' : 'btn-success'}" 
                    onclick="cambiarEstadoEstudiante(${est.idUsuario}, '${est.estado}')">
                    ${est.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button class="btn-sm btn-danger" onclick="resetearContrasenaEstudiante(${est.idUsuario})">Resetear Contraseña</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarFiltroEstCursosParalelos() {
    const periodo = document.getElementById('filtroEstPeriodo').value;
    const select = document.getElementById('filtroEstCursoParalelo');
    
    select.innerHTML = '<option value="">Todos los cursos-paralelos</option>';
    
    if (!periodo) {
        buscarEnTablaEstudiantes();
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
    
    buscarEnTablaEstudiantes();
}

function buscarEnTablaEstudiantes() {
    const busqueda = document.getElementById('buscarEstudiante').value.toLowerCase();
    const periodo = document.getElementById('filtroEstPeriodo').value;
    const cursoParalelo = document.getElementById('filtroEstCursoParalelo').value;
    
    let filtrados = todosEstudiantes;
    
    if (busqueda) {
        filtrados = filtrados.filter(est => 
            est.nombre.toLowerCase().includes(busqueda) ||
            est.apellido.toLowerCase().includes(busqueda) ||
            est.correo.toLowerCase().includes(busqueda)
        );
    }
    
    if (periodo) filtrados = filtrados.filter(est => est.idPeriodo == periodo);
    if (cursoParalelo) filtrados = filtrados.filter(est => est.idCursoParalelo == cursoParalelo);
    
    mostrarEstudiantes(filtrados);
}

async function crearEstudiante() {
    const nombre = document.getElementById('estNombre').value.trim();
    const apellido = document.getElementById('estApellido').value.trim();
    const correo = document.getElementById('estCorreo').value.trim();
    const contrasena = document.getElementById('estContrasena').value;
    const periodo = document.getElementById('estPeriodo').value;
    const cursoParalelo = document.getElementById('estCursoParalelo').value;
    
    if (!nombre || !apellido || !correo || !contrasena || !periodo || !cursoParalelo) {
        mostrarAlerta('Complete todos los campos', 'warning');
        return;
    }
    
    if (contrasena.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/crear-estudiante`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre, apellido, correo, contrasena,
                idPeriodo: parseInt(periodo),
                idCursoParalelo: parseInt(cursoParalelo)
            })
        });
        
        if (res.ok) {
            mostrarAlerta('Estudiante creado exitosamente', 'success');
            document.getElementById('estNombre').value = '';
            document.getElementById('estApellido').value = '';
            document.getElementById('estCorreo').value = '';
            document.getElementById('estContrasena').value = '';
            document.getElementById('estPeriodo').value = '';
            document.getElementById('estCursoParalelo').value = '';
            cargarEstudiantes();
        } else {
            mostrarAlerta('Error al crear estudiante', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al crear estudiante', 'danger');
    }
}

async function cambiarEstadoEstudiante(idUsuario, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
    if (!confirm(`¿Está seguro de ${nuevoEstado === 'activo' ? 'activar' : 'desactivar'} este estudiante?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cambiar-estado-estudiante/${idUsuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (res.ok) {
            mostrarAlerta('Estado actualizado correctamente', 'success');
            cargarEstudiantes();
        } else {
            mostrarAlerta('Error al cambiar el estado', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function resetearContrasenaEstudiante(idUsuario) {
    const nuevaContrasena = prompt('Ingrese la nueva contraseña (mínimo 8 caracteres):');
    if (!nuevaContrasena || nuevaContrasena.length < 8) {
        mostrarAlerta('La contraseña debe tener al menos 8 caracteres', 'warning');
        return;
    }
    
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const res = await fetch(`${API_URL}/Director/resetear-contrasena`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idUsuarioObjetivo: idUsuario, 
                contrasenaNueva: nuevaContrasena,
                idUsuarioAdmin: usuario.idUsuario
            })
        });
        
        if (res.ok) {
            mostrarAlerta('Contraseña reseteada exitosamente', 'success');
        } else {
            mostrarAlerta('Error al resetear contraseña', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function abrirModalEditarEstudiante(idEstudiante) {
    estudianteSeleccionado = idEstudiante;
    const estudiante = todosEstudiantes.find(e => e.idUsuario === idEstudiante);
    
    document.getElementById('editEstId').value = idEstudiante;
    document.getElementById('editEstNombre').value = estudiante.nombre;
    document.getElementById('editEstApellido').value = estudiante.apellido;
    document.getElementById('editEstCorreo').value = estudiante.correo;
    document.getElementById('modalEditarEstudiante').style.display = 'block';
    
    await cargarMatriculasEstudiante(idEstudiante);
}

function cerrarModalEstudiante() {
    document.getElementById('modalEditarEstudiante').style.display = 'none';
    estudianteSeleccionado = null;
}

async function actualizarEstudiante() {
    const idUsuario = document.getElementById('editEstId').value;
    const nombre = document.getElementById('editEstNombre').value.trim();
    const apellido = document.getElementById('editEstApellido').value.trim();
    const correo = document.getElementById('editEstCorreo').value.trim();
    
    if (!nombre || !apellido || !correo) {
        mostrarAlerta('Complete todos los campos', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/actualizar-estudiante/${idUsuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, correo })
        });
        
        if (res.ok) {
            mostrarAlerta('Datos actualizados correctamente', 'success');
            cargarEstudiantes();
            cerrarModalEstudiante();
        } else {
            mostrarAlerta('Error al actualizar datos', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarMatriculasEstudiante(idEstudiante) {
    try {
        const res = await fetch(`${API_URL}/Director/matriculas-estudiante/${idEstudiante}`);
        const matriculas = await res.json();
        
        const tbody = document.getElementById('tablaMatriculasEstudiante');
        tbody.innerHTML = matriculas.map(mat => `
            <tr>
                <td>${mat.periodo}</td>
                <td>${mat.cursoParalelo}</td>
                <td>${mat.totalMaterias}</td>
                <td><span class="badge badge-${mat.estado === 'activa' ? 'success' : 'warning'}">${mat.estado}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==================== GESTIÓN DE MATERIAS ====================
async function inicializarGestionMaterias() {
    await cargarPeriodos('filterMatPeriodo');
    limpiarFiltrosMaterias();
}

async function crearMateria() {
    const nombre = document.getElementById('materiaNombre').value.trim();
    const descripcion = document.getElementById('materiaDescripcion').value.trim();
    const area = document.getElementById('materiaArea').value.trim();
    
    if (!nombre || !area) {
        mostrarAlerta('Complete los campos obligatorios (Nombre y Área)', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/crear-asignatura`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion, area })
        });
        
        if (res.ok) {
            mostrarAlerta('Materia creada exitosamente', 'success');
            document.getElementById('materiaNombre').value = '';
            document.getElementById('materiaDescripcion').value = '';
            document.getElementById('materiaArea').value = '';
            aplicarFiltrosMaterias();
        } else {
            mostrarAlerta('Error al crear materia', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarCursosParalelosPorPeriodo() {
    const periodo = document.getElementById('filterMatPeriodo').value;
    const select = document.getElementById('filterMatCursoParalelo');
    const selectAsig = document.getElementById('filterMatAsignatura');
    
    select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    selectAsig.innerHTML = '<option value="">Todas las materias</option>';
    
    if (!periodo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarMateriasPorCursoParalelo() {
    const periodo = document.getElementById('filterMatPeriodo').value;
    const cursoParalelo = document.getElementById('filterMatCursoParalelo').value;
    const select = document.getElementById('filterMatAsignatura');
    
    select.innerHTML = '<option value="">Todas las materias</option>';
    if (!periodo || !cursoParalelo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/asignaturas-por-curso-paralelo?periodo=${periodo}&cursoParalelo=${cursoParalelo}`);
        const materias = await res.json();
        materias.forEach(m => {
            select.innerHTML += `<option value="${m.idAsignatura}">${m.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function aplicarFiltrosMaterias() {
    const periodo = document.getElementById('filterMatPeriodo').value;
    const cursoParalelo = document.getElementById('filterMatCursoParalelo').value;
    const asignatura = document.getElementById('filterMatAsignatura').value;
    
    if (!periodo) {
        mostrarAlerta('Seleccione al menos un período', 'warning');
        return;
    }
    
    try {
        const params = new URLSearchParams();
        if (periodo) params.append('periodo', periodo);
        if (cursoParalelo) params.append('cursoParalelo', cursoParalelo);
        if (asignatura) params.append('asignatura', asignatura);
        
        const res = await fetch(`${API_URL}/Director/materias-detalle?${params}`);
        const data = await res.json();
        
        const tbody = document.getElementById('tablaDetalleMaterias');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.periodo}</td>
                <td>${item.asignatura}</td>
                <td>${item.cursoParalelo}</td>
                <td>${item.docente}</td>
                <td>${item.estudiantes}</td>
                <td>${(item.promedio || 0).toFixed(2)}</td>
                <td style="color: green;">${item.aprobados}</td>
                <td style="color: red;">${item.reprobados}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="abrirModalEditarMateria(${item.idAsignatura})">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar materias', 'danger');
    }
}

function limpiarFiltrosMaterias() {
    document.getElementById('filterMatPeriodo').value = '';
    document.getElementById('filterMatCursoParalelo').value = '';
    document.getElementById('filterMatCursoParalelo').innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    document.getElementById('filterMatAsignatura').value = '';
    document.getElementById('filterMatAsignatura').innerHTML = '<option value="">Todas las materias</option>';
    document.getElementById('tablaDetalleMaterias').innerHTML = '';
}

async function abrirModalEditarMateria(idAsignatura) {
    materiaSeleccionada = idAsignatura;
    
    try {
        const res = await fetch(`${API_URL}/Director/asignatura/${idAsignatura}`);
        const materia = await res.json();
        
        document.getElementById('editMatId').value = idAsignatura;
        document.getElementById('editMatNombre').value = materia.nombre;
        document.getElementById('editMatDescripcion').value = materia.descripcion || '';
        document.getElementById('editMatArea').value = materia.area || '';
        document.getElementById('modalEditarMateria').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar datos de la materia', 'danger');
    }
}

function cerrarModalEditarMateria() {
    document.getElementById('modalEditarMateria').style.display = 'none';
    materiaSeleccionada = null;
}

async function actualizarMateria() {
    const idAsignatura = document.getElementById('editMatId').value;
    const nombre = document.getElementById('editMatNombre').value.trim();
    const descripcion = document.getElementById('editMatDescripcion').value.trim();
    const area = document.getElementById('editMatArea').value.trim();
    
    if (!nombre || !area) {
        mostrarAlerta('Complete los campos obligatorios', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/actualizar-asignatura/${idAsignatura}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, descripcion, area })
        });
        
        if (res.ok) {
            mostrarAlerta('Materia actualizada correctamente', 'success');
            cerrarModalEditarMateria();
            aplicarFiltrosMaterias();
        } else {
            mostrarAlerta('Error al actualizar materia', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar materia', 'danger');
    }
}

// ==================== CALIFICACIONES ====================
async function inicializarCalificaciones() {
    await cargarPeriodos('selectPeriodoCalif');
    document.getElementById('tablaDetalleCalificaciones').innerHTML = '';
}

async function cargarCursosParalelosCalif() {
    const periodo = document.getElementById('selectPeriodoCalif').value;
    const select = document.getElementById('selectCursoParaleloCalif');
    
    select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    document.getElementById('selectAsignaturaCalif').innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAsignaturasCalif() {
    const periodo = document.getElementById('selectPeriodoCalif').value;
    const cursoParalelo = document.getElementById('selectCursoParaleloCalif').value;
    const select = document.getElementById('selectAsignaturaCalif');
    
    select.innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo || !cursoParalelo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/asignaturas-por-curso-paralelo?periodo=${periodo}&cursoParalelo=${cursoParalelo}`);
        const materias = await res.json();
        materias.forEach(m => {
            select.innerHTML += `<option value="${m.idProfesorAsignatura}">${m.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarCalificaciones() {
    const profesorAsignatura = document.getElementById('selectAsignaturaCalif').value;
    
    if (!profesorAsignatura) {
        document.getElementById('tablaDetalleCalificaciones').innerHTML = '';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/calificaciones-detalle?profesorAsignatura=${profesorAsignatura}`);
        const data = await res.json();
        
        const tbody = document.getElementById('tablaDetalleCalificaciones');
        tbody.innerHTML = data.map(item => {
            const estado = item.promedio >= 7 ? 'Aprobado' : 'Reprobado';
            const colorEstado = item.promedio >= 7 ? 'green' : 'red';
            
            return `
                <tr>
                    <td>${item.estudiante}</td>
                    <td>${(item.tareas || 0).toFixed(2)}</td>
                    <td>${(item.trabajosClase || 0).toFixed(2)}</td>
                    <td>${(item.proyecto || 0).toFixed(2)}</td>
                    <td>${(item.participacion || 0).toFixed(2)}</td>
                    <td>${(item.pruebas || 0).toFixed(2)}</td>
                    <td>${(item.examenes || 0).toFixed(2)}</td>
                    <td><strong>${(item.promedio || 0).toFixed(2)}</strong></td>
                    <td style="color: ${colorEstado}; font-weight: bold;">${estado}</td>
                    <td>
                        <button class="btn-sm btn-info" onclick="abrirModalEditarCalificacion(${item.idCalificacion}, '${item.estudiante}')">Editar</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar calificaciones', 'danger');
    }
}

async function abrirModalEditarCalificacion(idCalificacion, estudiante) {
    calificacionSeleccionada = idCalificacion;
    
    try {
        const res = await fetch(`${API_URL}/Director/calificacion/${idCalificacion}`);
        const calif = await res.json();
        
        document.getElementById('nombreEstudianteCalif').textContent = `Estudiante: ${estudiante}`;
        document.getElementById('editCalifId').value = idCalificacion;
        document.getElementById('editCalifTareas').value = calif.tareas || 0;
        document.getElementById('editCalifTrabajos').value = calif.trabajosClase || 0;
        document.getElementById('editCalifProyecto').value = calif.proyecto || 0;
        document.getElementById('editCalifParticipacion').value = calif.participacion || 0;
        document.getElementById('editCalifPruebas').value = calif.pruebas || 0;
        document.getElementById('editCalifExamenes').value = calif.examenes || 0;
        document.getElementById('modalEditarCalificacion').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar calificación', 'danger');
    }
}

function cerrarModalEditarCalificacion() {
    document.getElementById('modalEditarCalificacion').style.display = 'none';
    calificacionSeleccionada = null;
}

async function actualizarCalificacion() {
    const idCalificacion = document.getElementById('editCalifId').value;
    const tareas = parseFloat(document.getElementById('editCalifTareas').value) || 0;
    const trabajos = parseFloat(document.getElementById('editCalifTrabajos').value) || 0;
    const proyecto = parseFloat(document.getElementById('editCalifProyecto').value) || 0;
    const participacion = parseFloat(document.getElementById('editCalifParticipacion').value) || 0;
    const pruebas = parseFloat(document.getElementById('editCalifPruebas').value) || 0;
    const examenes = parseFloat(document.getElementById('editCalifExamenes').value) || 0;
    
    try {
        const res = await fetch(`${API_URL}/Director/actualizar-calificacion/${idCalificacion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tareas, trabajosClase: trabajos, proyecto, participacion, pruebas, examenes })
        });
        
        if (res.ok) {
            mostrarAlerta('Calificación actualizada correctamente', 'success');
            cerrarModalEditarCalificacion();
            cargarCalificaciones();
        } else {
            mostrarAlerta('Error al actualizar calificación', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar calificación', 'danger');
    }
}

// ==================== ASISTENCIA ====================
async function inicializarAsistencia() {
    await cargarPeriodos('selectPeriodoAsis');
    document.getElementById('asistenciaGlobal').textContent = '--';
    document.getElementById('estudiantesBajaAsis').textContent = '--';
    document.getElementById('tablaAsistencia').innerHTML = '';
}

async function cargarCursosParalelosAsis() {
    const periodo = document.getElementById('selectPeriodoAsis').value;
    const select = document.getElementById('selectCursoParaleloAsis');
    
    select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    document.getElementById('selectAsignaturaAsis').innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAsignaturasAsis() {
    const periodo = document.getElementById('selectPeriodoAsis').value;
    const cursoParalelo = document.getElementById('selectCursoParaleloAsis').value;
    const select = document.getElementById('selectAsignaturaAsis');
    
    select.innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo || !cursoParalelo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/asignaturas-por-curso-paralelo?periodo=${periodo}&cursoParalelo=${cursoParalelo}`);
        const materias = await res.json();
        materias.forEach(m => {
            select.innerHTML += `<option value="${m.idProfesorAsignatura}">${m.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAsistencia() {
    const profesorAsignatura = document.getElementById('selectAsignaturaAsis').value;
    
    if (!profesorAsignatura) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/asistencia-detalle?profesorAsignatura=${profesorAsignatura}`);
        const data = await res.json();
        
        document.getElementById('asistenciaGlobal').textContent = (data.asistenciaGlobal || 0).toFixed(1) + '%';
        document.getElementById('estudiantesBajaAsis').textContent = data.estudiantesBajaAsistencia || 0;
        
        const tbody = document.getElementById('tablaAsistencia');
        tbody.innerHTML = data.detalle.map(item => {
            const porcentaje = (item.porcentajeAsistencia || 0).toFixed(1);
            const color = porcentaje < 80 ? 'red' : 'green';
            
            return `
                <tr>
                    <td>${item.estudiante}</td>
                    <td>${item.presentes}</td>
                    <td>${item.ausentes}</td>
                    <td>${item.tardanzas}</td>
                    <td style="color: ${color}; font-weight: bold;">${porcentaje}%</td>
                    <td>
                        <button class="btn-sm btn-info" onclick="abrirModalEditarAsistencia(${item.idDetalle}, '${item.estudiante}')">Editar</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar asistencia', 'danger');
    }
}

async function abrirModalEditarAsistencia(idDetalle, estudiante) {
    asistenciaSeleccionada = idDetalle;
    
    try {
        const res = await fetch(`${API_URL}/Director/asistencia-estudiante/${idDetalle}`);
        const asis = await res.json();
        
        document.getElementById('nombreEstudianteAsis').textContent = `Estudiante: ${estudiante}`;
        document.getElementById('editAsisIdDetalle').value = idDetalle;
        document.getElementById('editAsisPresentes').value = asis.presentes || 0;
        document.getElementById('editAsisAusentes').value = asis.ausentes || 0;
        document.getElementById('editAsisTardanzas').value = asis.tardanzas || 0;
        document.getElementById('modalEditarAsistencia').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar asistencia', 'danger');
    }
}

function cerrarModalEditarAsistencia() {
    document.getElementById('modalEditarAsistencia').style.display = 'none';
    asistenciaSeleccionada = null;
}

async function actualizarAsistencia() {
    const idDetalle = document.getElementById('editAsisIdDetalle').value;
    const presentes = parseInt(document.getElementById('editAsisPresentes').value) || 0;
    const ausentes = parseInt(document.getElementById('editAsisAusentes').value) || 0;
    const tardanzas = parseInt(document.getElementById('editAsisTardanzas').value) || 0;
    
    try {
        const res = await fetch(`${API_URL}/Director/actualizar-asistencia/${idDetalle}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presentes, ausentes, tardanzas })
        });
        
        if (res.ok) {
            mostrarAlerta('Asistencia actualizada correctamente', 'success');
            cerrarModalEditarAsistencia();
            cargarAsistencia();
        } else {
            mostrarAlerta('Error al actualizar asistencia', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar asistencia', 'danger');
    }
}

// ==================== OBSERVACIONES ====================
async function inicializarObservaciones() {
    await cargarPeriodos('selectPeriodoObs');
    document.getElementById('tablaObservaciones').innerHTML = '';
}

async function cargarCursosParalelosObs() {
    const periodo = document.getElementById('selectPeriodoObs').value;
    const select = document.getElementById('selectCursoParaleloObs');
    
    select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    document.getElementById('selectAsignaturaObs').innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAsignaturasObs() {
    const periodo = document.getElementById('selectPeriodoObs').value;
    const cursoParalelo = document.getElementById('selectCursoParaleloObs').value;
    const select = document.getElementById('selectAsignaturaObs');
    
    select.innerHTML = '<option value="">Seleccione asignatura</option>';
    
    if (!periodo || !cursoParalelo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/asignaturas-por-curso-paralelo?periodo=${periodo}&cursoParalelo=${cursoParalelo}`);
        const materias = await res.json();
        materias.forEach(m => {
            select.innerHTML += `<option value="${m.idProfesorAsignatura}">${m.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarObservaciones() {
    const profesorAsignatura = document.getElementById('selectAsignaturaObs').value;
    const tipo = document.getElementById('selectTipoObs').value;
    
    if (!profesorAsignatura) return;
    
    try {
        const params = new URLSearchParams();
        params.append('profesorAsignatura', profesorAsignatura);
        if (tipo) params.append('tipo', tipo);
        
        const res = await fetch(`${API_URL}/Director/observaciones-detalle?${params}`);
        const data = await res.json();
        
        const tbody = document.getElementById('tablaObservaciones');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${new Date(item.fecha).toLocaleDateString()}</td>
                <td>${item.estudiante}</td>
                <td>${item.materia}</td>
                <td>${item.profesor}</td>
                <td><span class="badge badge-${item.tipo === 'academica' ? 'info' : 'warning'}">${item.tipo}</span></td>
                <td>${item.detalle}</td>
                <td><span class="badge badge-${item.estado === 'abierta' ? 'danger' : 'success'}">${item.estado}</span></td>
                <td>
                    <button class="btn-sm btn-info" onclick="abrirModalEditarObservacion(${item.idObservacion})">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar observaciones', 'danger');
    }
}

async function abrirModalEditarObservacion(idObservacion) {
    observacionSeleccionada = idObservacion;
    
    try {
        const res = await fetch(`${API_URL}/Director/observacion/${idObservacion}`);
        const obs = await res.json();
        
        document.getElementById('editObsId').value = idObservacion;
        document.getElementById('editObsTipo').value = obs.tipo;
        document.getElementById('editObsDetalle').value = obs.detalle;
        document.getElementById('editObsEstado').value = obs.estado;
        document.getElementById('modalEditarObservacion').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar observación', 'danger');
    }
}

function cerrarModalEditarObservacion() {
    document.getElementById('modalEditarObservacion').style.display = 'none';
    observacionSeleccionada = null;
}

async function actualizarObservacion() {
    const idObservacion = document.getElementById('editObsId').value;
    const tipo = document.getElementById('editObsTipo').value;
    const detalle = document.getElementById('editObsDetalle').value.trim();
    const estado = document.getElementById('editObsEstado').value;
    
    if (!detalle) {
        mostrarAlerta('El detalle es obligatorio', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/actualizar-observacion/${idObservacion}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, detalle, estado })
        });
        
        if (res.ok) {
            mostrarAlerta('Observación actualizada correctamente', 'success');
            cerrarModalEditarObservacion();
            cargarObservaciones();
        } else {
            mostrarAlerta('Error al actualizar observación', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al actualizar observación', 'danger');
    }
}

// ==================== ALERTAS ====================
async function inicializarAlertas() {
    await cargarPeriodos('selectPeriodoAlertas');
    document.getElementById('alertasBajoRendimiento').textContent = '--';
    document.getElementById('alertasInasistencias').textContent = '--';
    document.getElementById('tablaBajoRendimiento').innerHTML = '';
    document.getElementById('tablaInasistencias').innerHTML = '';
}

async function cargarCursosParalelosAlertas() {
    const periodo = document.getElementById('selectPeriodoAlertas').value;
    const select = document.getElementById('selectCursoParaleloAlertas');
    
    select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
    document.getElementById('selectAsignaturaAlertas').innerHTML = '<option value="">Todas las asignaturas</option>';
    
    if (!periodo) return;
    
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAsignaturasAlertas() {
    const periodo = document.getElementById('selectPeriodoAlertas').value;
    const cursoParalelo = document.getElementById('selectCursoParaleloAlertas').value;
    const select = document.getElementById('selectAsignaturaAlertas');
    
    select.innerHTML = '<option value="">Todas las asignaturas</option>';
    
    if (!periodo || !cursoParalelo) {
        cargarAlertas();
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/Director/asignaturas-por-curso-paralelo?periodo=${periodo}&cursoParalelo=${cursoParalelo}`);
        const materias = await res.json();
        materias.forEach(m => {
            select.innerHTML += `<option value="${m.idProfesorAsignatura}">${m.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarAlertas() {
    const periodo = document.getElementById('selectPeriodoAlertas').value;
    const cursoParalelo = document.getElementById('selectCursoParaleloAlertas').value;
    const asignatura = document.getElementById('selectAsignaturaAlertas').value;
    
    if (!periodo) return;
    
    try {
        const params = new URLSearchParams();
        params.append('periodo', periodo);
        if (cursoParalelo) params.append('cursoParalelo', cursoParalelo);
        if (asignatura) params.append('profesorAsignatura', asignatura);
        
        const res = await fetch(`${API_URL}/Director/alertas?${params}`);
        const data = await res.json();
        
        document.getElementById('alertasBajoRendimiento').textContent = data.bajoRendimiento.length;
        document.getElementById('alertasInasistencias').textContent = data.inasistencias.length;
        
        const tbodyRendimiento = document.getElementById('tablaBajoRendimiento');
        tbodyRendimiento.innerHTML = data.bajoRendimiento.map(item => `
            <tr>
                <td>${item.estudiante}</td>
                <td>${item.materia}</td>
                <td style="color: red; font-weight: bold;">${(item.promedio || 0).toFixed(2)}</td>
                <td style="color: red;">En riesgo</td>
            </tr>
        `).join('');
        
        const tbodyInasistencias = document.getElementById('tablaInasistencias');
        tbodyInasistencias.innerHTML = data.inasistencias.map(item => `
            <tr>
                <td>${item.estudiante}</td>
                <td>${item.materia}</td>
                <td style="color: red; font-weight: bold;">${(item.porcentajeAsistencia || 0).toFixed(1)}%</td>
                <td>${item.faltas}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar alertas', 'danger');
    }
}

// ==================== UTILIDADES ====================
async function cargarPeriodos(selectId) {
    try {
        const res = await fetch(`${API_URL}/Director/periodos`);
        const periodos = await res.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccione un periodo</option>';
        periodos.forEach(p => {
            select.innerHTML += `<option value="${p.idPeriodo}">${p.nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarCursosParalelos(selectId) {
    try {
        const res = await fetch(`${API_URL}/Director/cursos-paralelos`);
        const cursos = await res.json();
        
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Seleccione curso-paralelo</option>';
        cursos.forEach(c => {
            select.innerHTML += `<option value="${c.idCursoParalelo}">${c.curso} - ${c.paralelo}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function cargarPerfil() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    document.getElementById('perfilUUID').textContent = usuario.uuidUsuario || 'N/A';
    document.getElementById('perfilNombre').textContent = `${usuario.nombre || ''} ${usuario.apellido || ''}`;
    document.getElementById('perfilCorreo').textContent = usuario.correo || '';
}

function mostrarAlerta(mensaje, tipo = 'info') {
    alert(mensaje);
}

// ==================== INICIALIZACIÓN ====================
window.onload = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    // Verificar que existe usuario y tiene los datos necesarios
    if (!usuario || !usuario.idUsuario || !usuario.uuidUsuario) {
        alert('Sesión no válida. Por favor inicie sesión nuevamente.');
        window.location.href = '../index.html';
        return;
    }
    
    // Verificar que el rol sea Director
    if (usuario.role && usuario.role.toLowerCase() !== 'director') {
        alert('Acceso denegado. Esta sección es solo para Directores.');
        localStorage.removeItem('usuario');
        window.location.href = '../index.html';
        return;
    }
    
    // Todo correcto, cargar dashboard
    cargarDashboard();
};