function mostrar(id) {
    document.querySelectorAll(".seccion").forEach(sec => sec.classList.remove("visible"));
    document.getElementById(id).classList.add("visible");
}

/* ------------------------ DATOS DE EJEMPLO -------------------------
   Estos datos luego vendrán desde tu API en .NET → SQL Server
-------------------------------------------------------------------- */

let materias = [
    { materia: "Matemáticas", curso: "1A", periodo: "2025-1" },
    { materia: "Física", curso: "1B", periodo: "2025-1" }
];

let estudiantes = [
    { id: 1, nombre: "Juan Pérez" },
    { id: 2, nombre: "Ana Torres" }
];

/* ------------------------ LLENAR MATERIAS ------------------------ */
function cargarMaterias() {
    let tabla = document.getElementById("tablaMaterias");
    materias.forEach(m => {
        tabla.innerHTML += `
            <tr>
                <td>${m.materia}</td>
                <td>${m.curso}</td>
                <td>${m.periodo}</td>
            </tr>`;
    });

    // Para selects
    ["materiaCalifSelect","materiaAsisSelect","materiaObsSelect"].forEach(id => {
        let sel = document.getElementById(id);
        materias.forEach(m => {
            sel.innerHTML += `<option>${m.materia} (${m.curso})</option>`;
        });
    });
}

/* ------------------------ CALIFICACIONES ------------------------ */
function cargarCalificaciones() {
    let tabla = document.getElementById("tablaCalificaciones");
    estudiantes.forEach(e => {
        tabla.innerHTML += `
            <tr>
                <td>${e.nombre}</td>
                <td><input type="number" min="0" max="10" id="nota_${e.id}"></td>
                <td><button onclick="guardarNota(${e.id})">Guardar</button></td>
            </tr>`;
    });
}

function guardarNota(id) {
    let nota = document.getElementById("nota_" + id).value;
    alert("Nota guardada: " + nota);
    // Aquí llamarías al backend con fetch() para guardar en SQL Server
}

/* ------------------------ ASISTENCIA ------------------------ */
function cargarAsistencia() {
    let tabla = document.getElementById("tablaAsistencia");
    estudiantes.forEach(e => {
        tabla.innerHTML += `
            <tr>
                <td>${e.nombre}</td>
                <td>
                    <select>
                        <option>Presente</option>
                        <option>Ausente</option>
                        <option>Tardanza</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

/* ------------------------ OBSERVACIONES ------------------------ */
function cargarObservaciones() {
    let tabla = document.getElementById("tablaObservaciones");
    estudiantes.forEach(e => {
        tabla.innerHTML += `
            <tr>
                <td>${e.nombre}</td>
                <td><input type="text" id="obs_${e.id}" placeholder="Detalle..."></td>
                <td>
                    <select id="tipo_${e.id}">
                        <option>Académica</option>
                        <option>Conductual</option>
                    </select>
                </td>
                <td><button onclick="guardarObs(${e.id})">Registrar</button></td>
            </tr>`;
    });
}

function guardarObs(id) {
    let detalle = document.getElementById("obs_" + id).value;
    let tipo = document.getElementById("tipo_" + id).value;
    alert("Observación registrada: " + detalle);
}

/* ------------------------ PERFIL ------------------------ */
function cargarPerfil() {
    document.getElementById("perfilNombre").innerText = "Profesor Ejemplo";
    document.getElementById("perfilCorreo").innerText = "profesor@siga.edu";
}

/* ------------------------ INIT ------------------------ */
window.onload = () => {
    cargarMaterias();
    cargarCalificaciones();
    cargarAsistencia();
    cargarObservaciones();
    cargarPerfil();
};
