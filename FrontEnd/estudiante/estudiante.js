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
function mostrarSeccion(id) {
    document.querySelectorAll(".seccion").forEach(s => s.classList.remove("visible"));
    document.getElementById(id).classList.add("visible");
}

/* ------------------------ CARGAR MATERIAS INSCRITAS ------------------------ */
async function renderMaterias() {
    try {
        const usuario = getUsuarioActual();
        if (!usuario) return;

        const response = await fetch(`${API_URL}/estudiante/materias-inscritas/${usuario.idUsuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar materias');
        }

        const materias = await response.json();
        const tbody = document.querySelector("#tablaMaterias tbody");
        
        if (!tbody) {
            console.error('No se encontró la tabla de materias');
            return;
        }
        
        tbody.innerHTML = "";

        if (materias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No tiene materias inscritas</td></tr>';
            document.getElementById("promedio").textContent = "0.00";
            return;
        }

        let sumaPromedios = 0;
        materias.forEach(m => {
            const row = `
                <tr>
                    <td>${m.nombreMateria} (${m.codigo})</td>
                    <td>${m.docente}</td>
                    <td>${m.tareas ? m.tareas.toFixed(2) : '0.00'}</td>
                    <td>${m.trabajosClase ? m.trabajosClase.toFixed(2) : '0.00'}</td>
                    <td>${m.proyecto ? m.proyecto.toFixed(2) : '0.00'}</td>
                    <td>${m.participacion ? m.participacion.toFixed(2) : '0.00'}</td>
                    <td>${m.pruebas ? m.pruebas.toFixed(2) : '0.00'}</td>
                    <td>${m.examenes ? m.examenes.toFixed(2) : '0.00'}</td>
                    <td><strong>${m.promedio ? m.promedio.toFixed(2) : '0.00'}</strong></td>
                    <td><span class="badge ${m.promedio >= 7 ? 'badge-success' : 'badge-danger'}">${m.estado}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
            sumaPromedios += m.promedio || 0;
        });

        // Calcular promedio general
        const promedioGeneral = materias.length > 0 ? sumaPromedios / materias.length : 0;
        document.getElementById("promedio").textContent = promedioGeneral.toFixed(2);
    } catch (error) {
        console.error('Error al cargar materias:', error);
        alert('Error al cargar materias inscritas');
    }
}

