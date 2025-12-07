using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;

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
                    WHERE u.id_rol = 3 AND u.estado = 'activo'";
                var totalEstudiantes = await connection.ExecuteScalarAsync<int>(queryEstudiantes);

                // Total de profesores activos
                var queryProfesores = @"
                    SELECT COUNT(DISTINCT id_usuario) 
                    FROM USUARIO 
                    WHERE id_rol = 2 AND estado = 'activo'";
                var totalProfesores = await connection.ExecuteScalarAsync<int>(queryProfesores);

                // Promedio general de calificaciones
                var queryPromedio = @"
                    SELECT ISNULL(AVG(CAST(c.promedio AS DECIMAL(10,2))), 0)
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    WHERE md.estado = 'inscrita'";
                var promedioGeneral = await connection.ExecuteScalarAsync<decimal>(queryPromedio);

                // Alertas de bajo rendimiento
                var queryAlertasRendimiento = @"
                    SELECT COUNT(*) 
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    WHERE c.promedio < 7.0 AND md.estado = 'inscrita'";
                var alertasRendimiento = await connection.ExecuteScalarAsync<int>(queryAlertasRendimiento);

                // Alertas de inasistencias
                var queryAlertasAsistencia = @"
                    SELECT COUNT(*)
                    FROM (
                        SELECT a.id_detalle
                        FROM ASISTENCIA a
                        GROUP BY a.id_detalle
                        HAVING (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) < 80
                    ) AS subquery";
                var alertasAsistencia = await connection.ExecuteScalarAsync<int>(queryAlertasAsistencia);

                var alertasActivas = alertasRendimiento + alertasAsistencia;

                return Ok(new
                {
                    totalEstudiantes,
                    totalProfesores,
                    promedioGeneral,
                    alertasActivas
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar dashboard: {ex.Message}");
            }
        }

        // ============================================
        // GESTIÓN DE PROFESORES
        // ============================================
        [HttpGet("profesores")]
        public async Task<ActionResult> GetProfesores()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        u.id_usuario AS idUsuario,
                        u.uuid_usuario AS uuidUsuario,
                        u.nombre AS nombre,
                        u.apellido AS apellido,
                        u.correo AS correo,
                        u.estado AS estado,
                        p.titulo AS titulo,
                        COUNT(pa.id_profesor_asignatura) AS materiasAsignadas
                    FROM USUARIO u
                    INNER JOIN PROFESOR p ON u.id_usuario = p.id_profesor
                    LEFT JOIN PROFESOR_ASIGNATURA pa ON p.id_profesor = pa.id_profesor
                    WHERE u.id_rol = 2
                    GROUP BY u.id_usuario, u.uuid_usuario, u.nombre, u.apellido, u.correo, u.estado, p.titulo
                    ORDER BY u.nombre, u.apellido";

                var profesores = await connection.QueryAsync(query);
                return Ok(profesores);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al cargar profesores: {ex.Message}");
            }
        }

        [HttpPost("crear-profesor")]
        public async Task<ActionResult> CrearProfesor([FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string nombre = body.nombre;
                string apellido = body.apellido;
                string correo = body.correo;
                string contrasena = body.contrasena;
                string titulo = body.titulo;

                var parameters = new DynamicParameters();
                parameters.Add("@nombre", nombre);
                parameters.Add("@apellido", apellido);
                parameters.Add("@correo", correo);
                parameters.Add("@contrasena_plana", contrasena);
                parameters.Add("@id_rol", 2);
                parameters.Add("@uuid_creado", dbType: System.Data.DbType.Guid, direction: System.Data.ParameterDirection.Output);

                await connection.ExecuteAsync("sp_crear_usuario", parameters, commandType: System.Data.CommandType.StoredProcedure);
                
                var uuidCreado = parameters.Get<Guid>("@uuid_creado");
                var idUsuario = await connection.ExecuteScalarAsync<int>("SELECT id_usuario FROM USUARIO WHERE uuid_usuario = @UUID", new { UUID = uuidCreado });

                await connection.ExecuteAsync(
                    "INSERT INTO PROFESOR (id_profesor, titulo) VALUES (@IdProfesor, @Titulo)",
                    new { IdProfesor = idUsuario, Titulo = titulo });

                return Ok(new { mensaje = "Profesor creado exitosamente", uuidCreado });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear profesor: {ex.Message}");
            }
        }

        [HttpPut("cambiar-estado-profesor/{id}")]
        public async Task<ActionResult> CambiarEstadoProfesor(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                string estado = body.estado;
                
                await connection.ExecuteAsync(
                    "UPDATE USUARIO SET estado = @Estado WHERE id_usuario = @Id",
                    new { Estado = estado, Id = id });

                return Ok(new { mensaje = "Estado actualizado correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("materias-asignadas-profesor/{id}")]
        public async Task<ActionResult> GetMateriasAsignadasProfesor(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        pa.id_profesor_asignatura AS idProfesorAsignatura,
                        pa.uuid_profesor_asignatura AS uuidProfesorAsignatura,
                        a.nombre AS asignatura,
                        c.nombre + ' ' + p.nombre AS cursoParalelo,
                        pa.cupo_actual AS cupoActual,
                        pa.cupo_maximo AS cupoMaximo,
                        pa.aula AS aula,
                        'Actual' AS periodo
                    FROM PROFESOR_ASIGNATURA pa
                    INNER JOIN ASIGNATURA a ON pa.id_asignatura = a.id_asignatura
                    INNER JOIN CURSO_PARALELO cp ON pa.id_curso_paralelo = cp.id_curso_paralelo
                    INNER JOIN CURSO c ON cp.id_curso = c.id_curso
                    INNER JOIN PARALELO p ON cp.id_paralelo = p.id_paralelo
                    WHERE pa.id_profesor = @IdProfesor
                    ORDER BY a.nombre";

                var materias = await connection.QueryAsync(query, new { IdProfesor = id });
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPost("asignar-profesor-asignatura")]
        public async Task<ActionResult> AsignarProfesorAsignatura([FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                int idProfesor = body.idProfesor;
                int idAsignatura = body.idAsignatura;
                int idCursoParalelo = body.idCursoParalelo;
                int cupoMaximo = body.cupoMaximo;
                string aula = body.aula;

                await connection.ExecuteAsync(@"
                    INSERT INTO PROFESOR_ASIGNATURA (id_profesor, id_asignatura, id_curso_paralelo, cupo_maximo, aula)
                    VALUES (@IdProfesor, @IdAsignatura, @IdCursoParalelo, @CupoMaximo, @Aula)",
                    new { IdProfesor = idProfesor, IdAsignatura = idAsignatura, IdCursoParalelo = idCursoParalelo, CupoMaximo = cupoMaximo, Aula = aula });

                return Ok(new { mensaje = "Materia asignada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpDelete("eliminar-asignacion/{id}")]
        public async Task<ActionResult> EliminarAsignacion(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                await connection.ExecuteAsync(
                    "DELETE FROM PROFESOR_ASIGNATURA WHERE id_profesor_asignatura = @Id",
                    new { Id = id });

                return Ok(new { mensaje = "Asignación eliminada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // GESTIÓN DE ESTUDIANTES
        // ============================================
        [HttpGet("estudiantes-completo")]
        public async Task<ActionResult> GetEstudiantesCompleto()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        u.id_usuario AS idUsuario,
                        u.uuid_usuario AS uuidUsuario,
                        u.nombre AS nombre,
                        u.apellido AS apellido,
                        u.correo AS correo,
                        u.estado AS estado,
                        u.fecha_creacion AS fechaCreacion,
                        m.id_periodo AS idPeriodo,
                        pa.nombre AS periodo,
                        m.id_curso_paralelo AS idCursoParalelo,
                        c.nombre + ' ' + p.nombre AS cursoParalelo
                    FROM USUARIO u
                    LEFT JOIN MATRICULA m ON u.id_usuario = m.id_estudiante AND m.estado = 'activa'
                    LEFT JOIN PERIODO_ACADEMICO pa ON m.id_periodo = pa.id_periodo
                    LEFT JOIN CURSO_PARALELO cp ON m.id_curso_paralelo = cp.id_curso_paralelo
                    LEFT JOIN CURSO c ON cp.id_curso = c.id_curso
                    LEFT JOIN PARALELO p ON cp.id_paralelo = p.id_paralelo
                    WHERE u.id_rol = 3
                    ORDER BY u.nombre, u.apellido";

                var estudiantes = await connection.QueryAsync(query);
                return Ok(estudiantes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPost("crear-estudiante")]
        public async Task<ActionResult> CrearEstudiante([FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string nombre = body.nombre;
                string apellido = body.apellido;
                string correo = body.correo;
                string contrasena = body.contrasena;
                int idPeriodo = body.idPeriodo;
                int idCursoParalelo = body.idCursoParalelo;

                var parameters = new DynamicParameters();
                parameters.Add("@nombre", nombre);
                parameters.Add("@apellido", apellido);
                parameters.Add("@correo", correo);
                parameters.Add("@contrasena_plana", contrasena);
                parameters.Add("@id_rol", 3);
                parameters.Add("@uuid_creado", dbType: System.Data.DbType.Guid, direction: System.Data.ParameterDirection.Output);

                await connection.ExecuteAsync("sp_crear_usuario", parameters, commandType: System.Data.CommandType.StoredProcedure);
                
                var uuidCreado = parameters.Get<Guid>("@uuid_creado");
                var idUsuario = await connection.ExecuteScalarAsync<int>("SELECT id_usuario FROM USUARIO WHERE uuid_usuario = @UUID", new { UUID = uuidCreado });

                // Crear matrícula automáticamente
                await connection.ExecuteAsync(@"
                    INSERT INTO MATRICULA (id_estudiante, id_periodo, id_curso_paralelo, total_materias, estado)
                    VALUES (@IdEstudiante, @IdPeriodo, @IdCursoParalelo, 0, 'activa')",
                    new { IdEstudiante = idUsuario, IdPeriodo = idPeriodo, IdCursoParalelo = idCursoParalelo });

                return Ok(new { mensaje = "Estudiante creado exitosamente", uuidCreado });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("actualizar-estudiante/{id}")]
        public async Task<ActionResult> ActualizarEstudiante(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string nombre = body.nombre;
                string apellido = body.apellido;
                string correo = body.correo;
                
                await connection.ExecuteAsync(@"
                    UPDATE USUARIO 
                    SET nombre = @Nombre, apellido = @Apellido, correo = @Correo 
                    WHERE id_usuario = @Id",
                    new { Nombre = nombre, Apellido = apellido, Correo = correo, Id = id });

                return Ok(new { mensaje = "Datos actualizados correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("cambiar-estado-estudiante/{id}")]
        public async Task<ActionResult> CambiarEstadoEstudiante(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                string estado = body.estado;
                
                await connection.ExecuteAsync(
                    "UPDATE USUARIO SET estado = @Estado WHERE id_usuario = @Id",
                    new { Estado = estado, Id = id });

                return Ok(new { mensaje = "Estado actualizado correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("matriculas-estudiante/{id}")]
        public async Task<ActionResult> GetMatriculasEstudiante(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        m.id_matricula AS idMatricula,
                        m.uuid_matricula AS uuidMatricula,
                        pa.nombre AS periodo,
                        c.nombre + ' ' + p.nombre AS cursoParalelo,
                        m.total_materias AS totalMaterias,
                        m.estado AS estado
                    FROM MATRICULA m
                    INNER JOIN PERIODO_ACADEMICO pa ON m.id_periodo = pa.id_periodo
                    INNER JOIN CURSO_PARALELO cp ON m.id_curso_paralelo = cp.id_curso_paralelo
                    INNER JOIN CURSO c ON cp.id_curso = c.id_curso
                    INNER JOIN PARALELO p ON cp.id_paralelo = p.id_paralelo
                    WHERE m.id_estudiante = @IdEstudiante
                    ORDER BY pa.fecha_inicio DESC";

                var matriculas = await connection.QueryAsync(query, new { IdEstudiante = id });
                return Ok(matriculas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPost("resetear-contrasena")]
        public async Task<ActionResult> ResetearContrasena([FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                int idUsuarioObjetivo = body.idUsuarioObjetivo;
                string contrasenaNueva = body.contrasenaNueva;
                int idUsuarioAdmin = body.idUsuarioAdmin;

                await connection.ExecuteAsync(
                    "sp_resetear_contrasena", 
                    new { 
                        id_usuario_objetivo = idUsuarioObjetivo, 
                        contrasena_nueva = contrasenaNueva,
                        id_usuario_admin = idUsuarioAdmin
                    }, 
                    commandType: System.Data.CommandType.StoredProcedure);

                return Ok(new { mensaje = "Contraseña reseteada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // PERIODOS Y CATÁLOGOS
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
                        uuid_periodo AS uuidPeriodo,
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
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("asignaturas")]
        public async Task<ActionResult> GetAsignaturas()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_asignatura AS idAsignatura,
                        uuid_asignatura AS uuidAsignatura,
                        nombre AS nombre,
                        descripcion AS descripcion,
                        area AS area
                    FROM ASIGNATURA 
                    ORDER BY nombre";

                var asignaturas = await connection.QueryAsync(query);
                return Ok(asignaturas);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("cursos-paralelos")]
        public async Task<ActionResult> GetCursosParalelos()
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        cp.id_curso_paralelo AS idCursoParalelo,
                        cp.uuid_curso_paralelo AS uuidCursoParalelo,
                        c.nombre AS curso,
                        p.nombre AS paralelo
                    FROM CURSO_PARALELO cp
                    INNER JOIN CURSO c ON cp.id_curso = c.id_curso
                    INNER JOIN PARALELO p ON cp.id_paralelo = p.id_paralelo
                    ORDER BY c.nombre, p.nombre";

                var cursos = await connection.QueryAsync(query);
                return Ok(cursos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // GESTIÓN DE MATERIAS
        // ============================================
        [HttpPost("crear-asignatura")]
        public async Task<ActionResult> CrearAsignatura([FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string nombre = body.nombre;
                string descripcion = body.descripcion;
                string area = body.area;

                await connection.ExecuteAsync(@"
                    INSERT INTO ASIGNATURA (nombre, descripcion, area)
                    VALUES (@Nombre, @Descripcion, @Area)",
                    new { Nombre = nombre, Descripcion = descripcion, Area = area });

                return Ok(new { mensaje = "Asignatura creada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("asignaturas-por-curso-paralelo")]
        public async Task<ActionResult> GetAsignaturasPorCursoParalelo([FromQuery] string periodo, [FromQuery] string cursoParalelo)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT DISTINCT
                        a.id_asignatura AS idAsignatura,
                        a.nombre AS nombre,
                        pa.id_profesor_asignatura AS idProfesorAsignatura
                    FROM ASIGNATURA a
                    INNER JOIN PROFESOR_ASIGNATURA pa ON a.id_asignatura = pa.id_asignatura
                    WHERE pa.id_curso_paralelo = @CursoParalelo
                    ORDER BY a.nombre";

                var materias = await connection.QueryAsync(query, new { CursoParalelo = cursoParalelo });
                return Ok(materias);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("materias-detalle")]
        public async Task<ActionResult> GetMateriasDetalle([FromQuery] string periodo, [FromQuery] string cursoParalelo = "", [FromQuery] string asignatura = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereConditions = new List<string> { "1=1" };
                var parameters = new DynamicParameters();

                if (!string.IsNullOrEmpty(cursoParalelo))
                {
                    whereConditions.Add("pa.id_curso_paralelo = @CursoParalelo");
                    parameters.Add("CursoParalelo", cursoParalelo);
                }
                if (!string.IsNullOrEmpty(asignatura))
                {
                    whereConditions.Add("a.id_asignatura = @Asignatura");
                    parameters.Add("Asignatura", asignatura);
                }

                var whereClause = string.Join(" AND ", whereConditions);

                var query = $@"
                    SELECT 
                        'Actual' AS periodo,
                        a.nombre AS asignatura,
                        c.nombre + ' ' + p.nombre AS cursoParalelo,
                        u.nombre + ' ' + u.apellido AS docente,
                        COUNT(DISTINCT md.id_detalle) AS estudiantes,
                        AVG(CAST(cal.promedio AS DECIMAL(10,2))) AS promedio,
                        SUM(CASE WHEN cal.promedio >= 7.0 THEN 1 ELSE 0 END) AS aprobados,
                        SUM(CASE WHEN cal.promedio < 7.0 THEN 1 ELSE 0 END) AS reprobados,
                        a.id_asignatura AS idAsignatura
                    FROM PROFESOR_ASIGNATURA pa
                    INNER JOIN ASIGNATURA a ON pa.id_asignatura = a.id_asignatura
                    INNER JOIN CURSO_PARALELO cp ON pa.id_curso_paralelo = cp.id_curso_paralelo
                    INNER JOIN CURSO c ON cp.id_curso = c.id_curso
                    INNER JOIN PARALELO p ON cp.id_paralelo = p.id_paralelo
                    INNER JOIN PROFESOR prof ON pa.id_profesor = prof.id_profesor
                    INNER JOIN USUARIO u ON prof.id_profesor = u.id_usuario
                    LEFT JOIN MATRICULA_DETALLE md ON pa.id_profesor_asignatura = md.id_profesor_asignatura
                    LEFT JOIN CALIFICACION cal ON md.id_detalle = cal.id_detalle
                    WHERE {whereClause}
                    GROUP BY a.nombre, c.nombre, p.nombre, u.nombre, u.apellido, a.id_asignatura
                    ORDER BY a.nombre";

                var detalle = await connection.QueryAsync(query, parameters);
                return Ok(detalle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("asignatura/{id}")]
        public async Task<ActionResult> GetAsignatura(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_asignatura AS idAsignatura,
                        nombre AS nombre,
                        descripcion AS descripcion,
                        area AS area
                    FROM ASIGNATURA
                    WHERE id_asignatura = @Id";

                var asignatura = await connection.QueryFirstOrDefaultAsync(query, new { Id = id });
                return Ok(asignatura);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("actualizar-asignatura/{id}")]
        public async Task<ActionResult> ActualizarAsignatura(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string nombre = body.nombre;
                string descripcion = body.descripcion;
                string area = body.area;
                
                await connection.ExecuteAsync(@"
                    UPDATE ASIGNATURA 
                    SET nombre = @Nombre, descripcion = @Descripcion, area = @Area 
                    WHERE id_asignatura = @Id",
                    new { Nombre = nombre, Descripcion = descripcion, Area = area, Id = id });

                return Ok(new { mensaje = "Asignatura actualizada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // CALIFICACIONES
        // ============================================
        [HttpGet("calificaciones-detalle")]
        public async Task<ActionResult> GetCalificacionesDetalle([FromQuery] int profesorAsignatura)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        c.id_calificacion AS idCalificacion,
                        u.nombre + ' ' + u.apellido AS estudiante,
                        c.tareas AS tareas,
                        c.trabajos_clase AS trabajosClase,
                        c.proyecto AS proyecto,
                        c.participacion AS participacion,
                        c.pruebas AS pruebas,
                        c.examenes AS examenes,
                        c.promedio AS promedio
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_profesor_asignatura = @ProfesorAsignatura AND md.estado = 'inscrita'
                    ORDER BY u.apellido, u.nombre";

                var detalle = await connection.QueryAsync(query, new { ProfesorAsignatura = profesorAsignatura });
                return Ok(detalle);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("calificacion/{id}")]
        public async Task<ActionResult> GetCalificacion(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_calificacion AS idCalificacion,
                        tareas AS tareas,
                        trabajos_clase AS trabajosClase,
                        proyecto AS proyecto,
                        participacion AS participacion,
                        pruebas AS pruebas,
                        examenes AS examenes,
                        promedio AS promedio
                    FROM CALIFICACION
                    WHERE id_calificacion = @Id";

                var calificacion = await connection.QueryFirstOrDefaultAsync(query, new { Id = id });
                return Ok(calificacion);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("actualizar-calificacion/{id}")]
        public async Task<ActionResult> ActualizarCalificacion(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                decimal tareas = body.tareas;
                decimal trabajos = body.trabajosClase;
                decimal proyecto = body.proyecto;
                decimal participacion = body.participacion;
                decimal pruebas = body.pruebas;
                decimal examenes = body.examenes;
                
                // Calcular promedio
                decimal promedio = (tareas + trabajos + proyecto + participacion + pruebas + examenes) / 6;
                
                await connection.ExecuteAsync(@"
                    UPDATE CALIFICACION 
                    SET tareas = @Tareas, 
                        trabajos_clase = @Trabajos, 
                        proyecto = @Proyecto, 
                        participacion = @Participacion, 
                        pruebas = @Pruebas, 
                        examenes = @Examenes,
                        promedio = @Promedio
                    WHERE id_calificacion = @Id",
                    new { Tareas = tareas, Trabajos = trabajos, Proyecto = proyecto, 
                          Participacion = participacion, Pruebas = pruebas, Examenes = examenes,
                          Promedio = promedio, Id = id });

                return Ok(new { mensaje = "Calificación actualizada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // ASISTENCIA
        // ============================================
        [HttpGet("asistencia-detalle")]
        public async Task<ActionResult> GetAsistenciaDetalle([FromQuery] int profesorAsignatura)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var queryGlobal = @"
                    SELECT AVG(CAST(porcentaje AS DECIMAL(10,2))) AS asistenciaGlobal
                    FROM (
                        SELECT 
                            (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS porcentaje
                        FROM ASISTENCIA a
                        INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                        WHERE md.id_profesor_asignatura = @ProfesorAsignatura
                        GROUP BY a.id_detalle
                    ) AS subquery";

                var asistenciaGlobal = await connection.ExecuteScalarAsync<decimal?>(queryGlobal, new { ProfesorAsignatura = profesorAsignatura }) ?? 0;

                var queryBaja = @"
                    SELECT COUNT(*) 
                    FROM (
                        SELECT a.id_detalle
                        FROM ASISTENCIA a
                        INNER JOIN MATRICULA_DETALLE md ON a.id_detalle = md.id_detalle
                        WHERE md.id_profesor_asignatura = @ProfesorAsignatura
                        GROUP BY a.id_detalle
                        HAVING (SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) < 80
                    ) AS subquery";

                var estudiantesBajaAsistencia = await connection.ExecuteScalarAsync<int>(queryBaja, new { ProfesorAsignatura = profesorAsignatura });

                var queryDetalle = @"
                    SELECT 
                        md.id_detalle AS idDetalle,
                        u.nombre + ' ' + u.apellido AS estudiante,
                        SUM(CASE WHEN asi.estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
                        SUM(CASE WHEN asi.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
                        SUM(CASE WHEN asi.estado = 'tardanza' THEN 1 ELSE 0 END) AS tardanzas,
                        (SUM(CASE WHEN asi.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS porcentajeAsistencia
                    FROM ASISTENCIA asi
                    INNER JOIN MATRICULA_DETALLE md ON asi.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    WHERE md.id_profesor_asignatura = @ProfesorAsignatura
                    GROUP BY md.id_detalle, u.nombre, u.apellido
                    ORDER BY porcentajeAsistencia ASC";

                var detalle = await connection.QueryAsync(queryDetalle, new { ProfesorAsignatura = profesorAsignatura });

                return Ok(new
                {
                    asistenciaGlobal,
                    estudiantesBajaAsistencia,
                    detalle
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("asistencia-estudiante/{idDetalle}")]
        public async Task<ActionResult> GetAsistenciaEstudiante(int idDetalle)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
                        SUM(CASE WHEN estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
                        SUM(CASE WHEN estado = 'tardanza' THEN 1 ELSE 0 END) AS tardanzas
                    FROM ASISTENCIA
                    WHERE id_detalle = @IdDetalle";

                var asistencia = await connection.QueryFirstOrDefaultAsync(query, new { IdDetalle = idDetalle });
                return Ok(asistencia);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("actualizar-asistencia/{idDetalle}")]
        public async Task<ActionResult> ActualizarAsistencia(int idDetalle, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                int presentes = body.presentes;
                int ausentes = body.ausentes;
                int tardanzas = body.tardanzas;
                
                // Primero eliminar registros existentes
                await connection.ExecuteAsync(@"
                    DELETE FROM ASISTENCIA WHERE id_detalle = @IdDetalle",
                    new { IdDetalle = idDetalle });
                
                // Insertar presentes
                for (int i = 0; i < presentes; i++)
                {
                    await connection.ExecuteAsync(@"
                        INSERT INTO ASISTENCIA (id_detalle, fecha, estado)
                        VALUES (@IdDetalle, @Fecha, 'presente')",
                        new { IdDetalle = idDetalle, Fecha = DateTime.Now.AddDays(-i) });
                }
                
                // Insertar ausentes
                for (int i = 0; i < ausentes; i++)
                {
                    await connection.ExecuteAsync(@"
                        INSERT INTO ASISTENCIA (id_detalle, fecha, estado)
                        VALUES (@IdDetalle, @Fecha, 'ausente')",
                        new { IdDetalle = idDetalle, Fecha = DateTime.Now.AddDays(-(presentes + i)) });
                }
                
                // Insertar tardanzas
                for (int i = 0; i < tardanzas; i++)
                {
                    await connection.ExecuteAsync(@"
                        INSERT INTO ASISTENCIA (id_detalle, fecha, estado)
                        VALUES (@IdDetalle, @Fecha, 'tardanza')",
                        new { IdDetalle = idDetalle, Fecha = DateTime.Now.AddDays(-(presentes + ausentes + i)) });
                }

                return Ok(new { mensaje = "Asistencia actualizada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // OBSERVACIONES
        // ============================================
        [HttpGet("observaciones-detalle")]
        public async Task<ActionResult> GetObservacionesDetalle([FromQuery] int profesorAsignatura, [FromQuery] string tipo = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereClause = "md.id_profesor_asignatura = @ProfesorAsignatura";
                var parameters = new DynamicParameters();
                parameters.Add("ProfesorAsignatura", profesorAsignatura);

                if (!string.IsNullOrEmpty(tipo))
                {
                    whereClause += " AND o.tipo = @Tipo";
                    parameters.Add("Tipo", tipo);
                }

                var query = $@"
                    SELECT 
                        o.id_observacion AS idObservacion,
                        o.fecha AS fecha,
                        u.nombre + ' ' + u.apellido AS estudiante,
                        a.nombre AS materia,
                        prof.nombre + ' ' + prof.apellido AS profesor,
                        o.tipo AS tipo,
                        o.detalle AS detalle,
                        o.estado AS estado
                    FROM OBSERVACION o
                    INNER JOIN MATRICULA_DETALLE md ON o.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN PROFESOR_ASIGNATURA pa ON md.id_profesor_asignatura = pa.id_profesor_asignatura
                    INNER JOIN ASIGNATURA a ON pa.id_asignatura = a.id_asignatura
                    INNER JOIN USUARIO prof ON o.id_profesor = prof.id_usuario
                    WHERE {whereClause}
                    ORDER BY o.fecha DESC";

                var observaciones = await connection.QueryAsync(query, parameters);
                return Ok(observaciones);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("observacion/{id}")]
        public async Task<ActionResult> GetObservacion(int id)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                var query = @"
                    SELECT 
                        id_observacion AS idObservacion,
                        tipo AS tipo,
                        detalle AS detalle,
                        estado AS estado
                    FROM OBSERVACION
                    WHERE id_observacion = @Id";

                var observacion = await connection.QueryFirstOrDefaultAsync(query, new { Id = id });
                return Ok(observacion);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("actualizar-observacion/{id}")]
        public async Task<ActionResult> ActualizarObservacion(int id, [FromBody] dynamic body)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                string tipo = body.tipo;
                string detalle = body.detalle;
                string estado = body.estado;
                
                await connection.ExecuteAsync(@"
                    UPDATE OBSERVACION 
                    SET tipo = @Tipo, detalle = @Detalle, estado = @Estado 
                    WHERE id_observacion = @Id",
                    new { Tipo = tipo, Detalle = detalle, Estado = estado, Id = id });

                return Ok(new { mensaje = "Observación actualizada correctamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        // ============================================
        // ALERTAS
        // ============================================
        [HttpGet("alertas")]
        public async Task<ActionResult> GetAlertas([FromQuery] string periodo, [FromQuery] string cursoParalelo = "", [FromQuery] string profesorAsignatura = "")
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var whereConditions = new List<string> { "1=1" };
                var parameters = new DynamicParameters();

                if (!string.IsNullOrEmpty(cursoParalelo))
                {
                    whereConditions.Add("pa.id_curso_paralelo = @CursoParalelo");
                    parameters.Add("CursoParalelo", cursoParalelo);
                }
                if (!string.IsNullOrEmpty(profesorAsignatura))
                {
                    whereConditions.Add("pa.id_profesor_asignatura = @ProfesorAsignatura");
                    parameters.Add("ProfesorAsignatura", profesorAsignatura);
                }

                var whereClause = string.Join(" AND ", whereConditions);

                var queryBajoRendimiento = $@"
                    SELECT 
                        u.nombre + ' ' + u.apellido AS estudiante,
                        a.nombre AS materia,
                        c.promedio AS promedio
                    FROM CALIFICACION c
                    INNER JOIN MATRICULA_DETALLE md ON c.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN PROFESOR_ASIGNATURA pa ON md.id_profesor_asignatura = pa.id_profesor_asignatura
                    INNER JOIN ASIGNATURA a ON pa.id_asignatura = a.id_asignatura
                    WHERE c.promedio < 7.0 AND md.estado = 'inscrita' AND {whereClause}
                    ORDER BY c.promedio ASC";

                var bajoRendimiento = await connection.QueryAsync(queryBajoRendimiento, parameters);

                var queryInasistencias = $@"
                    SELECT 
                        u.nombre + ' ' + u.apellido AS estudiante,
                        a.nombre AS materia,
                        (SUM(CASE WHEN asi.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS porcentajeAsistencia,
                        SUM(CASE WHEN asi.estado = 'ausente' THEN 1 ELSE 0 END) AS faltas
                    FROM ASISTENCIA asi
                    INNER JOIN MATRICULA_DETALLE md ON asi.id_detalle = md.id_detalle
                    INNER JOIN MATRICULA m ON md.id_matricula = m.id_matricula
                    INNER JOIN USUARIO u ON m.id_estudiante = u.id_usuario
                    INNER JOIN PROFESOR_ASIGNATURA pa ON md.id_profesor_asignatura = pa.id_profesor_asignatura
                    INNER JOIN ASIGNATURA a ON pa.id_asignatura = a.id_asignatura
                    WHERE {whereClause}
                    GROUP BY u.nombre, u.apellido, a.nombre, asi.id_detalle
                    HAVING (SUM(CASE WHEN asi.estado = 'presente' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) < 80
                    ORDER BY porcentajeAsistencia ASC";

                var inasistencias = await connection.QueryAsync(queryInasistencias, parameters);

                return Ok(new
                {
                    bajoRendimiento,
                    inasistencias
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }
}