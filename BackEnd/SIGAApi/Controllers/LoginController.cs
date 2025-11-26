using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;

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
                
                var query = @"
                    SELECT 
                        u.id_usuario AS IdUsuario,
                        u.nombre AS Nombre,
                        u.apellido AS Apellido,
                        u.correo AS Correo,
                        u.estado AS Estado,
                        r.id_rol AS IdRol,
                        r.nombre_rol AS NombreRol
                    FROM USUARIO u
                    INNER JOIN ROL r ON u.id_rol = r.id_rol
                    WHERE (u.correo = @Username OR u.nombre = @Username)
                    AND u.contrasena = @Password
                    AND u.estado = 'activo'";

                var usuario = await connection.QueryFirstOrDefaultAsync<UsuarioDTO>(
                    query, 
                    new { 
                        Username = request.Username, 
                        Password = request.Password 
                    });

                if (usuario == null)
                {
                    return Unauthorized(new { message = "Credenciales inválidas o usuario inactivo" });
                }

                // Verificar que el rol coincida
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
                    return Unauthorized(new { message = "El rol seleccionado no corresponde a este usuario" });
                }

                // Retornar información del usuario
                return Ok(new
                {
                    success = true,
                    message = "Login exitoso",
                    usuario = new
                    {
                        idUsuario = usuario.IdUsuario,
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
                return StatusCode(500, new { message = $"Error en el servidor: {ex.Message}" });
            }
        }
    }

    // DTOs para Login
    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = null!;
    }

    public class UsuarioDTO
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = null!;
        public string Apellido { get; set; } = null!;
        public string Correo { get; set; } = null!;
        public string Estado { get; set; } = null!;
        public int IdRol { get; set; }
        public string NombreRol { get; set; } = null!;
    }
}