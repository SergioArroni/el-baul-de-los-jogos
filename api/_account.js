// Deleting your own account (Google Play requires it in the app and on the web).
// Most data goes with the user through "on delete cascade" in the database; this
// handles what doesn't, before deleting the account itself.
// Files starting with "_" are not deployed as functions by Vercel.
const { ROOT_ADMIN_EMAIL } = require('./_admin');

const DELETED_NAME = 'Cuenta borrada';

/** Why this account can't be deleted from the app, or null if it can. */
function refusal(user) {
  if (user.email?.toLowerCase() === ROOT_ADMIN_EMAIL || user.app_metadata?.ludoteca_admin === true) {
    return 'La cuenta de administración no se puede borrar desde la app.';
  }
  return null;
}

/** Escapes LIKE wildcards so an email matches only itself (ignoring case). */
const exactly = text => text.replace(/[\\%_]/g, char => '\\' + char);

/**
 * `admin` is a Supabase client with the secret key (it skips RLS). Any error stops
 * before the account is deleted, so a retry finishes the job.
 */
async function deleteAccount(admin, user) {
  const id = user.id;
  const check = result => {
    if (result.error) throw result.error;
    return result.data;
  };

  // Plays you logged in someone else's group stay with that group: its owner keeps them.
  const shared = check(await admin.from('plays').select('id,group_owner')
    .eq('owner_id', id).not('group_owner', 'is', null).neq('group_owner', id));
  const byOwner = new Map();
  for (const play of shared) byOwner.set(play.group_owner, [...(byOwner.get(play.group_owner) ?? []), play.id]);
  for (const [owner, ids] of byOwner) check(await admin.from('plays').update({ owner_id: owner }).in('id', ids));

  // In the plays that remain, your name is replaced.
  check(await admin.from('play_players').update({ name: DELETED_NAME }).eq('user_id', id));

  // Groups other people shared with your email (shares by account go with the account).
  if (user.email) check(await admin.from('group_shares').delete().ilike('member_email', exactly(user.email)));

  // The profile photo: Storage files are not removed by the database.
  const files = check(await admin.storage.from('avatars').list(id)) ?? [];
  if (files.length) check(await admin.storage.from('avatars').remove(files.map(file => `${id}/${file.name}`)));

  // Last, the account: games, groups, places, friends, profile, proposals, votes,
  // notices and your other plays are deleted with it.
  check(await admin.auth.admin.deleteUser(id));
}

module.exports = { deleteAccount, refusal, DELETED_NAME };
