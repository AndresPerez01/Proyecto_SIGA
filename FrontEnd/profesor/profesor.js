/* ------------------------ CONFIGURACIÓN API ------------------------ */
const API_URL = 'http://localhost:5017/api';

/* ------------------------ OBTENER DATOS DEL USUARIO ------------------------ */
function getUsuarioActual() {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

/* ------------------------ NAVEGACIÓN ------------------------ */
function mostrar(id) {
    document.querySelectorAll(".seccion").forEach(sec => sec.classList.remove("visible"));
    document.getElementById(id).classList.add("visible");
}

/* ------------------------ VARIABLES GLOBALES ------------------------ */
let materiasPeriodo = [];

/* ------------------------ LLENAR MATERIAS ------------------------ */
async function cargarMaterias() {
    try {
        const usuario = getUsuarioActual();
        if (!usuario) {
            alert('Sesión no válida');
            window.location.href = '../index.html';
            return;
        }

        const response = await fetch(`${API_URL}/profesor/materias/${usuario.idUsuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar materias');
        }

        materiasPeriodo = await response.json();
        
        let tabla = document.getElementById("tablaMaterias");
        tabla.innerHTML = '';
        
        if (materiasPeriodo.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align:center;">No tiene materias asignadas en este periodo</td></tr>';
            return;
        }
        
        materiasPeriodo.forEach(m => {
            tabla.innerHTML += `
                <tr>
                    <td>${m.nombre} (${m.codigo})</td>
                    <td>${m.aula}</td>
                    <td>${m.periodo}</td>
                </tr>`;
        });

        // Llenar selects de materia
        ["materiaCalifSelect","materiaAsisSelect","materiaObsSelect"].forEach(selectId => {
            let sel = document.getElementById(selectId);
            sel.innerHTML = '<option value="">-- Seleccione una materia --</option>';
            materiasPeriodo.forEach(m => {
                sel.innerHTML += `<option value="${m.idMateriaPeriodo}">${m.nombre} (${m.codigo})</option>`;
            });
        });

        // Agregar eventos de cambio a los selects
        document.getElementById('materiaCalifSelect').addEventListener('change', cargarCalificaciones);
        document.getElementById('materiaAsisSelect').addEventListener('change', cargarAsistencia);
        document.getElementById('materiaObsSelect').addEventListener('change', cargarObservaciones);
        
    } catch (error) {
        console.error('Error al cargar materias:', error);
        alert('Error al cargar materias de la base de datos');
    }
}

/* ------------------------ CALIFICACIONES ------------------------ */
async function cargarCalificaciones() {
    const materiaId = document.getElementById('materiaCalifSelect').value;
    
    if (!materiaId) {
        document.getElementById('tablaCalificaciones').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profesor/calificaciones/${materiaId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar calificaciones');
        }

        const calificaciones = await response.json();
        let tabla = document.getElementById("tablaCalificaciones");
        tabla.innerHTML = '';
        
        if (calificaciones.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay estudiantes inscritos en esta materia</td></tr>';
            return;
        }
        
        calificaciones.forEach(c => {
            tabla.innerHTML += `
                <tr>
                    <td>${c.estudiante}</td>
                    <td>
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Tareas" id="tareas_${c.idDetalle}" value="${c.tareas || ''}" style="width:60px; margin:2px;">
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Trabajos" id="trabajos_${c.idDetalle}" value="${c.trabajosClase || ''}" style="width:60px; margin:2px;">
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Proyecto" id="proyecto_${c.idDetalle}" value="${c.proyecto || ''}" style="width:60px; margin:2px;">
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Participación" id="participacion_${c.idDetalle}" value="${c.participacion || ''}" style="width:60px; margin:2px;">
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Pruebas" id="pruebas_${c.idDetalle}" value="${c.pruebas || ''}" style="width:60px; margin:2px;">
                        <input type="number" min="0" max="10" step="0.1" 
                               placeholder="Exámenes" id="examenes_${c.idDetalle}" value="${c.examenes || ''}" style="width:60px; margin:2px;">
                        <strong>Promedio: ${c.promedio.toFixed(2)}</strong>
                    </td>
                    <td><button onclick="guardarCalificacion(${c.idDetalle})">Guardar</button></td>
                </tr>`;
        });
    } catch (error) {
        console.error('Error al cargar calificaciones:', error);
        alert('Error al cargar calificaciones');
    }
}

async function guardarCalificacion(idDetalle) {
    const tareas = document.getElementById(`tareas_${idDetalle}`).value;
    const trabajos = document.getElementById(`trabajos_${idDetalle}`).value;
    const proyecto = document.getElementById(`proyecto_${idDetalle}`).value;
    const participacion = document.getElementById(`participacion_${idDetalle}`).value;
    const pruebas = document.getElementById(`pruebas_${idDetalle}`).value;
    const examenes = document.getElementById(`examenes_${idDetalle}`).value;

    try {
        const response = await fetch(`${API_URL}/profesor/calificacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idDetalle: idDetalle,
                tareas: tareas ? parseFloat(tareas) : null,
                trabajosClase: trabajos ? parseFloat(trabajos) : null,
                proyecto: proyecto ? parseFloat(proyecto) : null,
                participacion: participacion ? parseFloat(participacion) : null,
                pruebas: pruebas ? parseFloat(pruebas) : null,
                examenes: examenes ? parseFloat(examenes) : null
            })
        });
        
        if (response.ok) {
            alert("Calificación guardada exitosamente");
            cargarCalificaciones();
        } else {
            alert("Error al guardar calificación");
        }
    } catch (error) {
        console.error('Error al guardar calificación:', error);
        alert('Error al guardar la calificación');
    }
}

