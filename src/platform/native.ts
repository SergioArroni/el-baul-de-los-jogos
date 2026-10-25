// Adapter to the phone. The rest of the app calls these functions and never
// talks to Capacitor directly; in the browser they do nothing or use the web
// equivalent, so the same code runs on the web and inside the APK.
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = Capacitor.isNativePlatform();

/**
 * Inside the APK the pages are served from https://localhost, so server calls need the full
 * address: the dev APK talks to the dev deployment and the main one to production, so an
 * APK never expects a server newer than the one it calls.
 */
export const WEB_ORIGIN = import.meta.env.VITE_WEB_ORIGIN || 'https://el-baul-de-los-jogos.vercel.app';
export const apiUrl = (path: string): string => (isNative ? WEB_ORIGIN : '') + path;

/** Light tap feedback for actions that change something (vote, rate, save). */
export function tap(): void {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** Native share sheet in the app; in the browser, the Web Share API if there is one. Returns false if nothing was shown. */
export async function shareLink(title: string, text: string, url: string): Promise<boolean> {
  try {
    if (isNative) {
      await Share.share({ title, text, url, dialogTitle: title });
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    }
  } catch {
    /* the person closed the share sheet */
    return true;
  }
  return false;
}

/** Status bar icons readable on the current theme (the app draws behind the bar, edge-to-edge). */
export function syncStatusBar(dark: boolean): void {
  if (isNative) void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

export const hideSplash = (): void => {
  if (isNative) void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
};

/**
 * Android back button: close whatever is open (a dialog or the profile menu, via
 * the same Escape key the web uses), else go back to the catalog, else leave the app.
 */
export function handleBackButton(onBack: () => boolean): void {
  if (!isNative) return;
  void App.addListener('backButton', () => {
    if (document.querySelector('.modal.open, .profile-menu:not([hidden])')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (!onBack()) void App.minimizeApp();
  });
}
