# Ideas pendientes

Lista de cosas por hacer, en el orden en que se apuntaron. Cuando una se empieza,
se decide su diseño (y si es una decisión de arquitectura, va a `DECISIONES.md`).
Al terminarla, se borra de aquí.

## Ya hablado, falta hacerlo

- **Pasar `dev` a `main`** siguiendo `PUBLICAR.md` (cuando lo revises).
- **Ejecutar en Supabase**, en orden: `sql/wishlist-meeples.sql`, `sql/plays-duration.sql`,
  `sql/ranking.sql`, `sql/google-login.sql`, `sql/similar-taste.sql` y `sql/catalog.sql`.
- **Activar Google** en Google Cloud y Supabase (`docs/GOOGLE-LOGIN.md`), incluida la URL de la APK.
- **Frases reales de amigos** para la landing, con su permiso.
- **Reglas de 7 juegos** sin explicación fiable: Game Off, ¿Alguien ha probado este juego?,
  La Vacuna Española, El Cubilete, el juego de beber, Codex y Brink.
- **Catálogo BGG**: programado; falta registrar la app en BGG, el token y `sql/catalog.sql` (`docs/BGG.md`).

## Publicar en Google Play (acordado el 2026-10-25; sin monetizar de momento)
1. Pasar `dev` a `main` y ejecutar los SQL pendientes.
2. Requisitos de Play: borrar la cuenta (hecho), AAB (hecho, en el workflow), entrar con Google
   (hecho en la web, falta activarlo) y la política de privacidad (hecha, con elbauldelosjogos@gmail.com).
3. Crear la cuenta de desarrollador (25 $) y hacer la prueba cerrada: 12 testers durante 14 días.
4. Publicar gratis para todos.
5. Monetizar, más adelante y solo si hay usuarios: empezar por donaciones. Cobrar o poner anuncios
   obliga a pasar Vercel a Pro, a pedir licencia comercial a BGG y a revisar lo fiscal.

## Ideas nuevas
