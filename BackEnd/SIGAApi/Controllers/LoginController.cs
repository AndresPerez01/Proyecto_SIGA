using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;
using System.Data;

namespace SIGAApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoginController : ControllerBase
    {
        private readonly string _connectionString;

        public LoginController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("SIGAConnection") 
                ?? throw new InvalidOperationException("Connection string not found");
        }

        // POST: api/login
        [HttpPost]
        public async Task<ActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                
                // Usar el procedimiento almacenado sp_validar_login
                var parameters = new DynamicParameters();
                parameters.Add("@correo", request.Username);
                parameters.Add("@contrasena_plana", request.Password);
                parameters.Add("@resultado", dbType: DbType.Boolean, direction: ParameterDirection.Output);
                parameters.Add("@id_usuario", dbType: DbType.Int32, direction: ParameterDirection.Output);
                parameters.Add("@uuid_usuario", dbType: DbType.Guid, direction: ParameterDirection.Output);
                parameters.Add("@mensaje", dbType: DbType.String, size: 200, direction: ParameterDirection.Output);

                await connection.ExecuteAsync(
                    "sp_validar_login", 
                    parameters, 
                    commandType: CommandType.StoredProcedure
                );

                // Obtener resultados del procedimiento
                var resultado = parameters.Get<bool>("@resultado");
                var mensaje = parameters.Get<string>("@mensaje");
                var idUsuario = parameters.Get<int?>("@id_usuario");
                var uuidUsuario = parameters.Get<Guid?>("@uuid_usuario");

                if (!resultado)
                {
                    return Unauthorized(new { 
                        success = false,
                        message = mensaje 
                    });
                }

                // Si el login es exitoso, obtener información completa del usuario
                var queryUsuario = @"
                    SELECT 
                        u.id_usuario AS IdUsuario,
                        u.uuid_usuario AS UuidUsuario,
                        u.nombre AS Nombre,
                        u.apellido AS Apellido,
                        u.correo AS Correo,
                        u.estado AS Estado,
                        r.id_rol AS IdRol,
                        r.nombre_rol AS NombreRol
                    FROM USUARIO u
                    INNER JOIN ROL r ON u.id_rol = r.id_rol
                    WHERE u.id_usuario = @IdUsuario";

                var usuario = await connection.QueryFirstOrDefaultAsync<UsuarioDTO>(
                    queryUsuario, 
                    new { IdUsuario = idUsuario }
                );

                if (usuario == null)
                {
                    return Unauthorized(new { 
                        success = false,
                        message = "Error al obtener información del usuario" 
                    });
                }

                // Verificar que el rol coincida con el solicitado
                string rolSolicitado = request.Role.ToLower();
                string rolUsuario = usuario.NombreRol.ToLower();

                // Mapear nombres de roles
                var rolesMap = new Dictionary<string, string>
                {
                    { "director", "director" },
                    { "profesor", "profesor" },
                    { "estudiante", "estudiante" },
                    { "administrador", "administrador" }
                };

                if (!rolesMap.ContainsKey(rolSolicitado) || !rolUsuario.Contains(rolesMap[rolSolicitado]))
                {
                    // Registrar auditoría de intento de acceso con rol incorrecto
                    await connection.ExecuteAsync(@"
                        INSERT INTO AUDITORIA (id_usuario, accion, descripcion, tabla_afectada)
                        VALUES (@IdUsuario, 'LOGIN_WRONG_ROLE', @Descripcion, 'USUARIO')",
                        new { 
                            IdUsuario = idUsuario, 
                            Descripcion = $"Intento de acceso con rol '{rolSolicitado}' pero usuario tiene rol '{rolUsuario}'" 
                        }
                    );

                    return Unauthorized(new { 
                        success = false,
                        message = "El rol seleccionado no corresponde a este usuario" 
                    });
                }

                // Retornar información del usuario
                return Ok(new
                {
                    success = true,
                    message = "Login exitoso",
                    usuario = new
                    {
                        idUsuario = usuario.IdUsuario,
                        uuidUsuario = usuario.UuidUsuario.ToString(),
                        nombre = usuario.Nombre,
                        apellido = usuario.Apellido,
                        correo = usuario.Correo,
                        nombreCompleto = $"{usuario.Nombre} {usuario.Apellido}",
                        rol = usuario.NombreRol,
                        idRol = usuario.IdRol
                    }
                });
            }
            catch (SqlException sqlEx)
            {
                // Errores específicos de SQL Server
                return StatusCode(500, new { 
                    success = false,
                    message = $"Error en la base de datos: {sqlEx.Message}" 
                });
            }
            catch (Exception ex)
            {
                // Errores generales
                return StatusCode(500, new { 
                    success = false,
                    message = $"Error en el servidor: {ex.Message}" 
                });
            }
        }

        // GET: api/login/verify-session
        [HttpGet("verify-session")]
        public async Task<ActionResult> VerifySession([FromQuery] string uuidUsuario)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                var query = @"
                    SELECT 
                        u.id_usuario AS IdUsuario,
                        u.uuid_usuario AS UuidUsuario,
                        u.nombre AS Nombre,
                        u.apellido AS Apellido,
                        u.correo AS Correo,
                        u.estado AS Estado,
                        r.id_rol AS IdRol,
                        r.nombre_rol AS NombreRol
                    FROM USUARIO u
                    INNER JOIN ROL r ON u.id_rol = r.id_rol
                    WHERE u.uuid_usuario = @UuidUsuario AND u.estado = 'activo'";

                var usuario = await connection.QueryFirstOrDefaultAsync<UsuarioDTO>(
                    query,
                    new { UuidUsuario = uuidUsuario }
                );

                if (usuario == null)
                {
                    return Unauthorized(new { 
                        success = false,
                        message = "Sesión inválida" 
                    });
                }

                return Ok(new
                {
                    success = true,
                    usuario = new
                    {
                        idUsuario = usuario.IdUsuario,
                        uuidUsuario = usuario.UuidUsuario.ToString(),
                        nombre = usuario.Nombre,
                        apellido = usuario.Apellido,
                        correo = usuario.Correo,
                        nombreCompleto = $"{usuario.Nombre} {usuario.Apellido}",
                        rol = usuario.NombreRol,
                        idRol = usuario.IdRol
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false,
                    message = $"Error al verificar sesión: {ex.Message}" 
                });
            }
        }

        // POST: api/login/logout
        [HttpPost("logout")]
        public async Task<ActionResult> Logout([FromBody] LogoutRequest request)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);

                // Registrar auditoría de logout
                await connection.ExecuteAsync(@"
                    INSERT INTO AUDITORIA (id_usuario, accion, descripcion, tabla_afectada)
                    VALUES (@IdUsuario, 'LOGOUT', 'Usuario cerró sesión', 'USUARIO')",
                    new { IdUsuario = request.IdUsuario }
                );

                return Ok(new
                {
                    success = true,
                    message = "Sesión cerrada correctamente"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { 
                    success = false,
                    message = $"Error al cerrar sesión: {ex.Message}" 
                });
            }
        }
    }

    // ======================== DTOs ========================
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class LogoutRequest
    {
        public int IdUsuario { get; set; }
    }

    public class UsuarioDTO
    {
        public int IdUsuario { get; set; }
        public Guid UuidUsuario { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string Estado { get; set; } = string.Empty;
        public int IdRol { get; set; }
        public string NombreRol { get; set; } = string.Empty;
    }
}