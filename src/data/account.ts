import { apiUrl } from '../platform/native';
import { accessToken } from './client';

/** Deletes the signed-in account and its data on the server (api/delete-account.js). */
export async function deleteMyAccount(): Promise<void> {
  const response = await fetch(apiUrl('/api/delete-account'), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (await accessToken()) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'No se pudo borrar la cuenta.');
}
