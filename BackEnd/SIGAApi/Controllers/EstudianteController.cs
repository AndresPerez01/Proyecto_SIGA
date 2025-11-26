using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;

namespace SIGAApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EstudianteController : ControllerBase
    {
        private readonly string _connectionString;

        public EstudianteController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("SIGAConnection") 
                ?? throw new InvalidOperationException("Connection string not found");
        }

        // GET: api/estudiante/materias-inscritas/8
        [HttpGet("materias-inscritas/{idEstudiante}")]
        public async Task<ActionResult> GetMateriasInscritas(int idEstudiante)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        md.id_detalle AS idDetalle,
                        m.nombre AS nombreMateria,
                        m.codigo AS codigo,
                        p.nombre AS periodo,
                        prof.nombre + ' ' + prof.apellido AS docente,
                        ISNULL(c.tareas, 0) AS tareas,
                        ISNULL(c.trabajos_clase, 0) AS trabajosClase,
                        ISNULL(c.proyecto, 0) AS proyecto,
                        ISNULL(c.participacion, 0) AS participacion,
                        ISNULL(c.pruebas, 0) AS pruebas,
                        ISNULL(c.examenes, 0) AS examenes,
                        ISNULL(c.promedio, 0) AS promedio,
                        md.estado AS estado
                    FROM MATRICULA mat
                    INNER JOIN MATRICULA_DETALLE md ON mat.id_matricula = md.id_matricula
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN PERIODO_ACADEMICO p ON mp.id_periodo = p.id_periodo
                    INNER JOIN USUARIO prof ON mp.id_profesor = prof.id_usuario
                    LEFT JOIN CALIFICACION c ON md.id_detalle = c.id_detalle
                    WHERE mat.id_estudiante = @IdEstudiante
                    AND p.estado = 'activo'
                    AND md.estado IN ('inscrita', 'aprobada', 'reprobada')
                    ORDER BY m.nombre";

                var materias = await connection.QueryAsync(query, new { IdEstudiante = idEstudiante });
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/estudiante/materias-disponibles/8
        [HttpGet("materias-disponibles/{idEstudiante}")]
        public async Task<ActionResult> GetMateriasDisponibles(int idEstudiante)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        mp.id_materia_periodo AS idMateriaPeriodo,
                        m.nombre AS nombreMateria,
                        m.codigo AS codigo,
                        m.creditos AS creditos,
                        p.nombre AS periodo,
                        prof.nombre + ' ' + prof.apellido AS docente,
                        mp.horario AS horario,
                        mp.aula AS aula,
                        mp.cupo_maximo AS cupoMaximo,
                        mp.cupo_actual AS cupoActual,
                        (mp.cupo_maximo - mp.cupo_actual) AS cuposDisponibles
                    FROM MATERIA_PERIODO mp
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN PERIODO_ACADEMICO p ON mp.id_periodo = p.id_periodo
                    INNER JOIN USUARIO prof ON mp.id_profesor = prof.id_usuario
                    WHERE p.estado = 'activo'
                    AND mp.cupo_actual < mp.cupo_maximo
                    AND mp.id_materia_periodo NOT IN (
                        SELECT md.id_materia_periodo 
                        FROM MATRICULA mat
                        INNER JOIN MATRICULA_DETALLE md ON mat.id_matricula = md.id_matricula
                        WHERE mat.id_estudiante = @IdEstudiante
                        AND mat.id_periodo = p.id_periodo
                    )
                    ORDER BY m.nombre";

                var materias = await connection.QueryAsync(query, new { IdEstudiante = idEstudiante });
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/estudiante/info-matricula/8
        [HttpGet("info-matricula/{idEstudiante}")]
        public async Task<ActionResult> GetInfoMatricula(int idEstudiante)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        m.id_matricula AS idMatricula,
                        m.total_materias AS totalMaterias,
                        p.nombre AS periodo
                    FROM MATRICULA m
                    INNER JOIN PERIODO_ACADEMICO p ON m.id_periodo = p.id_periodo
                    WHERE m.id_estudiante = @IdEstudiante
                    AND p.estado = 'activo'";

                var info = await connection.QueryFirstOrDefaultAsync(query, new { IdEstudiante = idEstudiante });
                
                if (info == null)
                {
                    return Ok(new { idMatricula = 0, totalMaterias = 0, periodo = "N/A" });
                }
                
                return Ok(info);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // POST: api/estudiante/inscribir-materia
        [HttpPost("inscribir-materia")]
        public async Task<ActionResult> InscribirMateria([FromBody] InscripcionRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                // Verificar que no tenga 5 materias
                var checkQuery = @"
                    SELECT total_materias FROM MATRICULA 
                    WHERE id_estudiante = @IdEstudiante 
                    AND id_periodo = (SELECT id_periodo FROM MATERIA_PERIODO WHERE id_materia_periodo = @IdMateriaPeriodo)";
                
                var totalMaterias = await connection.QueryFirstOrDefaultAsync<int>(checkQuery, request);
                
                if (totalMaterias >= 5)
                {
                    return BadRequest(new { message = "No puede inscribirse en más de 5 materias por periodo" });
                }

                // Obtener id_matricula
                var matriculaQuery = @"
                    SELECT m.id_matricula 
                    FROM MATRICULA m
                    INNER JOIN MATERIA_PERIODO mp ON mp.id_periodo = m.id_periodo
                    WHERE m.id_estudiante = @IdEstudiante
                    AND mp.id_materia_periodo = @IdMateriaPeriodo";
                
                var idMatricula = await connection.QueryFirstOrDefaultAsync<int>(matriculaQuery, request);

                if (idMatricula == 0)
                {
                    return BadRequest(new { message = "No se encontró matrícula activa para este periodo" });
                }

                // Inscribir materia
                var insertQuery = @"
                    INSERT INTO MATRICULA_DETALLE (id_matricula, id_materia_periodo)
                    VALUES (@IdMatricula, @IdMateriaPeriodo)";

                await connection.ExecuteAsync(insertQuery, new { IdMatricula = idMatricula, request.IdMateriaPeriodo });
                
                return Ok(new { message = "Materia inscrita exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/estudiante/asistencias/8
        [HttpGet("asistencias/{idEstudiante}")]
        public async Task<ActionResult> GetAsistencias(int idEstudiante)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        m.nombre AS materia,
                        a.fecha AS fecha,
                        a.estado AS estado,
                        a.justificativo AS justificativo
                    FROM ASISTENCIA a
                    INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA mat ON md.id_matricula = mat.id_matricula
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN PERIODO_ACADEMICO p ON mp.id_periodo = p.id_periodo
                    WHERE mat.id_estudiante = @IdEstudiante
                    AND p.estado = 'activo'
                    ORDER BY a.fecha DESC";

                var asistencias = await connection.QueryAsync(query, new { IdEstudiante = idEstudiante });
                return Ok(asistencias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/estudiante/observaciones/8
        [HttpGet("observaciones/{idEstudiante}")]
        public async Task<ActionResult> GetObservaciones(int idEstudiante)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        o.detalle AS detalle,
                        o.tipo AS tipo,
                        o.fecha AS fecha,
                        m.nombre AS materia,
                        prof.nombre + ' ' + prof.apellido AS profesor
                    FROM OBSERVACION o
                    INNER JOIN MATRICULA_DETALLE md ON o.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA mat ON md.id_matricula = mat.id_matricula
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN USUARIO prof ON o.id_profesor = prof.id_usuario
                    INNER JOIN PERIODO_ACADEMICO p ON mp.id_periodo = p.id_periodo
                    WHERE mat.id_estudiante = @IdEstudiante
                    AND p.estado = 'activo'
                    ORDER BY o.fecha DESC";

                var observaciones = await connection.QueryAsync(query, new { IdEstudiante = idEstudiante });
                return Ok(observaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        // POST: api/estudiante/subir-justificativo
        [HttpPost("subir-justificativo")]
        public async Task<ActionResult> SubirJustificativo([FromBody] JustificativoRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    UPDATE ASISTENCIA 
                    SET justificativo = @Justificativo,
                        archivo_justificativo = @ArchivoNombre
                    WHERE id_detalle IN (
                        SELECT md.id_detalle 
                        FROM MATRICULA_DETALLE md
                        INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                        WHERE m.id_estudiante = @IdEstudiante
                    )
                    AND fecha = @Fecha
                    AND estado = 'ausente'";

                await connection.ExecuteAsync(query, request);
                return Ok(new { message = "Justificativo enviado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }
    }

    // DTOs
    public class InscripcionRequest
    {
        public int IdEstudiante { get; set; }
        public int IdMateriaPeriodo { get; set; }
    }

    public class JustificativoRequest
    {
        public int IdEstudiante { get; set; }
        public DateTime Fecha { get; set; }
        public string Justificativo { get; set; } = null!;
        public string ArchivoNombre { get; set; } = null!;
    }
}