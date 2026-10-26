// Gives the plain-HTML login page the APK's way into Google (src/platform/google.ts).
// On the web the page uses Supabase's normal redirect and this stays unset.
import { isNative } from './platform/native';
import { listenForGoogleReturn, openGoogleSignIn } from './platform/google';

if (isNative) window.BAUL_GOOGLE = { open: openGoogleSignIn, onReturn: listenForGoogleReturn };
