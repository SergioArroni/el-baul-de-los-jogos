import { beforeEach, describe, expect, it, vi } from 'vitest';

// The APK's Google sign-in, with the phone (Capacitor) and Supabase replaced by fakes.
const phone = vi.hoisted(() => ({
  linkListener: undefined as undefined | ((event: { url: string }) => void),
  launchUrl: undefined as undefined | string,
  opened: [] as string[],
  exchanged: [] as string[],
  oauthOptions: [] as object[],
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: async (_: string, listener: (event: { url: string }) => void) => {
      phone.linkListener = listener;
      return { remove: async () => {} };
    },
    getLaunchUrl: async () => (phone.launchUrl ? { url: phone.launchUrl } : undefined),
  },
}));
vi.mock('@capacitor/browser', () => ({
  Browser: {
    addListener: async (_: string, listener: () => void) => {
      setTimeout(listener, 0);
      return { remove: async () => {} };
    },
    open: async ({ url }: { url: string }) => void phone.opened.push(url),
  },
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string, options: object) => ({
    auth: {
      signInWithOAuth: async (request: object) => {
        phone.oauthOptions.push({ ...request, client: options });
        return { data: { url: 'https://x.supabase.co/auth/v1/authorize?provider=google' }, error: null };
      },
      exchangeCodeForSession: async (code: string) => {
        phone.exchanged.push(code);
        return { error: code === 'expired' ? new Error('invalid') : null };
      },
    },
  }),
}));

const { APP_CALLBACK, listenForGoogleReturn, openGoogleSignIn } = await import('../../src/platform/google');

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  Object.assign(phone, { linkListener: undefined, launchUrl: undefined, opened: [], exchanged: [], oauthOptions: [] });
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
});

describe('Google sign-in inside the APK', () => {
  it('opens Google in the phone browser, asking to come back to the app with PKCE', async () => {
    expect(await openGoogleSignIn('https://x.supabase.co', 'pk')).toBeNull();
    expect(phone.opened).toEqual(['https://x.supabase.co/auth/v1/authorize?provider=google']);
    expect(phone.oauthOptions[0]).toMatchObject({
      provider: 'google',
      options: { redirectTo: APP_CALLBACK, skipBrowserRedirect: true },
      client: { auth: { flowType: 'pkce' } },
    });
  });

  it('saves the session when the link comes back with a code, only once per code', async () => {
    const done = vi.fn();
    listenForGoogleReturn('https://x.supabase.co', 'pk', done);
    await flush();
    phone.linkListener!({ url: `${APP_CALLBACK}?code=abc` });
    await flush();
    phone.linkListener!({ url: `${APP_CALLBACK}?code=abc` });
    await flush();
    expect(phone.exchanged).toEqual(['abc']);
    expect(done.mock.calls).toEqual([[null]]);
  });

  it('ignores other links and explains a cancelled or failed sign-in', async () => {
    const done = vi.fn();
    listenForGoogleReturn('https://x.supabase.co', 'pk', done);
    await flush();
    phone.linkListener!({ url: 'https://example.com/?code=abc' });
    phone.linkListener!({ url: `${APP_CALLBACK}?error=access_denied&error_description=Has%20cancelado` });
    phone.linkListener!({ url: `${APP_CALLBACK}?code=expired` });
    await flush();
    expect(done.mock.calls).toEqual([['Has cancelado'], ['No se pudo completar el acceso con Google. Prueba otra vez.']]);
  });

  it('finishes the sign-in when the link is what started the app', async () => {
    phone.launchUrl = `${APP_CALLBACK}?code=cold`;
    const done = vi.fn();
    listenForGoogleReturn('https://x.supabase.co', 'pk', done);
    await flush();
    expect(phone.exchanged).toEqual(['cold']);
    expect(done).toHaveBeenCalledWith(null);
  });
});
