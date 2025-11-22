// Datos de prueba
const materias = [
    { materia: "Matemáticas", docente: "J. Pérez", p1: 8.5, p2: 9.0, final: 8.7 },
    { materia: "Física", docente: "M. Gómez", p1: 7.2, p2: 8.0, final: 7.6 },
    { materia: "Historia", docente: "L. Ruiz", p1: 9.0, p2: 9.3, final: 9.1 }
];

const observaciones = [
    { texto: "Retrasos frecuentes", fecha: "10/11/2025" },
    { texto: "Buen desempeño", fecha: "01/10/2025" }
];

// Cambiar sección visible
function showSection(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

// Renderizar materias
function renderMaterias() {
    const tbody = document.querySelector("#tablaMaterias tbody");
    tbody.innerHTML = "";

    materias.forEach((m, i) => {
        let prom = ((m.p1 + m.p2 + m.final) / 3).toFixed(2);
        const row = `
            <tr>
                <td>${m.materia}</td>
                <td>${m.docente}</td>
                <td>${m.p1}</td>
                <td>${m.p2}</td>
                <td>${m.final}</td>
                <td>${prom}</td>
                <td><button onclick="alert('Detalle de ${m.materia}')">Ver</button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // promedio general
    const promedio = materias.reduce((a, m) => a + ((m.p1 + m.p2 + m.final) / 3), 0) / materias.length;
    document.getElementById("promedio").textContent = promedio.toFixed(2);
}

// Observaciones
function renderObservaciones() {
    const ul = document.getElementById("obsList");
    ul.innerHTML = "";

    observaciones.forEach(o => {
        ul.innerHTML += `<li><strong>${o.fecha}</strong> - ${o.texto}</li>`;
    });

    document.getElementById("obsCount").textContent = observaciones.length;
}

// Justificativos
function subirJustificativo() {
    const file = document.getElementById("fileJusti").files[0];
    if (!file) return alert("Seleccione un archivo");

    const list = document.getElementById("uploadedFiles");
    list.innerHTML += `<p>${file.name} subido correctamente ✔</p>`;
}

// Búsqueda
document.getElementById("searchMat").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#tablaMaterias tbody tr").forEach(tr => {
        tr.style.display = tr.children[0].textContent.toLowerCase().includes(q)
            ? ""
            : "none";
    });
});

// Inicializar
renderMaterias();
renderObservaciones();
