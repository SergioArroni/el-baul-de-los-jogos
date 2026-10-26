// The android/ folder is generated in CI (cap add android), so the link the app answers to,
// es.sergioarroni.miludoteca://login-callback (the way back from "Entrar con Google"), is
// added to its manifest here. Running it twice changes nothing.
import { readFileSync, writeFileSync } from 'node:fs';

const manifest = process.argv[2] ?? 'android/app/src/main/AndroidManifest.xml';
const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="es.sergioarroni.miludoteca" android:host="login-callback" />
            </intent-filter>`;

const xml = readFileSync(manifest, 'utf8');
if (xml.includes('android:host="login-callback"')) {
  console.log('The login link is already in the manifest.');
} else {
  // Right after the launcher's intent-filter, inside MainActivity.
  const launcher = /(<category android:name="android\.intent\.category\.LAUNCHER" \/>\s*<\/intent-filter>)/;
  if (!launcher.test(xml)) throw new Error(`No launcher activity found in ${manifest}`);
  writeFileSync(manifest, xml.replace(launcher, `$1${filter}`));
  console.log('Added the login link to the manifest.');
}
