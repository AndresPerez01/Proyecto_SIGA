namespace SIGAApi.Models
{
    public class MateriaProfesorDTO
    {
        public int IdMateriaPeriodo { get; set; }
        public string Nombre { get; set; } = null!;
        public string Codigo { get; set; } = null!;
        public string Periodo { get; set; } = null!;
        public string Horario { get; set; } = null!;
        public string Aula { get; set; } = null!;
        public int CupoMaximo { get; set; }
        public int CupoActual { get; set; }
    }

    public class EstudianteDTO
    {
        public int IdUsuario { get; set; }
        public int IdDetalle { get; set; }
        public string NombreCompleto { get; set; } = null!;
        public string Correo { get; set; } = null!;
    }

    public class CalificacionRequest
    {
        public int IdDetalle { get; set; }
        public decimal? Tareas { get; set; }
        public decimal? TrabajosClase { get; set; }
        public decimal? Proyecto { get; set; }
        public decimal? Participacion { get; set; }
        public decimal? Pruebas { get; set; }
        public decimal? Examenes { get; set; }
    }

    public class CalificacionDTO
    {
        public int IdCalificacion { get; set; }
        public int IdDetalle { get; set; }
        public string Estudiante { get; set; } = null!;
        public decimal Tareas { get; set; }
        public decimal TrabajosClase { get; set; }
        public decimal Proyecto { get; set; }
        public decimal Participacion { get; set; }
        public decimal Pruebas { get; set; }
        public decimal Examenes { get; set; }
        public decimal Promedio { get; set; }
    }

    public class AsistenciaRequest
    {
        public int IdDetalle { get; set; }
        public DateTime Fecha { get; set; }
        public string Estado { get; set; } = null!;
        public string? Justificativo { get; set; }
    }

    public class AsistenciaDTO
    {
        public int IdAsistencia { get; set; }
        public string Estudiante { get; set; } = null!;
        public DateTime Fecha { get; set; }
        public string Estado { get; set; } = null!;
        public string? Justificativo { get; set; }
    }

    public class ObservacionRequest
    {
        public int IdDetalle { get; set; }
        public int IdProfesor { get; set; }
        public string Detalle { get; set; } = null!;
        public string Tipo { get; set; } = null!;
    }

    public class ObservacionDTO
    {
        public int IdObservacion { get; set; }
        public string Estudiante { get; set; } = null!;
        public string Detalle { get; set; } = null!;
        public string Tipo { get; set; } = null!;
        public DateTime Fecha { get; set; }
        public string Estado { get; set; } = null!;
    }

    public class ProfesorPerfilDTO
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = null!;
        public string Apellido { get; set; } = null!;
        public string Correo { get; set; } = null!;
        public string Rol { get; set; } = null!;
    }
    public class DashboardDTO
    {
        public int TotalEstudiantes { get; set; }
        public decimal PromedioGeneral { get; set; }
        public decimal AsistenciaPromedio { get; set; }
        public int AlertasActivas { get; set; }
    }

    public class PeriodoDTO
    {
        public int IdPeriodo { get; set; }
        public string Nombre { get; set; } = null!;
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string Estado { get; set; } = null!;
    }

    public class DocenteDTO
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = null!;
        public string Apellido { get; set; } = null!;
        public string Correo { get; set; } = null!;
    }

    public class ReporteConsolidadoDTO
    {
        public int TotalMaterias { get; set; }
        public int TotalEstudiantes { get; set; }
        public decimal PromedioGeneral { get; set; }
        public decimal PorcentajeAprobacion { get; set; }
    }

    public class CalificacionMateriaSDTO
    {
        public int IdMateriaPeriodo { get; set; }
        public string Materia { get; set; } = null!;
        public string Docente { get; set; } = null!;
        public int Estudiantes { get; set; }
        public decimal? Promedio { get; set; }
        public int Aprobados { get; set; }
        public int Reprobados { get; set; }
    }

    public class AsistenciaResumenDTO
    {
        public decimal AsistenciaGlobal { get; set; }
        public int EstudiantesBajaAsistencia { get; set; }
    }

    public class AlertaBajoRendimientoDTO
    {
        public string Estudiante { get; set; } = null!;
        public string Materia { get; set; } = null!;
        public decimal Promedio { get; set; }
    }

    public class AlertaInasistenciaDTO
    {
        public string Estudiante { get; set; } = null!;
        public string Materia { get; set; } = null!;
        public decimal PorcentajeAsistencia { get; set; }
        public int Faltas { get; set; }
    }
}