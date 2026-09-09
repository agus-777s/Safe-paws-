const mensajesConocidos: Array<[string, string]> = [
  ['Invalid login credentials', 'Correo o contraseña incorrectos.'],
  ['User already registered', 'Ya existe una cuenta con este correo.'],
  ['Email not confirmed', 'Confirma tu correo electrónico antes de iniciar sesión.'],
  ['Password should be at least 6 characters', 'La contraseña debe tener al menos 6 caracteres.'],
  ['Unable to validate email address', 'No es posible validar el correo ingresado.'],
  ['Email rate limit exceeded', 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
]

export function mensajeError(error: unknown): string {
  if (error instanceof Error) {
    const coincidencia = mensajesConocidos.find(([origen]) => error.message.includes(origen))
    if (coincidencia) return coincidencia[1]
    return error.message
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}