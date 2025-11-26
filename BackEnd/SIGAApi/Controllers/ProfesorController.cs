using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;
using SIGAApi.Models;

namespace SIGAApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfesorController : ControllerBase
    {
        private readonly string _connectionString;

        public ProfesorController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("SIGAConnection") 
                ?? throw new InvalidOperationException("Connection string not found");
        }

        // GET: api/profesor/materias/3
        [HttpGet("materias/{idProfesor}")]
        public async Task<ActionResult<IEnumerable<MateriaProfesorDTO>>> GetMaterias(int idProfesor)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        mp.id_materia_periodo AS IdMateriaPeriodo,
                        m.nombre AS Nombre,
                        m.codigo AS Codigo,
                        p.nombre AS Periodo,
                        mp.horario AS Horario,
                        mp.aula AS Aula,
                        mp.cupo_maximo AS CupoMaximo,
                        mp.cupo_actual AS CupoActual
                    FROM MATERIA_PERIODO mp
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN PERIODO_ACADEMICO p ON mp.id_periodo = p.id_periodo
                    WHERE mp.id_profesor = @IdProfesor
                    AND p.estado = 'activo'
                    ORDER BY m.nombre";

                var materias = await connection.QueryAsync<MateriaProfesorDTO>(query, new { IdProfesor = idProfesor });
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener materias: {ex.Message}");
            }
        }

        // GET: api/profesor/estudiantes/1
        [HttpGet("estudiantes/{idMateriaPeriodo}")]
        public async Task<ActionResult<IEnumerable<EstudianteDTO>>> GetEstudiantes(int idMateriaPeriodo)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        u.id_usuario AS IdUsuario,
                        md.id_detalle AS IdDetalle,
                        u.nombre + ' ' + u.apellido AS NombreCompleto,
                        u.correo AS Correo
                    FROM MATRICULA_DETALLE md
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_materia_periodo = @IdMateriaPeriodo
                    AND md.estado IN ('inscrita', 'aprobada', 'reprobada')
                    ORDER BY u.nombre, u.apellido";

                var estudiantes = await connection.QueryAsync<EstudianteDTO>(query, new { IdMateriaPeriodo = idMateriaPeriodo });
                return Ok(estudiantes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener estudiantes: {ex.Message}");
            }
        }

        // GET: api/profesor/calificaciones/1
        [HttpGet("calificaciones/{idMateriaPeriodo}")]
        public async Task<ActionResult<IEnumerable<CalificacionDTO>>> GetCalificaciones(int idMateriaPeriodo)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        c.id_calificacion AS IdCalificacion,
                        c.id_detalle AS IdDetalle,
                        u.nombre + ' ' + u.apellido AS Estudiante,
                        c.tareas AS Tareas,
                        c.trabajos_clase AS TrabajosClase,
                        c.proyecto AS Proyecto,
                        c.participacion AS Participacion,
                        c.pruebas AS Pruebas,
                        c.examenes AS Examenes,
                        c.promedio AS Promedio
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_materia_periodo = @IdMateriaPeriodo
                    ORDER BY u.nombre, u.apellido";

                var calificaciones = await connection.QueryAsync<CalificacionDTO>(query, new { IdMateriaPeriodo = idMateriaPeriodo });
                return Ok(calificaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener calificaciones: {ex.Message}");
            }
        }

        // POST: api/profesor/calificacion
        [HttpPost("calificacion")]
        public async Task<ActionResult> GuardarCalificacion([FromBody] CalificacionRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    UPDATE CALIFICACION SET
                        tareas = ISNULL(@Tareas, tareas),
                        trabajos_clase = ISNULL(@TrabajosClase, trabajos_clase),
                        proyecto = ISNULL(@Proyecto, proyecto),
                        participacion = ISNULL(@Participacion, participacion),
                        pruebas = ISNULL(@Pruebas, pruebas),
                        examenes = ISNULL(@Examenes, examenes),
                        fecha_actualizacion = GETDATE()
                    WHERE id_detalle = @IdDetalle";

                await connection.ExecuteAsync(query, request);
                return Ok(new { message = "Calificación guardada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al guardar calificación: {ex.Message}");
            }
        }

        // GET: api/profesor/asistencias/1
        [HttpGet("asistencias/{idMateriaPeriodo}")]
        public async Task<ActionResult<IEnumerable<AsistenciaDTO>>> GetAsistencias(int idMateriaPeriodo)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        a.id_asistencia AS IdAsistencia,
                        u.nombre + ' ' + u.apellido AS Estudiante,
                        a.fecha AS Fecha,
                        a.estado AS Estado,
                        a.justificativo AS Justificativo
                    FROM ASISTENCIA a
                    INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_materia_periodo = @IdMateriaPeriodo
                    ORDER BY a.fecha DESC, u.nombre";

                var asistencias = await connection.QueryAsync<AsistenciaDTO>(query, new { IdMateriaPeriodo = idMateriaPeriodo });
                return Ok(asistencias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener asistencias: {ex.Message}");
            }
        }

        // POST: api/profesor/asistencia
        [HttpPost("asistencia")]
        public async Task<ActionResult> GuardarAsistencia([FromBody] AsistenciaRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    IF EXISTS (SELECT 1 FROM ASISTENCIA WHERE id_detalle = @IdDetalle AND fecha = @Fecha)
                        UPDATE ASISTENCIA SET 
                            estado = @Estado,
                            justificativo = @Justificativo,
                            fecha_registro = GETDATE()
                        WHERE id_detalle = @IdDetalle AND fecha = @Fecha
                    ELSE
                        INSERT INTO ASISTENCIA (id_detalle, fecha, estado, justificativo)
                        VALUES (@IdDetalle, @Fecha, @Estado, @Justificativo)";

                await connection.ExecuteAsync(query, request);
                return Ok(new { message = "Asistencia registrada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al registrar asistencia: {ex.Message}");
            }
        }

        // GET: api/profesor/observaciones/1
        [HttpGet("observaciones/{idMateriaPeriodo}")]
        public async Task<ActionResult<IEnumerable<ObservacionDTO>>> GetObservaciones(int idMateriaPeriodo)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        o.id_observacion AS IdObservacion,
                        u.nombre + ' ' + u.apellido AS Estudiante,
                        o.detalle AS Detalle,
                        o.tipo AS Tipo,
                        o.fecha AS Fecha,
                        o.estado AS Estado
                    FROM OBSERVACION o
                    INNER JOIN MATRICULA_DETALLE md ON o.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_materia_periodo = @IdMateriaPeriodo
                    ORDER BY o.fecha DESC";

                var observaciones = await connection.QueryAsync<ObservacionDTO>(query, new { IdMateriaPeriodo = idMateriaPeriodo });
                return Ok(observaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener observaciones: {ex.Message}");
            }
        }

        // POST: api/profesor/observacion
        [HttpPost("observacion")]
        public async Task<ActionResult> GuardarObservacion([FromBody] ObservacionRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    INSERT INTO OBSERVACION (id_detalle, id_profesor, detalle, tipo)
                    VALUES (@IdDetalle, @IdProfesor, @Detalle, @Tipo)";

                await connection.ExecuteAsync(query, request);
                return Ok(new { message = "Observación registrada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al registrar observación: {ex.Message}");
            }
        }

        // GET: api/profesor/perfil/3
        [HttpGet("perfil/{idProfesor}")]
        public async Task<ActionResult<ProfesorPerfilDTO>> GetPerfil(int idProfesor)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        u.id_usuario AS IdUsuario,
                        u.nombre AS Nombre,
                        u.apellido AS Apellido,
                        u.correo AS Correo,
                        r.nombre_rol AS Rol
                    FROM USUARIO u
                    INNER JOIN ROL r ON u.id_rol = r.id_rol
                    WHERE u.id_usuario = @IdProfesor";

                var perfil = await connection.QueryFirstOrDefaultAsync<ProfesorPerfilDTO>(query, new { IdProfesor = idProfesor });
                
                if (perfil == null)
                    return NotFound("Profesor no encontrado");
                    
                return Ok(perfil);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener perfil: {ex.Message}");
            }
        }
    }
}