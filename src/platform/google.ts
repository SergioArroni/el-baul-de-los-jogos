// "Entrar con Google" inside the APK. Google refuses sign-ins inside an app's own web view,
// so the sign-in opens in the phone's browser (a Custom Tab) and Supabase sends the person
// back to the app through its own link, es.sergioarroni.miludoteca://login-callback?code=….
// The code is exchanged for a session here with PKCE: only this app, which keeps the secret
// half of the exchange, can use it, even if another app catches the link.
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { createClient } from '@supabase/supabase-js';

export const APP_CALLBACK = 'es.sergioarroni.miludoteca://login-callback';

// Same storage as the page's own client, so the session it saves is the one the app reads.
// PKCE only here: the password-reset emails open on the web, which has no PKCE secret.
const authFor = (url: string, key: string) =>
  createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false } }).auth;

/** Opens Google's sign-in in the phone's browser; resolves when that browser closes. */
export async function openGoogleSignIn(url: string, key: string): Promise<string | null> {
  const { data, error } = await authFor(url, key).signInWithOAuth({
    provider: 'google',
    options: { redirectTo: APP_CALLBACK, skipBrowserRedirect: true },
  });
  if (error || !data.url) return 'No se pudo abrir el acceso con Google.';
  return new Promise(resolve => {
    void Browser.addListener('browserFinished', () => resolve(null)).then(handle => {
      void Browser.open({ url: data.url }).catch(() => {
        void handle.remove();
        resolve('No se pudo abrir el navegador.');
      });
    });
  });
}

const HANDLED = 'el-baul-google-code';

/**
 * Waits for the link back from Google and saves the session; `done` gets null on success or
 * a message to show. Also covers Android having closed the app while the browser was open:
 * then the link is what launched it.
 */
export function listenForGoogleReturn(url: string, key: string, done: (error: string | null) => void): void {
  const handle = async (link: string | undefined) => {
    if (!link?.startsWith(APP_CALLBACK)) return;
    const back = new URL(link);
    const code = back.searchParams.get('code');
    // A link already used (the launch link stays around while the app runs) is ignored.
    if (code && sessionStorage.getItem(HANDLED) === code) return;
    if (!code) return done(back.searchParams.get('error_description') ?? 'No se ha completado el acceso con Google.');
    sessionStorage.setItem(HANDLED, code);
    const { error } = await authFor(url, key).exchangeCodeForSession(code);
    done(error ? 'No se pudo completar el acceso con Google. Prueba otra vez.' : null);
  };
  void App.addListener('appUrlOpen', event => void handle(event.url));
  void App.getLaunchUrl().then(launch => handle(launch?.url)).catch(() => {});
}
