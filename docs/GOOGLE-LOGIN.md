# Activar «Entrar con Google»

El botón ya está en el login, pero solo aparece cuando Google está activado en Supabase. Pasos (una
vez):

1. **Google Cloud Console** (console.cloud.google.com) → crea un proyecto (p. ej. «El Baúl de los Jogos»).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo «Externo», nombre de la app,
   correo de soporte y el dominio `el-baul-de-los-jogos.vercel.app`. Publícala (no hace falta revisión
   para pedir solo correo y perfil).
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - Orígenes autorizados de JavaScript: `https://el-baul-de-los-jogos.vercel.app`
   - URI de redirección autorizados: `https://ibllpkczcsjxqzszwiby.supabase.co/auth/v1/callback`
   - Guarda el **ID de cliente** y el **secreto** (el secreto no lo pegues en ningún chat).
4. **Supabase → Authentication → Sign In / Providers → Google**: actívalo y pega el ID de cliente y el
   secreto.
5. **Supabase → Authentication → URL Configuration → Redirect URLs**: añade
   `https://el-baul-de-los-jogos.vercel.app/login.html` (y la de `dev` si quieres probarlo ahí:
   `https://el-baul-de-los-jogos-git-dev-deus20.vercel.app/login.html`).
6. Ejecuta `sql/google-login.sql` en Supabase: sin él, las cuentas nuevas de Google fallan porque la
   base de datos exige un apodo. Con él, reciben uno a partir de su correo (cambiable en «Mi perfil»).

**Limitación:** dentro de la APK el botón no aparece, porque Google no permite iniciar sesión dentro
de una vista web incrustada. Para la app haría falta un plugin nativo de Google; queda para más adelante.
