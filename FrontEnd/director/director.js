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
let filtrosActuales = {
    periodo: '',
    carrera: '',
    docente: '',
    materia: ''
};

/* ------------------------ DASHBOARD INICIAL ------------------------ */
async function cargarDashboard() {
    try {
        const response = await fetch(`${API_URL}/director/dashboard`);
        
        if (!response.ok) {
            throw new Error('Error al cargar dashboard');
        }

        const data = await response.json();
        
        document.getElementById("totalEstudiantes").innerText = data.totalEstudiantes || 0;
        document.getElementById("promedioGeneral").innerText = data.promedioGeneral ? data.promedioGeneral.toFixed(2) : '--';
        document.getElementById("asistenciaPromedio").innerText = data.asistenciaPromedio ? data.asistenciaPromedio.toFixed(1) + '%' : '--';
        document.getElementById("alertasActivas").innerText = data.alertasActivas || 0;
        
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        // Mostrar valores por defecto en caso de error
        document.getElementById("totalEstudiantes").innerText = '0';
        document.getElementById("promedioGeneral").innerText = '--';
        document.getElementById("asistenciaPromedio").innerText = '--';
        document.getElementById("alertasActivas").innerText = '0';
    }
}

/* ------------------------ CARGAR FILTROS ------------------------ */
async function cargarFiltros() {
    try {
        // Cargar periodos
        const responsePeriodos = await fetch(`${API_URL}/director/periodos`);
        if (responsePeriodos.ok) {
            const periodos = await responsePeriodos.json();
            const selectsPeriodo = ['filterPeriodo', 'selectPeriodoAsis'];
            
            selectsPeriodo.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    select.innerHTML = '<option value="">Todos los periodos</option>';
                    periodos.forEach(p => {
                        select.innerHTML += `<option value="${p.idPeriodo}">${p.nombre}</option>`;
                    });
                }
            });
        }

        // Cargar docentes
        const responseDocentes = await fetch(`${API_URL}/director/docentes`);
        if (responseDocentes.ok) {
            const docentes = await responseDocentes.json();
            const select = document.getElementById('filterDocente');
            if (select) {
                select.innerHTML = '<option value="">Todos los docentes</option>';
                docentes.forEach(d => {
                    select.innerHTML += `<option value="${d.idUsuario}">${d.nombre} ${d.apellido}</option>`;
                });
            }
        }

        // Cargar materias
        const responseMaterias = await fetch(`${API_URL}/director/materias`);
        if (responseMaterias.ok) {
            const materias = await responseMaterias.json();
            const select = document.getElementById('filterMateria');
            if (select) {
                select.innerHTML = '<option value="">Todas las materias</option>';
                materias.forEach(m => {
                    select.innerHTML += `<option value="${m.idMateria}">${m.nombre} (${m.codigo})</option>`;
                });
            }
        }

    } catch (error) {
        console.error('Error al cargar filtros:', error);
    }
}

/* ------------------------ APLICAR FILTROS ------------------------ */
function aplicarFiltros() {
    filtrosActuales = {
        periodo: document.getElementById('filterPeriodo')?.value || '',
        carrera: document.getElementById('filterCarrera')?.value || '',
        docente: document.getElementById('filterDocente')?.value || '',
        materia: document.getElementById('filterMateria')?.value || ''
    };
    
    cargarReporteConsolidado();
}

function limpiarFiltros() {
    document.getElementById('filterPeriodo').value = '';
    document.getElementById('filterCarrera').value = '';
    document.getElementById('filterDocente').value = '';
    document.getElementById('filterMateria').value = '';
    
    filtrosActuales = {
        periodo: '',
        carrera: '',
        docente: '',
        materia: ''
    };
    
    cargarReporteConsolidado();
}

