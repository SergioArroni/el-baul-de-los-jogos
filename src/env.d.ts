interface ImportMetaEnv {
  /** Server the APK talks to; the Android build sets it per branch (dev → dev preview, main → production). */
  readonly VITE_WEB_ORIGIN?: string;
}

interface Window {
  /** Same as WEB_ORIGIN, for the plain-HTML login page (set by src/static-pages.ts). */
  BAUL_WEB_ORIGIN?: string;
  /** Google sign-in through the phone's browser, only inside the APK (set by src/login-native.ts). */
  BAUL_GOOGLE?: {
    open(url: string, key: string): Promise<string | null>;
    onReturn(url: string, key: string, done: (error: string | null) => void): void;
  };
}
