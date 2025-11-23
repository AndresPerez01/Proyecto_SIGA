// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacion();
    inicializarDashboard();
});

// Verificar si el usuario está autenticado
function verificarAutenticacion() {
    const userData = sessionStorage.getItem('userData');
    
    if (!userData) {
        alert('Debe iniciar sesión primero');
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(userData);
    
    if (user.role !== 'director') {
        alert('No tiene permisos para acceder a esta página');
        window.location.href = 'index.html';
        return;
    }
    
    // Mostrar nombre del usuario
    document.getElementById('userNameDisplay').textContent = user.username;
}

// Botón de logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        sessionStorage.removeItem('userData');
        window.location.href = 'index.html';
    }
});

// Datos simulados
const datosCarreras = [
    { carrera: 'Ingeniería', promedio: 85, aprobados: 92, reprobados: 8, estudiantes: 312 },
    { carrera: 'Medicina', promedio: 88, aprobados: 95, reprobados: 5, estudiantes: 280 },
    { carrera: 'Derecho', promedio: 82, aprobados: 88, reprobados: 12, estudiantes: 356 },
    { carrera: 'Arquitectura', promedio: 86, aprobados: 90, reprobados: 10, estudiantes: 300 }
];

const datosAsistencia = [
    { mes: 'Ene', asistencia: 92 },
    { mes: 'Feb', asistencia: 89 },
    { mes: 'Mar', asistencia: 91 },
    { mes: 'Abr', asistencia: 87 },
    { mes: 'May', asistencia: 90 }
];

const alertasEstudiantes = [
    { id: 1, nombre: 'Juan Pérez', carrera: 'Ingeniería', motivo: 'Bajo rendimiento', promedio: 65, faltas: 5 },
    { id: 2, nombre: 'María González', carrera: 'Medicina', motivo: 'Inasistencias elevadas', promedio: 78, faltas: 12 },
    { id: 3, nombre: 'Carlos Ramírez', carrera: 'Derecho', motivo: 'Bajo rendimiento', promedio: 62, faltas: 8 },
    { id: 4, nombre: 'Ana Torres', carrera: 'Arquitectura', motivo: 'Inasistencias elevadas', promedio: 75, faltas: 15 }
];

// Variables para los gráficos
let rendimientoChart = null;
let asistenciaChart = null;

// Función de inicialización del dashboard
function inicializarDashboard() {
    cargarTablaCalificaciones();
    cargarAlertas();
    crearGraficos();
    configurarFiltros();
    configurarExportacion();
}

// Cargar tabla de calificaciones
function cargarTablaCalificaciones() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    datosCarreras.forEach(carrera => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${carrera.carrera}</td>
            <td class="td-promedio">${carrera.promedio}</td>
            <td class="td-aprobados">${carrera.aprobados}%</td>
            <td class="td-reprobados">${carrera.reprobados}%</td>
            <td>${carrera.estudiantes}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Cargar alertas
function cargarAlertas() {
    const alertasList = document.getElementById('alertasList');
    const alertasBadge = document.getElementById('alertasBadge');
    
    alertasList.innerHTML = '';
    alertasBadge.textContent = `${alertasEstudiantes.length} alertas`;
    
    alertasEstudiantes.forEach(alerta => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <div class="alert-left">
                <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                    <p class="alert-student-name">${alerta.nombre}</p>
                    <p class="alert-student-carrera">${alerta.carrera}</p>
                </div>
            </div>
            <div class="alert-right">
                <p class="alert-motivo">${alerta.motivo}</p>
                <p class="alert-details">Promedio: ${alerta.promedio} | Faltas: ${alerta.faltas}</p>
            </div>
        `;
        alertasList.appendChild(alertItem);
    });
}

// Crear gráficos
function crearGraficos() {
    // Gráfico de rendimiento por carrera
    const ctxRendimiento = document.getElementById('rendimientoChart').getContext('2d');
    if (rendimientoChart) {
        rendimientoChart.destroy();
    }
    rendimientoChart = new Chart(ctxRendimiento, {
        type: 'bar',
        data: {
            labels: datosCarreras.map(c => c.carrera),
            datasets: [
                {
                    label: 'Promedio',
                    data: datosCarreras.map(c => c.promedio),
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1
                },
                {
                    label: '% Aprobados',
                    data: datosCarreras.map(c => c.aprobados),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Gráfico de asistencia
    const ctxAsistencia = document.getElementById('asistenciaChart').getContext('2d');
    if (asistenciaChart) {
        asistenciaChart.destroy();
    }
    asistenciaChart = new Chart(ctxAsistencia, {
        type: 'line',
        data: {
            labels: datosAsistencia.map(a => a.mes),
            datasets: [{
                label: '% Asistencia',
                data: datosAsistencia.map(a => a.asistencia),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 80,
                    max: 100
                }
            }
        }
    });
}

// Configurar filtros
function configurarFiltros() {
    const filterCarrera = document.getElementById('filterCarrera');
    const filterPeriodo = document.getElementById('filterPeriodo');
    const filterCurso = document.getElementById('filterCurso');
    const filterDocente = document.getElementById('filterDocente');
    
    [filterCarrera, filterPeriodo, filterCurso, filterDocente].forEach(filter => {
        filter.addEventListener('change', aplicarFiltros);
    });
}

// Aplicar filtros
function aplicarFiltros() {
    const carrera = document.getElementById('filterCarrera').value;
    const periodo = document.getElementById('filterPeriodo').value;
    const curso = document.getElementById('filterCurso').value;
    const docente = document.getElementById('filterDocente').value;
    
    console.log('Filtros aplicados:', { carrera, periodo, curso, docente });
    
    // Aquí puedes implementar la lógica de filtrado real
    // Por ahora mostramos un mensaje
    alert(`Filtros aplicados:\nCarrera: ${carrera}\nPeriodo: ${periodo}\nCurso: ${curso}\nDocente: ${docente}`);
}

// Configurar exportación
function configurarExportacion() {
    const exportPDF = document.getElementById('exportPDF');
    const exportExcel = document.getElementById('exportExcel');
    
    exportPDF.addEventListener('click', () => exportarReporte('PDF'));
    exportExcel.addEventListener('click', () => exportarReporte('Excel'));
}

// Exportar reporte
function exportarReporte(formato) {
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    const fecha = new Date().toLocaleDateString('es-ES');
    
    alert(`Generando reporte en formato ${formato}...\n\nUsuario: ${userData.username}\nFecha: ${fecha}\n\nEsta funcionalidad generaría un archivo ${formato} con todos los datos del dashboard.`);
    
    // Aquí implementarías la lógica real de exportación
    // Por ejemplo, usando librerías como jsPDF o SheetJS
    console.log(`Exportando en formato ${formato}`);
}