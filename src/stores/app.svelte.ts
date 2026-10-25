import type { User } from '@supabase/supabase-js';
import { SvelteMap } from 'svelte/reactivity';
import { ADMIN_EMAIL, localMode, supabase } from '../data/client';
import { CloudSync } from '../data/collection';
import { loadLocal, localSetting, saveLocal, type Collection } from '../data/local';
import { loadPlays } from '../data/plays';
import { loadProfile, type Privacy } from '../data/profile';
import { loadFriendRequests, loadPeople, lookupAccounts, syncFriendLinks } from '../data/social';
import { loadWishlist } from '../data/wishlist';
import { isNative } from '../platform/native';
import { groupKey } from '../domain/groups';
import { signedOutPage } from '../domain/routes';
import { playStats } from '../domain/stats';
import { nameKey } from '../domain/text';
import type {
  Friend, FriendRequest, Game, Group, Person, Place, Play, WishlistGame, WishlistVote,
} from '../domain/types';

/** Shown when the app opens without connection: the last synced copy is on screen, edits stay on this device. */
const OFFLINE = 'Sin conexión · los cambios no se guardarán';

export type Tab = 'catalog' | 'recommend' | 'plays' | 'groups' | 'newGames' | 'places' | 'profile' | 'backup';

/**
 * Single source of truth for the screens. Components read these fields and call
 * the methods; only this store talks to the data layer, so screens stay simple.
 */
class AppStore {
  user = $state<User | null>(null);
  ready = $state(false);
  syncStatus = $state('');
  tab = $state<Tab>('catalog');
  /** Group opened in Partidas: null shows all groups, '' the plays without a group. */
  playView = $state<string | null>(null);
  /** Account whose profile is open in Comunidad. */
  personView = $state<string | null>(null);

  games = $state<Game[]>([]);
  groups = $state<Group[]>([]);
  friends = $state<Friend[]>([]);
  places = $state<Place[]>([]);

  plays = $state<Play[]>([]);
  playsMissing = $state(false);
  wishlist = $state<WishlistGame[]>([]);
  votes = $state<WishlistVote[]>([]);
  friendRequests = $state<FriendRequest[]>([]);
  people = new SvelteMap<string, Person>();

  nickname = $state('');
  avatarUrl = $state('');
  /** Undefined until sql/profiles-privacy.sql has been run. */
  privacy = $state<Privacy | undefined>();

  stats = $derived(playStats(this.plays));
  isAdmin = $derived(
    !!this.user && this.user.email?.toLowerCase() === ADMIN_EMAIL && this.user.app_metadata?.ludoteca_admin === true);
  pendingRequests = $derived(this.friendRequests.filter(r => !this.friends.some(f => f.userId === r.owner_id)));

  private cloud: CloudSync | null = null;
  private queue: Promise<void> = Promise.resolve();

  get collection(): Collection {
    return $state.snapshot({ games: this.games, groups: this.groups, friends: this.friends, places: this.places });
  }

  groupKey = (group: Group): string => groupKey(group, this.user?.id ?? '');

