// Supabase Auth answers in English with an error code: this turns the usual ones into what
// the person should do, in Spanish. Anything unknown keeps Supabase's own message.

const MESSAGES: Record<string, string> = {
  over_email_send_rate_limit: 'Ahora mismo no podemos enviar más correos: hemos llegado al límite de envíos por hora. Prueba de nuevo dentro de un rato.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.',
  user_already_exists: 'Ya hay una cuenta con ese correo. Entra con él o recupera la contraseña.',
  email_exists: 'Ya hay una cuenta con ese correo. Entra con él o recupera la contraseña.',
  weak_password: 'La contraseña es demasiado débil. Prueba con una más larga.',
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Aún no has confirmado tu correo: busca el enlace que te enviamos (mira también en spam).',
  email_address_invalid: 'Ese correo no es válido.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  signup_disabled: 'Ahora mismo no se pueden crear cuentas nuevas.',
};

export function authMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code && MESSAGES[code]) return MESSAGES[code];
  // Older servers send no code, only the English text.
  if (/email rate limit/i.test(message ?? '')) return MESSAGES.over_email_send_rate_limit;
  if (/failed to fetch|network/i.test(message ?? '')) return 'No hay conexión con el servidor. Revisa tu internet y vuelve a probar.';
  return message || 'No se pudo completar el acceso.';
}
