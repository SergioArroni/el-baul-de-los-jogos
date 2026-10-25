# Ideas pendientes

Lista de cosas por hacer, en el orden en que se apuntaron. Cuando una se empieza,
se decide su diseño (y si es una decisión de arquitectura, va a `DECISIONES.md`).
Al terminarla, se borra de aquí.

## Ya hablado, falta hacerlo

- **Pasar `dev` a `main`** siguiendo `PUBLICAR.md` (cuando lo revises).
- **Ejecutar en Supabase**, en orden: `sql/wishlist-meeples.sql`, `sql/plays-duration.sql`,
  `sql/ranking.sql` y `sql/google-login.sql`.
- **Activar Google** en Google Cloud y Supabase (`docs/GOOGLE-LOGIN.md`).
- **Correo de contacto** para la política de privacidad (`src/content/legal.ts`) y hacer la página.
- **Frases reales de amigos** para la landing, con su permiso.
- **Reglas de 7 juegos** sin explicación fiable: Game Off, ¿Alguien ha probado este juego?,
  La Vacuna Española, El Cubilete, el juego de beber, Codex y Brink.
- **«Entrar con Google» en la APK**: necesita un plugin nativo.
- **Recomendaciones con filtrado colaborativo** («gente con tus gustos…»), en el servidor.

## Publicar en Google Play (acordado el 2026-10-25; sin monetizar de momento)
1. Pasar `dev` a `main` y ejecutar los SQL pendientes.
2. Requisitos de Play: borrar la cuenta (hecho), AAB (hecho, en el workflow), entrar con Google
   (hecho en la web, falta activarlo) y la política de privacidad (falta el correo de contacto).
3. Crear la cuenta de desarrollador (25 $) y hacer la prueba cerrada: 12 testers durante 14 días.
4. Publicar gratis para todos.
5. Monetizar, más adelante y solo si hay usuarios: empezar por donaciones. Cobrar o poner anuncios
   obliga a pasar Vercel a Pro, a pedir licencia comercial a BGG y a revisar lo fiscal.

## Ideas nuevas

### 3. Catálogo de juegos tipo BGG: escribir el nombre y que se rellene la ficha
Al añadir un juego (o proponerlo en «Por comprar»), escribes el nombre, te sugiere juegos y al
elegir uno se rellena todo: jugadores, duración, dureza, estilos, año, foto. Sirve también para
buscar juegos nuevos.
- Fuente propuesta: la XML API de BoardGameGeek. Desde 2025 exige registrar una aplicación
  (gratis si no es comercial, aprobación de una semana o más) y un token que solo vive en el servidor.
  Condiciones: uso no comercial, citar a BGG con el logo «Powered by BGG», no alterar sus datos,
  pocas peticiones. Las fotos son de las editoriales: enlazarlas, no copiarlas.
- Índice: tabla en Supabase que guarda cada juego consultado (caché), para no repetir peticiones a
  BGG y que con el tiempo haya «muchos juegos indexados». Opcional: cargar de golpe la lista de
  nombres e ids de BGG (su CSV de rankings) para sugerir al instante.
- Descartado como fuente principal: Wikidata (libre, pero solo ~4.500 juegos, ~400 con nombre en
  español y ~1.800 con número de jugadores; comprobado el 2026-10-23).
- Lo nuestro (portadas dibujadas y «Cómo se juega») se sigue usando cuando existe.
- Tamaño: mediano-grande. Bloqueado hasta que BGG apruebe la aplicación.