  /** Loads the local copy, then the account if there is a session. */
  async start(): Promise<void> {
    this.useCollection(loadLocal());
    this.nickname = localSetting.get('ludoteca_nickname');
    this.avatarUrl = localSetting.get('ludoteca_avatar');
    if (!supabase || localMode) {
      this.ready = true;
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error && !navigator.onLine) {
      // No connection and the saved session needs refreshing: show the local copy and retry when back online.
      this.ready = true;
      this.syncStatus = OFFLINE;
      window.addEventListener('online', () => location.reload(), { once: true });
      return;
    }
    if (error) throw error;
    if (!data.session) {
      location.replace(signedOutPage(isNative, location.hash));
      return;
    }
    this.ready = true;
    supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') location.replace('login.html');
    });
    await this.signedIn(data.session.user);
  }

  private async signedIn(user: User): Promise<void> {
    this.user = user;
    this.cloud = new CloudSync(user);
    this.syncStatus = 'Cargando…';
    try {
      const result = await this.cloud.load();
      if (result.empty) {
        // First sign-in: upload what was in this browser (without friends, which were never synced before).
        const local = { ...this.collection, friends: [], groups: this.groups.filter(g => !g._shared) };
        await this.cloud.save(local);
        this.useCollection({ ...local, groups: [...local.groups, ...result.collection.groups] });
      } else {
        this.useCollection(result.collection);
        if (result.migrated) await this.cloud.save(this.collection);
      }
      saveLocal(this.collection);
      this.syncStatus = 'Sincronizado';
    } catch (error) {
      console.error(error);
      if (navigator.onLine) this.syncStatus = 'Error de sincronización';
      else {
        this.syncStatus = OFFLINE;
        window.addEventListener('online', () => void this.signedIn(user), { once: true });
      }
      return;
    }
    await this.loadProfile().catch(error => console.error(error));
    await this.refreshSocial();
    await this.resolvePendingFriends();
  }

  private useCollection(collection: Collection): void {
    this.games = collection.games;
    this.groups = collection.groups;
    this.friends = collection.friends;
    this.places = collection.places;
  }

  /** Saves locally right away and queues the cloud save, so saves never overlap. */
  save(): void {
    saveLocal(this.collection);
    if (!this.user || !this.cloud?.ready) return;
    const cloud = this.cloud;
    const user = this.user;
    this.syncStatus = 'Guardando…';
    this.queue = this.queue
      .then(async () => {
        const friendsChanged = await cloud.save(this.collection);
        if (friendsChanged) {
          await syncFriendLinks(user.id, this.friends.map(f => f.userId ?? ''))
            .catch(error => console.warn('No se pudieron avisar los nuevos amigos:', error.message));
        }
        this.syncStatus = 'Sincronizado';
      })
      .catch(error => {
        this.syncStatus = 'Error al sincronizar';
        console.error(error);
      });
  }

  async loadProfile(): Promise<void> {
    if (!this.user) return;
    const profile = await loadProfile(this.user.id);
    this.nickname = profile.nickname;
    this.avatarUrl = profile.avatarUrl;
    this.privacy = profile.privacy;
  }

  /** Wishlist, notices and plays, plus the nicknames and photos of everyone they mention. */
  async refreshSocial(): Promise<void> {
    if (!this.user) return;
    const [wishlist, requests, plays] = await Promise.allSettled([
      loadWishlist(), loadFriendRequests(this.user.id), loadPlays(),
    ]);
    if (wishlist.status === 'fulfilled') {
      this.wishlist = wishlist.value.games;
      this.votes = wishlist.value.votes;
    } else console.error(wishlist.reason);
    if (requests.status === 'fulfilled') this.friendRequests = requests.value;
    if (plays.status === 'fulfilled') {
      this.plays = plays.value.plays;
      this.playsMissing = plays.value.missing;
    }
    await this.loadPeople([
      ...this.friends.map(f => f.userId),
      ...this.plays.flatMap(p => p.play_players.map(x => x.user_id)),
      ...this.votes.map(v => v.user_id),
      ...this.friendRequests.map(r => r.owner_id),
      ...this.groups.flatMap(g => [g._ownerId, ...(g.members ?? []).map(m => m.userId)]),
    ]);
  }

  async loadPeople(ids: (string | null | undefined)[]): Promise<void> {
    const missing = [...new Set(ids.filter((id): id is string => !!id && !this.people.has(id)))];
    if (!missing.length || !this.user) return;
    try {
      for (const [id, person] of await loadPeople(missing)) this.people.set(id, person);
    } catch (error) {
      console.warn('No se pudieron cargar los perfiles:', error);
    }
  }

  async reloadPlays(): Promise<void> {
    const result = await loadPlays();
    this.plays = result.plays;
    this.playsMissing = result.missing;
    await this.loadPeople(this.plays.flatMap(p => p.play_players.map(x => x.user_id)));
  }

  async reloadWishlist(): Promise<void> {
    const result = await loadWishlist();
    this.wishlist = result.games;
    this.votes = result.votes;
    await this.loadPeople(this.votes.map(v => v.user_id));
  }

  /** Links invited friends once someone signs up with the suggested nickname after the invitation. */
  async resolvePendingFriends(): Promise<void> {
    const pending = this.friends.filter(f => !f.userId && (f.invite || f.email));
    if (!pending.length) return;
    try {
      const results = await lookupAccounts(pending.map(f => (f.invite ?? f.email)!));
      let changed = false;
      this.friends = this.friends.map(friend => {
        const query = !friend.userId && (friend.invite ?? friend.email);
        const match = query && results.find(r =>
          r.query === query.toLowerCase() && r.found && !r.self &&
          (!friend.invitedAt || new Date(r.createdAt!) >= new Date(friend.invitedAt)));
        if (!match) return friend;
        changed = true;
        const { invite: _invite, invitedAt: _invitedAt, email: _email, ...rest } = friend;
        return { ...rest, userId: match.userId, nickname: match.nickname };
      });
      if (changed) {
        this.save();
        await this.loadPeople(this.friends.map(f => f.userId));
      }
    } catch (error) {
      console.warn('No se pudieron comprobar las invitaciones:', error);
    }
  }

  // Collection edits: change the arrays, then save.

  upsertGame(game: Game): void {
    this.games = this.games.some(g => g.id === game.id) ? this.games.map(g => (g.id === game.id ? game : g)) : [...this.games, game];
    this.save();
  }

  deleteGame(id: string): void {
    this.games = this.games.filter(g => g.id !== id);
    this.save();
  }

  upsertGroup(group: Group): void {
    this.groups = this.groups.some(g => g.id === group.id) ? this.groups.map(g => (g.id === group.id ? group : g)) : [...this.groups, group];
    this.save();
  }

  deleteGroup(id: string): void {
    this.groups = this.groups.filter(g => g.id !== id);
    this.save();
  }

  upsertFriend(friend: Friend): void {
    this.friends = this.friends.some(f => f.id === friend.id) ? this.friends.map(f => (f.id === friend.id ? friend : f)) : [...this.friends, friend];
    this.save();
    if (friend.userId) void this.loadPeople([friend.userId]);
  }

  /** Adds an account to the friend list (or links the friend with that name), which lets them see "Solo amigos". */
  addFriendAccount(userId: string, nickname: string): void {
    if (this.friends.some(f => f.userId === userId)) return;
    const unlinked = this.friends.find(f => !f.userId && nameKey(f.name) === nameKey(nickname));
    this.upsertFriend(unlinked ? { id: unlinked.id, name: unlinked.name, userId, nickname } : { id: uid(), name: nickname, userId, nickname });
  }

  deleteFriend(id: string): void {
    this.friends = this.friends.filter(f => f.id !== id);
    this.groups = this.groups.map(g => ({ ...g, friendIds: (g.friendIds ?? []).filter(x => x !== id) }));
    this.save();
  }

  addPlace(place: Place): void {
    this.places = [...this.places, place];
    this.save();
  }

  replaceCollection(collection: Collection): void {
    this.useCollection(collection);
    this.save();
  }

  openPerson(userId: string): void {
    this.personView = userId;
    this.tab = 'groups';
  }

  openPlayGroup(key: string | null): void {
    this.playView = key;
    this.tab = 'plays';
  }
}

export const app = new AppStore();

export const uid = (): string => Math.random().toString(36).slice(2, 10);
