export interface DatosRegistro {
  nombre: string
  correo: string
  contrasena: string
  /** Perfil del wizard (sin fotos) para completar el registro tras confirmar el correo. */
  borrador?: Record<string, unknown>
}