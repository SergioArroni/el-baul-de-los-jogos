import type { Visibility } from '../domain/types';
import { requireClient } from './client';

export interface Profile {
  nickname: string;
  avatarPath: string;
  avatarUrl: string;
  /** Missing until sql/profiles-privacy.sql has been run. */
  privacy?: Privacy;
}

export interface Privacy {
  collection: Visibility;
  stats: Visibility;
}

export async function loadProfile(userId: string): Promise<Profile> {
  const db = requireClient();
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).single();
  if (error) throw error;
  const avatarPath: string = data.avatar_path ?? '';
  let avatarUrl = '';
  if (avatarPath) {
    const signed = await db.storage.from('avatars').createSignedUrl(avatarPath, 3600);
    if (signed.error) throw signed.error;
    avatarUrl = signed.data.signedUrl;
  }
  const privacy = data.collection_visibility ? { collection: data.collection_visibility, stats: data.stats_visibility } : undefined;
  return { nickname: data.nickname ?? '', avatarPath, avatarUrl, privacy };
}

export async function updatePrivacy(userId: string, privacy: Privacy): Promise<void> {
  const { error } = await requireClient().from('profiles')
    .update({ collection_visibility: privacy.collection, stats_visibility: privacy.stats }).eq('user_id', userId);
  if (error) throw error;
}

export async function updateNickname(userId: string, nickname: string): Promise<void> {
  const { error } = await requireClient().from('profiles').update({ nickname }).eq('user_id', userId);
  if (error) throw error;
}

/** Shrinks the picture to a 512 px WebP so uploads stay small (the bucket only accepts WebP up to 2 MB). */
export async function toAvatarWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}

export async function uploadAvatar(userId: string, blob: Blob): Promise<Profile['avatarUrl']> {
  const db = requireClient();
  const path = `${userId}/avatar.webp`;
  const upload = await db.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' });
  if (upload.error) throw upload.error;
  const { error } = await db.from('profiles').update({ avatar_path: path }).eq('user_id', userId);
  if (error) throw error;
  const signed = await db.storage.from('avatars').createSignedUrl(path, 3600);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
