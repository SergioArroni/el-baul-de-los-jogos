/**
 * Where someone without a session goes when they open the app. On the web, first-time
 * visitors see the landing; the APK, and links from emails (sign-up confirmations and
 * password resets carry their data in the URL hash), go straight to the login page.
 */
export function signedOutPage(isNative: boolean, hash: string): string {
  return isNative || hash ? 'login.html' + hash : '/inicio';
}