/* ------------------------ INSCRIPCIÓN DE MATERIAS ------------------------ */
async function cargarMateriasDisponibles() {
    try {
        const usuario = getUsuarioActual();
        if (!usuario) return;

        // Obtener info de matrícula
        const infoResponse = await fetch(`${API_URL}/estudiante/info-matricula/${usuario.idUsuario}`);
        const info = await infoResponse.json();

        document.getElementById("materiasActuales").textContent = info.totalMaterias || 0;
        document.getElementById("materiasDisponibles").textContent = 5 - (info.totalMaterias || 0);

        if (info.totalMaterias >= 5) {
            const tabla = document.getElementById("tablaMateriasDisponibles");
            if (tabla) {
                tabla.innerHTML = '<p style="text-align:center; padding:20px;">Ya tiene el máximo de 5 materias inscritas</p>';
            }
            return;
        }

        // Cargar materias disponibles
        const response = await fetch(`${API_URL}/estudiante/materias-disponibles/${usuario.idUsuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar materias disponibles');
        }

        const materias = await response.json();
        const tbody = document.querySelector("#tablaMateriasDisponibles tbody");
        
        if (!tbody) {
            console.error('No se encontró la tabla de materias disponibles');
            return;
        }
        
        tbody.innerHTML = "";

        if (materias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay materias disponibles</td></tr>';
            return;
        }

        materias.forEach(m => {
            const row = `
                <tr>
                    <td>${m.nombreMateria}</td>
                    <td>${m.codigo}</td>
                    <td>${m.creditos}</td>
                    <td>${m.docente}</td>
                    <td>${m.horario}</td>
                    <td>${m.cuposDisponibles}/${m.cupoMaximo}</td>
                    <td>
                        <button onclick="inscribirMateria(${m.idMateriaPeriodo}, '${m.nombreMateria}')" 
                                class="btn-inscribir" ${m.cuposDisponibles === 0 ? 'disabled' : ''}>
                            ${m.cuposDisponibles === 0 ? 'Sin cupos' : 'Inscribir'}
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error al cargar materias disponibles:', error);
        alert('Error al cargar materias disponibles');
    }
}

async function inscribirMateria(idMateriaPeriodo, nombreMateria) {
    if (!confirm(`¿Desea inscribirse en la materia ${nombreMateria}?`)) {
        return;
    }

    try {
        const usuario = getUsuarioActual();
        
        const response = await fetch(`${API_URL}/estudiante/inscribir-materia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idEstudiante: usuario.idUsuario,
                idMateriaPeriodo: idMateriaPeriodo
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Materia inscrita exitosamente');
            cargarMateriasDisponibles();
            renderMaterias();
        } else {
            alert(data.message || 'Error al inscribir materia');
        }
    } catch (error) {
        console.error('Error al inscribir materia:', error);
        alert('Error al inscribir materia');
    }
}

/* ------------------------ ASISTENCIAS ------------------------ */
async function cargarAsistencias() {
    try {
        const usuario = getUsuarioActual();
        if (!usuario) return;

        const response = await fetch(`${API_URL}/estudiante/asistencias/${usuario.idUsuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar asistencias');
        }

        const asistencias = await response.json();
        const tbody = document.querySelector("#tablaAsistencia tbody");
        
        if (!tbody) {
            console.error('No se encontró la tabla de asistencia');
            return;
        }
        
        tbody.innerHTML = "";

        if (asistencias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay registros de asistencia</td></tr>';
            return;
        }

        asistencias.forEach(a => {
            const fecha = new Date(a.fecha).toLocaleDateString('es-EC');
            const estadoClass = a.estado === 'presente' ? 'badge-success' : 
                              a.estado === 'ausente' ? 'badge-danger' : 'badge-warning';
            
            const row = `
                <tr>
                    <td>${a.materia}</td>
                    <td>${fecha}</td>
                    <td><span class="badge ${estadoClass}">${a.estado}</span></td>
                    <td>${a.justificativo || '-'}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error al cargar asistencias:', error);
        alert('Error al cargar asistencias');
    }
}

/* ------------------------ OBSERVACIONES ------------------------ */
async function renderObservaciones() {
    try {
        const usuario = getUsuarioActual();
        if (!usuario) return;

        const response = await fetch(`${API_URL}/estudiante/observaciones/${usuario.idUsuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar observaciones');
        }

        const observaciones = await response.json();
        const ul = document.getElementById("obsList");
        
        if (!ul) {
            console.error('No se encontró la lista de observaciones');
            return;
        }
        
        ul.innerHTML = "";

        if (observaciones.length === 0) {
            ul.innerHTML = '<li>No hay observaciones registradas</li>';
            document.getElementById("obsCount").textContent = "0";
            return;
        }

        observaciones.forEach(o => {
            const fecha = new Date(o.fecha).toLocaleDateString('es-EC');
            const tipoClass = o.tipo === 'academica' ? 'obs-academica' : 'obs-conductual';
            
            ul.innerHTML += `
                <li class="${tipoClass}">
                    <strong>${fecha}</strong> - ${o.materia} (${o.profesor})<br>
                    <em>${o.tipo}:</em> ${o.detalle}
                </li>
            `;
        });

        document.getElementById("obsCount").textContent = observaciones.length;
    } catch (error) {
        console.error('Error al cargar observaciones:', error);
        alert('Error al cargar observaciones');
    }
}

/* ------------------------ JUSTIFICATIVOS ------------------------ */
async function subirJustificativo() {
    const file = document.getElementById("fileJusti").files[0];
    const fecha = document.getElementById("fechaJusti").value;
    const motivo = document.getElementById("motivoJusti").value;
    
    if (!file || !fecha || !motivo) {
        alert("Complete todos los campos");
        return;
    }

    try {
        const usuario = getUsuarioActual();
        
        const response = await fetch(`${API_URL}/estudiante/subir-justificativo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idEstudiante: usuario.idUsuario,
                fecha: fecha,
                justificativo: motivo,
                archivoNombre: file.name
            })
        });

        if (response.ok) {
            alert("Justificativo enviado exitosamente");
            const list = document.getElementById("uploadedFiles");
            if (list) {
                list.innerHTML += `<p>✓ ${file.name} - ${fecha} - Enviado</p>`;
            }
            
            // Limpiar formulario
            document.getElementById("fileJusti").value = '';
            document.getElementById("fechaJusti").value = '';
            document.getElementById("motivoJusti").value = '';
            
            cargarAsistencias(); // Recargar asistencias
        } else {
            alert("Error al enviar justificativo");
        }
    } catch (error) {
        console.error('Error al subir justificativo:', error);
        alert('Error al subir justificativo');
    }
}

/* ------------------------ BÚSQUEDA ------------------------ */
document.getElementById("searchMat")?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#tablaMaterias tbody tr").forEach(tr => {
        const materia = tr.children[0]?.textContent.toLowerCase() || '';
        tr.style.display = materia.includes(q) ? "" : "none";
    });
});

/* ------------------------ AUTENTICACIÓN ------------------------ */
function verificarAutenticacion() {
    const userData = sessionStorage.getItem('userData');
    if (!userData) {
        alert('Debe iniciar sesión primero');
        window.location.href = '../index.html';
        return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'estudiante') {
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

/* ------------------------ PERFIL ------------------------ */
function cargarPerfil() {
    const usuario = getUsuarioActual();
    if (usuario) {
        document.getElementById("perfilNombre").textContent = `${usuario.nombre} ${usuario.apellido}`;
        document.getElementById("perfilCorreo").textContent = usuario.correo;
    }
}

/* ------------------------ INICIALIZAR ------------------------ */
window.onload = () => {
    verificarAutenticacion();
    renderMaterias();
    renderObservaciones();
    cargarAsistencias();
    cargarPerfil();
    cargarMateriasDisponibles();
    
    // Configurar botón de cerrar sesión
    document.getElementById('logoutBtn')?.addEventListener('click', cerrarSesion);
};