/* ------------------------ REPORTES CONSOLIDADOS ------------------------ */
async function cargarReporteConsolidado() {
    try {
        const params = new URLSearchParams(filtrosActuales);
        const response = await fetch(`${API_URL}/director/reporte-consolidado?${params}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar reporte');
        }

        const data = await response.json();
        const contenedor = document.getElementById('reporteResumen');
        
        if (!data || data.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px;">No hay datos disponibles con los filtros seleccionados</p>';
            return;
        }

        let html = '<div class="grid">';
        html += `<div class="card"><h3>Materias</h3><div class="stat">${data.totalMaterias || 0}</div></div>`;
        html += `<div class="card"><h3>Estudiantes</h3><div class="stat">${data.totalEstudiantes || 0}</div></div>`;
        html += `<div class="card"><h3>Promedio</h3><div class="stat">${data.promedioGeneral ? data.promedioGeneral.toFixed(2) : '--'}</div></div>`;
        html += `<div class="card"><h3>Aprobación</h3><div class="stat">${data.porcentajeAprobacion ? data.porcentajeAprobacion.toFixed(1) + '%' : '--'}</div></div>`;
        html += '</div>';
        
        html += '<h3 style="margin-top:20px;">Detalle por Materia</h3>';
        html += '<table><thead><tr><th>Materia</th><th>Docente</th><th>Estudiantes</th><th>Promedio</th><th>Aprobados</th><th>Reprobados</th></tr></thead><tbody>';
        
        if (data.detalleMaterias && data.detalleMaterias.length > 0) {
            data.detalleMaterias.forEach(m => {
                html += `<tr>
                    <td>${m.materia}</td>
                    <td>${m.docente}</td>
                    <td>${m.estudiantes}</td>
                    <td>${m.promedio ? m.promedio.toFixed(2) : '--'}</td>
                    <td>${m.aprobados || 0}</td>
                    <td>${m.reprobados || 0}</td>
                </tr>`;
            });
        } else {
            html += '<tr><td colspan="6" style="text-align:center;">No hay datos disponibles</td></tr>';
        }
        
        html += '</tbody></table>';
        contenedor.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar reporte consolidado:', error);
        document.getElementById('reporteResumen').innerHTML = '<p style="color:red; text-align:center;">Error al cargar el reporte</p>';
    }
}

/* ------------------------ CALIFICACIONES ------------------------ */
async function cargarCalificaciones() {
    try {
        const response = await fetch(`${API_URL}/director/calificaciones`);
        
        if (!response.ok) {
            throw new Error('Error al cargar calificaciones');
        }

        const calificaciones = await response.json();
        let tabla = document.getElementById("tablaCalificaciones");
        tabla.innerHTML = '';
        
        if (calificaciones.length === 0) {
            tabla.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay datos de calificaciones disponibles</td></tr>';
            return;
        }
        
        calificaciones.forEach(c => {
            const aprobados = c.aprobados || 0;
            const reprobados = c.reprobados || 0;
            
            tabla.innerHTML += `
                <tr>
                    <td>${c.materia}</td>
                    <td>${c.docente}</td>
                    <td>${c.estudiantes}</td>
                    <td>${c.promedio ? c.promedio.toFixed(2) : '--'}</td>
                    <td style="color: green;">${aprobados}</td>
                    <td style="color: red;">${reprobados}</td>
                    <td><button onclick="verDetalleMateria(${c.idMateriaPeriodo})">Ver Detalle</button></td>
                </tr>`;
        });
        
    } catch (error) {
        console.error('Error al cargar calificaciones:', error);
        alert('Error al cargar calificaciones');
    }
}

function verDetalleMateria(idMateriaPeriodo) {
    alert(`Ver detalle de materia ${idMateriaPeriodo}\nEsta función mostraría todos los estudiantes de esta materia con sus calificaciones.`);
}

/* ------------------------ ASISTENCIA ------------------------ */
async function cargarAsistencia() {
    try {
        const periodo = document.getElementById('selectPeriodoAsis')?.value || '';
        const url = periodo ? `${API_URL}/director/asistencia?periodo=${periodo}` : `${API_URL}/director/asistencia`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al cargar asistencia');
        }

        const data = await response.json();
        
        document.getElementById("asistenciaGlobal").innerText = data.asistenciaGlobal ? data.asistenciaGlobal.toFixed(1) + '%' : '--';
        document.getElementById("estudiantesBajaAsis").innerText = data.estudiantesBajaAsistencia || 0;
        
        let tabla = document.getElementById("tablaAsistencia");
        tabla.innerHTML = '';
        
        if (!data.detalle || data.detalle.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay datos de asistencia disponibles</td></tr>';
            return;
        }
        
        data.detalle.forEach(a => {
            const porcentaje = a.porcentajeAsistencia || 0;
            const colorClass = porcentaje < 80 ? 'style="color:red; font-weight:bold;"' : '';
            
            tabla.innerHTML += `
                <tr>
                    <td>${a.estudiante}</td>
                    <td>${a.materia}</td>
                    <td>${a.presentes || 0}</td>
                    <td>${a.ausentes || 0}</td>
                    <td>${a.tardanzas || 0}</td>
                    <td ${colorClass}>${porcentaje.toFixed(1)}%</td>
                </tr>`;
        });
        
    } catch (error) {
        console.error('Error al cargar asistencia:', error);
        alert('Error al cargar datos de asistencia');
    }
}

/* ------------------------ OBSERVACIONES ------------------------ */
async function cargarObservaciones() {
    try {
        const tipo = document.getElementById('selectTipoObs')?.value || '';
        const url = tipo ? `${API_URL}/director/observaciones?tipo=${tipo}` : `${API_URL}/director/observaciones`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al cargar observaciones');
        }

        const observaciones = await response.json();
        let tabla = document.getElementById("tablaObservaciones");
        tabla.innerHTML = '';
        
        if (observaciones.length === 0) {
            tabla.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay observaciones registradas</td></tr>';
            return;
        }
        
        observaciones.forEach(o => {
            const fecha = new Date(o.fecha).toLocaleDateString('es-ES');
            const tipoBadge = o.tipo === 'academica' ? 
                '<span style="background:#3b82f6; color:white; padding:2px 8px; border-radius:4px;">Académica</span>' :
                '<span style="background:#ef4444; color:white; padding:2px 8px; border-radius:4px;">Conductual</span>';
            
            tabla.innerHTML += `
                <tr>
                    <td>${fecha}</td>
                    <td>${o.estudiante}</td>
                    <td>${o.materia}</td>
                    <td>${o.profesor}</td>
                    <td>${tipoBadge}</td>
                    <td>${o.detalle}</td>
                    <td>${o.estado}</td>
                </tr>`;
        });
        
    } catch (error) {
        console.error('Error al cargar observaciones:', error);
        alert('Error al cargar observaciones');
    }
}

/* ------------------------ ALERTAS ------------------------ */
async function cargarAlertas() {
    try {
        const response = await fetch(`${API_URL}/director/alertas`);
        
        if (!response.ok) {
            throw new Error('Error al cargar alertas');
        }

        const data = await response.json();
        
        // Actualizar contadores
        document.getElementById("alertasBajoRendimiento").innerText = data.bajoRendimiento?.length || 0;
        document.getElementById("alertasInasistencias").innerText = data.inasistencias?.length || 0;
        
        // Tabla de bajo rendimiento
        let tablaBajo = document.getElementById("tablaBajoRendimiento");
        tablaBajo.innerHTML = '';
        
        if (!data.bajoRendimiento || data.bajoRendimiento.length === 0) {
            tablaBajo.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay alertas de bajo rendimiento</td></tr>';
        } else {
            data.bajoRendimiento.forEach(a => {
                const promedio = a.promedio ? a.promedio.toFixed(2) : '--';
                tablaBajo.innerHTML += `
                    <tr>
                        <td>${a.estudiante}</td>
                        <td>${a.materia}</td>
                        <td style="color:red; font-weight:bold;">${promedio}</td>
                        <td><span style="background:#fef2f2; color:#991b1b; padding:2px 8px; border-radius:4px;">Riesgo</span></td>
                    </tr>`;
            });
        }
        
        // Tabla de inasistencias
        let tablaInas = document.getElementById("tablaInasistencias");
        tablaInas.innerHTML = '';
        
        if (!data.inasistencias || data.inasistencias.length === 0) {
            tablaInas.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay alertas de inasistencias</td></tr>';
        } else {
            data.inasistencias.forEach(a => {
                const porcentaje = a.porcentajeAsistencia ? a.porcentajeAsistencia.toFixed(1) : '--';
                tablaInas.innerHTML += `
                    <tr>
                        <td>${a.estudiante}</td>
                        <td>${a.materia}</td>
                        <td style="color:red; font-weight:bold;">${porcentaje}%</td>
                        <td>${a.faltas || 0}</td>
                    </tr>`;
            });
        }
        
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        alert('Error al cargar alertas');
    }
}

/* ------------------------ EXPORTAR REPORTES ------------------------ */
function exportarPDF() {
    alert('Exportando reporte a PDF...\n\nEsta funcionalidad generaría un archivo PDF con los datos filtrados.');
    // Aquí implementarías la lógica de exportación real usando una librería como jsPDF
    console.log('Exportar PDF con filtros:', filtrosActuales);
}

function exportarExcel() {
    alert('Exportando reporte a Excel...\n\nEsta funcionalidad generaría un archivo Excel con los datos filtrados.');
    // Aquí implementarías la lógica de exportación real usando una librería como SheetJS
    console.log('Exportar Excel con filtros:', filtrosActuales);
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
    if (user.role !== 'director') {
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

/* ------------------------ EVENTOS DE FILTROS ------------------------ */
function configurarEventosFiltros() {
    const selectPeriodoAsis = document.getElementById('selectPeriodoAsis');
    if (selectPeriodoAsis) {
        selectPeriodoAsis.addEventListener('change', cargarAsistencia);
    }
}

/* ------------------------ INIT ------------------------ */
window.onload = () => {
    verificarAutenticacion();
    cargarDashboard();
    cargarFiltros();
    cargarPerfil();
    configurarEventosFiltros();
    
    // Cargar datos iniciales de cada sección
    cargarReporteConsolidado();
    cargarCalificaciones();
    cargarAsistencia();
    cargarObservaciones();
    cargarAlertas();
    
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
};