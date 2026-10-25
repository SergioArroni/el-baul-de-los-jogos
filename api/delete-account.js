const { createClient } = require('@supabase/supabase-js');
const handleCors = require('./_cors');
const { clientOptions } = require('./_admin');
const { deleteAccount, refusal } = require('./_account');

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(body);
}

// Deletes the caller's own account and data. Only ever the caller: the account comes
// from their session token, never from the request body.
module.exports = async function deleteAccountHandler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Método no permitido.' });
  }

  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publishableKey, SUPABASE_SECRET_KEY: secretKey } = process.env;
  if (!url || !publishableKey || !secretKey) return send(res, 503, { error: 'Falta configurar el acceso seguro a Supabase en Vercel.' });

  const token = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return send(res, 401, { error: 'Inicia sesión para continuar.' });

  try {
    const { data, error } = await createClient(url, publishableKey, clientOptions).auth.getUser(token);
    const user = data?.user;
    if (error || !user) return send(res, 401, { error: 'La sesión ha caducado. Vuelve a iniciar sesión.' });
    const reason = refusal(user);
    if (reason) return send(res, 403, { error: reason });

    await deleteAccount(createClient(url, secretKey, clientOptions), user);
    return send(res, 200, { deleted: true });
  } catch (error) {
    console.error('delete-account', error);
    return send(res, 500, { error: 'No se pudo borrar la cuenta. Inténtalo de nuevo en un momento.' });
  }
};
