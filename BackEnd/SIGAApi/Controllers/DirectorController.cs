using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;
using SIGAApi.Models;

namespace SIGAApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DirectorController : ControllerBase
    {
        private readonly string _connectionString;

        public DirectorController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("SIGAConnection") 
                ?? throw new InvalidOperationException("Connection string not found");
        }

        // ============================================
        // DASHBOARD INICIAL
        // ============================================
        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                // Total de estudiantes activos
                var queryEstudiantes = @"
                    SELECT COUNT(DISTINCT u.id_usuario) 
                    FROM USUARIO u 
                    INNER JOIN MATRICULA m ON u.id_usuario = m.id_estudiante 
                    WHERE u.id_rol = 3 AND m.estado = 'activa'";
                var totalEstudiantes = await connection.ExecuteScalarAsync<int>(queryEstudiantes);

                // Promedio general
                var queryPromedio = @"
                    SELECT AVG(CAST(c.promedio AS DECIMAL(10,2)))
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    WHERE md.estado = 'inscrita'";
                var promedioGeneral = await connection.ExecuteScalarAsync<decimal?>(queryPromedio) ?? 0;

                // Asistencia promedio
                var queryAsistencia = @"
                    SELECT AVG(CAST(porcentaje AS DECIMAL(10,2)))
                    FROM (
                        SELECT 
                            (SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) AS porcentaje
                        FROM ASISTENCIA
                        GROUP BY id_detalle
                    ) AS subquery";
                var asistenciaPromedio = await connection.ExecuteScalarAsync<decimal?>(queryAsistencia) ?? 0;

                // Alertas activas
                var queryAlertas = @"
                    SELECT 
                        (SELECT COUNT(*) FROM CALIFICACION WHERE promedio < 7.0) +
                        (SELECT COUNT(DISTINCT a.id_detalle)
                         FROM ASISTENCIA a
                         GROUP BY a.id_detalle
                         HAVING (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) < 80)";
                var alertasActivas = await connection.ExecuteScalarAsync<int>(queryAlertas);

                return Ok(new
                {
                    totalEstudiantes,
                    promedioGeneral,
                    asistenciaPromedio,
                    alertasActivas
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar dashboard: {ex.Message}");
            }
        }

        // ============================================
        // FILTROS - PERIODOS
        // ============================================
        [HttpGet("periodos")]
        public async Task<ActionResult> GetPeriodos()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_periodo AS idPeriodo,
                        nombre AS nombre,
                        fecha_inicio AS fechaInicio,
                        fecha_fin AS fechaFin,
                        estado AS estado
                    FROM PERIODO_ACADEMICO 
                    ORDER BY fecha_inicio DESC";

                var periodos = await connection.QueryAsync(query);
                return Ok(periodos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar periodos: {ex.Message}");
            }
        }

        // ============================================
        // FILTROS - DOCENTES
        // ============================================
        [HttpGet("docentes")]
        public async Task<ActionResult> GetDocentes()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_usuario AS idUsuario,
                        nombre AS nombre,
                        apellido AS apellido,
                        correo AS correo
                    FROM USUARIO 
                    WHERE id_rol = 2 AND estado = 'activo' 
                    ORDER BY nombre";

                var docentes = await connection.QueryAsync(query);
                return Ok(docentes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar docentes: {ex.Message}");
            }
        }

        // ============================================
        // FILTROS - MATERIAS
        // ============================================
        [HttpGet("materias")]
        public async Task<ActionResult> GetMaterias()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_materia AS idMateria,
                        nombre AS nombre,
                        codigo AS codigo,
                        creditos AS creditos
                    FROM MATERIA 
                    ORDER BY nombre";

                var materias = await connection.QueryAsync(query);
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar materias: {ex.Message}");
            }
        }

        // ============================================
        // REPORTE CONSOLIDADO
        // ============================================
        [HttpGet("reporte-consolidado")]
        public async Task<ActionResult> GetReporteConsolidado(
            [FromQuery] string periodo = "",
            [FromQuery] string carrera = "",
            [FromQuery] string docente = "",
            [FromQuery] string materia = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereConditions = new List<string> { "1=1" };
                var parameters = new DynamicParameters();

                if (!string.IsNullOrEmpty(periodo))
                {
                    whereConditions.Add("mp.id_periodo = @Periodo");
                    parameters.Add("Periodo", periodo);
                }
                if (!string.IsNullOrEmpty(docente))
                {
                    whereConditions.Add("mp.id_profesor = @Docente");
                    parameters.Add("Docente", docente);
                }
                if (!string.IsNullOrEmpty(materia))
                {
                    whereConditions.Add("m.id_materia = @Materia");
                    parameters.Add("Materia", materia);
                }

                var whereClause = string.Join(" AND ", whereConditions);

                // Resumen general
                var queryResumen = $@"
                    SELECT 
                        COUNT(DISTINCT mp.id_materia_periodo) AS totalMaterias,
                        COUNT(DISTINCT md.id_matricula) AS totalEstudiantes,
                        AVG(CAST(c.promedio AS DECIMAL(10,2))) AS promedioGeneral,
                        (SUM(CASE WHEN c.promedio >= 7.0 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS porcentajeAprobacion
                    FROM MATERIA_PERIODO mp
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    LEFT JOIN MATRICULA_DETALLE md ON mp.id_materia_periodo = md.id_materia_periodo
                    LEFT JOIN CALIFICACION c ON md.id_detalle = c.id_detalle
                    WHERE {whereClause}";

                var resumen = await connection.QueryFirstOrDefaultAsync(queryResumen, parameters);

                // Detalle por materia
                var queryDetalle = $@"
                    SELECT 
                        m.nombre AS materia,
                        u.nombre + ' ' + u.apellido AS docente,
                        COUNT(DISTINCT md.id_detalle) AS estudiantes,
                        AVG(CAST(c.promedio AS DECIMAL(10,2))) AS promedio,
                        SUM(CASE WHEN c.promedio >= 7.0 THEN 1 ELSE 0 END) AS aprobados,
                        SUM(CASE WHEN c.promedio < 7.0 THEN 1 ELSE 0 END) AS reprobados
                    FROM MATERIA_PERIODO mp
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN USUARIO u ON mp.id_profesor = u.id_usuario
                    LEFT JOIN MATRICULA_DETALLE md ON mp.id_materia_periodo = md.id_materia_periodo
                    LEFT JOIN CALIFICACION c ON md.id_detalle = c.id_detalle
                    WHERE {whereClause}
                    GROUP BY m.nombre, u.nombre, u.apellido
                    ORDER BY m.nombre";

                var detalleMaterias = await connection.QueryAsync(queryDetalle, parameters);

                return Ok(new
                {
                    totalMaterias = resumen?.totalMaterias ?? 0,
                    totalEstudiantes = resumen?.totalEstudiantes ?? 0,
                    promedioGeneral = resumen?.promedioGeneral ?? 0,
                    porcentajeAprobacion = resumen?.porcentajeAprobacion ?? 0,
                    detalleMaterias
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar reporte consolidado: {ex.Message}");
            }
        }

        // ============================================
        // CALIFICACIONES
        // ============================================
        [HttpGet("calificaciones")]
        public async Task<ActionResult> GetCalificaciones()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        mp.id_materia_periodo AS idMateriaPeriodo,
                        m.nombre AS materia,
                        u.nombre + ' ' + u.apellido AS docente,
                        COUNT(DISTINCT md.id_detalle) AS estudiantes,
                        AVG(CAST(c.promedio AS DECIMAL(10,2))) AS promedio,
                        SUM(CASE WHEN c.promedio >= 7.0 THEN 1 ELSE 0 END) AS aprobados,
                        SUM(CASE WHEN c.promedio < 7.0 THEN 1 ELSE 0 END) AS reprobados
                    FROM MATERIA_PERIODO mp
                    INNER JOIN MATERIA m ON mp.id_materia = m.id_materia
                    INNER JOIN USUARIO u ON mp.id_profesor = u.id_usuario
                    LEFT JOIN MATRICULA_DETALLE md ON mp.id_materia_periodo = md.id_materia_periodo
                    LEFT JOIN CALIFICACION c ON md.id_detalle = c.id_detalle
                    WHERE md.estado = 'inscrita'
                    GROUP BY mp.id_materia_periodo, m.nombre, u.nombre, u.apellido
                    ORDER BY m.nombre";

                var calificaciones = await connection.QueryAsync(query);
                return Ok(calificaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar calificaciones: {ex.Message}");
            }
        }

        // ============================================
        // ASISTENCIA
        // ============================================
        [HttpGet("asistencia")]
        public async Task<ActionResult> GetAsistencia([FromQuery] string periodo = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereClause = !string.IsNullOrEmpty(periodo) ? "AND mp.id_periodo = @Periodo" : "";
                var parameters = new DynamicParameters();
                if (!string.IsNullOrEmpty(periodo))
                {
                    parameters.Add("Periodo", periodo);
                }

                // Asistencia global
                var queryGlobal = $@"
                    SELECT AVG(CAST(porcentaje AS DECIMAL(10,2))) AS asistenciaGlobal
                    FROM (
                        SELECT 
                            (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) AS porcentaje
                        FROM ASISTENCIA a
                        INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                        INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                        WHERE 1=1 {whereClause}
                        GROUP BY a.id_detalle
                    ) AS subquery";

                var asistenciaGlobal = await connection.ExecuteScalarAsync<decimal?>(queryGlobal, parameters) ?? 0;

                // Estudiantes con baja asistencia
                var queryBaja = $@"
                    SELECT COUNT(*) 
                    FROM (
                        SELECT a.id_detalle
                        FROM ASISTENCIA a
                        INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                        INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                        WHERE 1=1 {whereClause}
                        GROUP BY a.id_detalle
                        HAVING (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) < 80
                    ) AS subquery";

                var estudiantesBajaAsistencia = await connection.ExecuteScalarAsync<int>(queryBaja, parameters);

                // Detalle por estudiante
                var queryDetalle = $@"
                    SELECT 
                        u.nombre + ' ' + u.apellido AS estudiante,
                        mat.nombre AS materia,
                        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
                        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
                        SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) AS tardanzas,
                        (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) AS porcentajeAsistencia
                    FROM ASISTENCIA a
                    INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA mat ON mp.id_materia = mat.id_materia
                    WHERE 1=1 {whereClause}
                    GROUP BY u.nombre, u.apellido, mat.nombre
                    ORDER BY porcentajeAsistencia ASC";

                var detalle = await connection.QueryAsync(queryDetalle, parameters);

                return Ok(new
                {
                    asistenciaGlobal,
                    estudiantesBajaAsistencia,
                    detalle
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar asistencia: {ex.Message}");
            }
        }

        // ============================================
        // OBSERVACIONES
        // ============================================
        [HttpGet("observaciones")]
        public async Task<ActionResult> GetObservaciones([FromQuery] string tipo = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereClause = !string.IsNullOrEmpty(tipo) ? "AND o.tipo = @Tipo" : "";
                var parameters = new DynamicParameters();
                if (!string.IsNullOrEmpty(tipo))
                {
                    parameters.Add("Tipo", tipo);
                }

                var query = $@"
                    SELECT 
                        o.fecha AS fecha,
                        u.nombre + ' ' + u.apellido AS estudiante,
                        mat.nombre AS materia,
                        prof.nombre + ' ' + prof.apellido AS profesor,
                        o.tipo AS tipo,
                        o.detalle AS detalle,
                        o.estado AS estado
                    FROM OBSERVACION o
                    INNER JOIN MATRICULA_DETALLE md ON o.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA mat ON mp.id_materia = mat.id_materia
                    INNER JOIN USUARIO prof ON o.id_profesor = prof.id_usuario
                    WHERE 1=1 {whereClause}
                    ORDER BY o.fecha DESC";

                var observaciones = await connection.QueryAsync(query, parameters);
                return Ok(observaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar observaciones: {ex.Message}");
            }
        }

        // ============================================
        // ALERTAS
        // ============================================
        [HttpGet("alertas")]
        public async Task<ActionResult> GetAlertas()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                // Estudiantes con bajo rendimiento (promedio < 7.0)
                var queryBajoRendimiento = @"
                    SELECT 
                        u.nombre + ' ' + u.apellido AS estudiante,
                        mat.nombre AS materia,
                        c.promedio AS promedio
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA mat ON mp.id_materia = mat.id_materia
                    WHERE c.promedio < 7.0 AND md.estado = 'inscrita'
                    ORDER BY c.promedio ASC";

                var bajoRendimiento = await connection.QueryAsync(queryBajoRendimiento);

                // Estudiantes con inasistencias elevadas (< 80%)
                var queryInasistencias = @"
                    SELECT 
                        u.nombre + ' ' + u.apellido AS estudiante,
                        mat.nombre AS materia,
                        (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) AS porcentajeAsistencia,
                        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) AS faltas
                    FROM ASISTENCIA a
                    INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN MATERIA_PERIODO mp ON md.id_materia_periodo = mp.id_materia_periodo
                    INNER JOIN MATERIA mat ON mp.id_materia = mat.id_materia
                    GROUP BY u.nombre, u.apellido, mat.nombre, a.id_detalle
                    HAVING (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / COUNT(*) < 80
                    ORDER BY porcentajeAsistencia ASC";

                var inasistencias = await connection.QueryAsync(queryInasistencias);

                return Ok(new
                {
                    bajoRendimiento,
                    inasistencias
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar alertas: {ex.Message}");
            }
        }
    }
}