/* ------------------------ ASISTENCIA ------------------------ */
async function cargarAsistencia() {
    const materiaId = document.getElementById('materiaAsisSelect').value;
    
    if (!materiaId) {
        document.getElementById('tablaAsistencia').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profesor/estudiantes/${materiaId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar estudiantes');
        }

        const estudiantes = await response.json();
        let tabla = document.getElementById("tablaAsistencia");
        tabla.innerHTML = '';
        
        if (estudiantes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="2" style="text-align:center;">No hay estudiantes inscritos en esta materia</td></tr>';
            return;
        }
        
        const fechaHoy = new Date().toISOString().split('T')[0];
        
        estudiantes.forEach(e => {
            tabla.innerHTML += `
                <tr>
                    <td>${e.nombreCompleto}</td>
                    <td>
                        <select id="asist_${e.idDetalle}">
                            <option value="presente">Presente</option>
                            <option value="ausente">Ausente</option>
                            <option value="tardanza">Tardanza</option>
                        </select>
                        <input type="date" id="fecha_${e.idDetalle}" value="${fechaHoy}" style="margin-left:10px;">
                        <button onclick="guardarAsistencia(${e.idDetalle})">Registrar</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error al cargar asistencia:', error);
        alert('Error al cargar estudiantes para asistencia');
    }
}

async function guardarAsistencia(idDetalle) {
    const estado = document.getElementById(`asist_${idDetalle}`).value;
    const fecha = document.getElementById(`fecha_${idDetalle}`).value;
    
    if (!fecha) {
        alert('Seleccione una fecha');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profesor/asistencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idDetalle: idDetalle,
                fecha: fecha,
                estado: estado,
                justificativo: null
            })
        });
        
        if (response.ok) {
            alert("Asistencia registrada exitosamente");
        } else {
            const data = await response.json();
            alert(data.message || "Error al registrar asistencia");
        }
    } catch (error) {
        console.error('Error al guardar asistencia:', error);
        alert('Error al registrar asistencia');
    }
}

/* ------------------------ OBSERVACIONES ------------------------ */
async function cargarObservaciones() {
    const materiaId = document.getElementById('materiaObsSelect').value;
    
    if (!materiaId) {
        document.getElementById('tablaObservaciones').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profesor/estudiantes/${materiaId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar estudiantes');
        }

        const estudiantes = await response.json();
        let tabla = document.getElementById("tablaObservaciones");
        tabla.innerHTML = '';
        
        if (estudiantes.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay estudiantes inscritos en esta materia</td></tr>';
            return;
        }
        
        estudiantes.forEach(e => {
            tabla.innerHTML += `
                <tr>
                    <td>${e.nombreCompleto}</td>
                    <td><input type="text" id="obs_${e.idDetalle}" placeholder="Detalle de la observación..." style="width:100%;"></td>
                    <td>
                        <select id="tipo_${e.idDetalle}">
                            <option value="academica">Académica</option>
                            <option value="conductual">Conductual</option>
                        </select>
                    </td>
                    <td><button onclick="guardarObservacion(${e.idDetalle})">Registrar</button></td>
                </tr>`;
        });
    } catch (error) {
        console.error('Error al cargar observaciones:', error);
        alert('Error al cargar estudiantes para observaciones');
    }
}

async function guardarObservacion(idDetalle) {
    const usuario = getUsuarioActual();
    const detalle = document.getElementById(`obs_${idDetalle}`).value;
    const tipo = document.getElementById(`tipo_${idDetalle}`).value;
    
    if (!detalle.trim()) {
        alert('Ingrese el detalle de la observación');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/profesor/observacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idDetalle: idDetalle,
                idProfesor: usuario.idUsuario,
                detalle: detalle,
                tipo: tipo
            })
        });
        
        if (response.ok) {
            alert("Observación registrada exitosamente");
            document.getElementById(`obs_${idDetalle}`).value = '';
        } else {
            alert("Error al registrar observación");
        }
    } catch (error) {
        console.error('Error al guardar observación:', error);
        alert('Error al registrar observación');
    }
}

/* ------------------------ PERFIL ------------------------ */
function cargarPerfil() {
    const usuario = getUsuarioActual();
    if (usuario) {
        document.getElementById("perfilNombre").innerText = `${usuario.nombre} ${usuario.apellido}`;
        document.getElementById("perfilCorreo").innerText = usuario.correo;
    }
}

/* ------------------------ AUTENTICACIÓN ------------------------ */
function verificarAutenticacion() {
    const userData = sessionStorage.getItem('userData');
    if (!userData) {
        alert('Debe iniciar sesión primero');
        window.location.href = '../index.html';
        return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'profesor') {
        alert('No tiene permisos para acceder a esta página');
        window.location.href = '../index.html';
        return;
    }
}

function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        sessionStorage.removeItem('userData');
        window.location.href = '../index.html';
    }
}

/* ------------------------ INIT ------------------------ */
window.onload = () => {
    verificarAutenticacion();
    cargarMaterias();
    cargarPerfil();
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
};