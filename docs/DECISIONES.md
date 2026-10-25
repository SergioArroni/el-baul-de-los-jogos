# Decisiones de arquitectura (ADR)

Una entrada por decisión importante: qué se decidió, por qué y qué se descartó.
Cuando una decisión cambie, no se borra: se marca como **Sustituida** y se añade otra nueva.

---

## 1. Supabase como backend
**Estado:** Aceptada

- **Contexto:** app personal, una sola persona la mantiene, sin presupuesto para servidores.
- **Decisión:** usar Supabase (Postgres + API REST automática + login + almacenamiento) en vez de programar un backend propio.
- **Alternativas:** backend propio (Rust, Node…) en un servidor; Firebase.
- **Consecuencias:** casi nada que mantener y plan gratuito. A cambio dependemos de Supabase, y la lógica que necesita una clave secreta va en funciones de Vercel (`api/`).

## 2. Seguridad en la base de datos (RLS)
**Estado:** Aceptada

- **Contexto:** el navegador habla directamente con la base de datos, así que no se puede confiar en el JavaScript.
- **Decisión:** cada regla de acceso es una política RLS en Postgres (`sql/`): quién ve un grupo, quién puede poner una nota, etc.
- **Alternativas:** comprobar los permisos en un backend propio.
- **Consecuencias:** las reglas se aplican siempre, venga la petición de la web, de la APK o de un futuro servidor MCP. Hay que probarlas con varios usuarios (tests de integración).

## 3. App móvil con Capacitor
**Estado:** Sustituida por la 9

- **Contexto:** se quería una APK sin mantener una segunda app.
- **Decisión:** Capacitor envuelve la web en una app Android que carga la URL publicada en Vercel.
- **Alternativas:** React Native o Flutter (app nativa aparte), PWA instalable.
- **Consecuencias:** un solo código para web y móvil, y cada cambio en la web llega al móvil sin reinstalar. Necesita Internet y no aprovecha funciones nativas avanzadas.

## 4. Frontend con Vite + TypeScript + Svelte
**Estado:** Aceptada, en `dev` y pendiente de pasar a `main`

- **Contexto:** todo el frontend estaba en un único `index.html` difícil de mantener. Una sola persona, app dentro de una APK, objetivo de aprender arquitectura.
- **Decisión:** Svelte con TypeScript, compilado con Vite, separado en capas (`domain/`, `data/`, `stores/`, `components/`, `sections/`).
- **Alternativas:** Angular (+ Spartan), React, Vue, Astro.
- **Consecuencias:** poco código y una app ligera; la estructura la definimos nosotros. Angular daría más estructura hecha y más salida laboral, a cambio de más código.

## 5. Guardado incremental
**Estado:** Aceptada

- **Contexto:** cada guardado borraba todos los datos en la nube y los volvía a subir. Un fallo a mitad o dos dispositivos a la vez podían perder datos.
- **Decisión:** cada fila guarda el id del elemento (`app_id`) y solo se envía lo que cambió desde la última carga.
- **Alternativas:** seguir reemplazando todo; sincronización en tiempo real.
- **Consecuencias:** sin pérdidas y menos tráfico. Si dos dispositivos editan el mismo juego, gana el último en guardar.

## 6. Dos ramas: `dev` y `main`
**Estado:** Aceptada. Sustituye a la propuesta inicial `dev` → `staging` → `main`.

- **Contexto:** cada push a `main` publica la web y genera la APK.
- **Decisión:** se trabaja en `dev` (con URL de prueba de Vercel) y se pasa a `main` cuando está listo.
- **Alternativas:** una sola rama; añadir `staging`.
- **Consecuencias:** producción protegida con el mínimo de pasos. `staging` no aportaba nada en una app pequeña.

## 7. Tests en tres niveles
**Estado:** Aceptada

- **Contexto:** hay lógica (estadísticas, recomendaciones), pantallas y reglas de seguridad que pueden romperse por separado.
- **Decisión:** tests unitarios de `domain/` (Vitest), tests de navegador sin backend (Playwright) y tests de integración contra Postgres en Docker con todas las migraciones. Se ejecutan en GitHub en cada push.
- **Alternativas:** probar a mano; solo tests unitarios.
- **Consecuencias:** los cambios se publican con confianza. Los de integración necesitan Docker y tardan más.

## 8. Asistente de IA mediante MCP (en TypeScript)
**Estado:** Aceptada. Fase 1 hecha en `dev` (herramientas de solo lectura); falta el login OAuth (fase 2)

- **Contexto:** se quiere hablar con la app desde Claude o ChatGPT sin pagar el uso de los modelos.
- **Decisión:** un servidor MCP que cada usuario conecta en su propio Claude o ChatGPT. Pregunta a Supabase con el token de esa persona, así que RLS sigue protegiendo los datos. Se escribe en **TypeScript** (`mcp/`, SDK oficial v2) para **reutilizar `src/domain/`**: el recomendador, el catálogo y las estadísticas son los mismos que usa la app.
- **Alternativas:** chat dentro de la app pagado por el dueño; servidor en Rust con rmcp (se hizo un prototipo y funcionaba en Vercel, pero obligaba a copiar la lógica de `src/domain/` a Rust y mantener dos versiones); llevar esa lógica a funciones SQL.
- **Consecuencias:** coste de modelos cero para el dueño y respuestas coherentes con la app. Se pierde la práctica de Rust en esta pieza. Depende de que los planes de Claude y ChatGPT permitan conectores.

## 9. Capacitor con la app empaquetada
**Estado:** Aceptada, en `dev`. Sustituye a la 3.

- **Contexto:** la APK solo abría la web publicada: sin Internet no funcionaba y se sentía como un acceso directo.
- **Decisión:** la app compilada (`dist/`) va dentro de la APK, con funciones nativas de Capacitor (pantalla de inicio, barra de estado, botón atrás, vibración, menú de compartir) y diseño bajo la barra de estado (edge-to-edge). El código del móvil vive en una sola capa: `src/platform/`.
- **Alternativas:** Tauri 2 (núcleo en Rust, menos rodado en móvil), Svelte Native (pantallas nativas, poco mantenido), PWA, React Native o una app nativa aparte (otro código distinto).
- **Consecuencias:** arranca rápido y sin conexión muestra la última copia. Cada cambio necesita una APK nueva, que GitHub genera y prueba en un emulador. Las funciones de `api/` aceptan peticiones de la app (CORS). Lo que se edita sin conexión no se sube después.

## 10. Firma fija de la APK
**Estado:** Aceptada

- **Contexto:** cada compilación firmaba la APK con una clave de depuración distinta, y Android obligaba a desinstalar la app para actualizarla.
- **Decisión:** APK de *release* firmada siempre con la misma clave. La clave está guardada como secreto cifrado en GitHub y con copia del dueño fuera del repositorio. El número de versión es el número de ejecución de GitHub.
- **Alternativas:** seguir con APK de depuración; dejar que Google Play firme la app (Play App Signing).
- **Consecuencias:** las actualizaciones se instalan encima y la app queda lista para publicarse en Google Play. **Si la clave se pierde, la app ya no se puede actualizar**: la copia de seguridad es obligatoria.

## 11. Estadísticas de visitas con Vercel Web Analytics
**Estado:** Aceptada, en `dev`

- **Contexto:** se quería saber si la app se usa, y verlo dentro de la página de administración.
- **Decisión:** Vercel Web Analytics cuenta las visitas de la web (sin cookies ni datos personales). La función `api/analytics.js` las lee con un token de Vercel que solo vive en el servidor, comprueba que quien pregunta es el administrador (`api/_admin.js`, compartido con `api/admin-users.js`) y la página de admin las dibuja.
- **Alternativas:** mirarlas solo en el panel de Vercel; contar visitas en una tabla propia de Supabase (contaría también la APK, pero es más código y datos que guardar).
- **Consecuencias:** gratis hasta 50.000 visitas al mes y con 1 mes de historial (plan Hobby). La APK no se cuenta. Sin eventos personalizados en este plan, no se sabe qué sección se usa más. El token de Vercel da acceso a la cuenta, así que debe caducar y guardarse como variable sensible.


## 12. Portadas y reglas como contenido del repositorio
**Estado:** Aceptada, en `dev`

- **Contexto:** las tarjetas solo tenían un emoji y un degradado, y no había forma de saber cómo se juega a cada juego.
- **Decisión:** una biblioteca común (`src/content/library.ts`, con los juegos repartidos en tres archivos por dureza) guarda, para cada juego, su portada y un resumen de cómo se juega. Se busca por nombre (sin tildes, mayúsculas ni lo que va entre paréntesis), así que sirve para cualquier colección. Las portadas son ilustraciones vectoriales propias (`public/covers/`, generadas con `scripts/covers.mjs` y `scripts/covers/`), sin texto, porque la app pone el título encima. Si no hay reglas fiables de un juego, no se inventan: se avisa de que hay que mirar la caja.
- **Alternativas:** guardar portada y reglas en Supabase (cada uno con las suyas: más tablas y nadie las rellenaría); usar fotos de las cajas o de BoardGameGeek (derechos de autor y tamaños desiguales); que cada usuario suba su foto (Supabase Storage y moderación).
- **Consecuencias:** van con la app, así que funcionan sin conexión y en la APK, y no ocupan base de datos. Añadir un juego o corregir unas reglas requiere un cambio de código y publicar. Un juego con un nombre que la biblioteca no conoce se queda con el emoji.

## 13. Un juego puede estar en varios lugares
**Estado:** Aceptada, en `dev`

- **Contexto:** hay juegos repetidos en varias casas (por ejemplo, Virus en Casa Enzo y en Casa Lu), y cada juego solo tenía un lugar.
- **Decisión:** el juego guarda una lista de lugares (`locations`) en vez de uno (`location`). Como cada juego se guarda como JSON en Supabase, no hace falta SQL: al cargar, `normalizeGamePlace` convierte el formato antiguo y la app vuelve a guardar la colección. El MCP usa la misma función.
- **Alternativas:** un juego repetido por cada casa (dos fichas, con notas y estadísticas duplicadas); una tabla aparte de «copias» con su lugar (más correcta si algún día cada copia tiene su estado o su edición, pero mucho más trabajo ahora).
- **Consecuencias:** filtros, recomendaciones y el recuento de lugares miran si el lugar está en la lista. Una versión antigua de la app (la de producción hasta publicar) no entiende la lista y mostraría esos juegos como «Lugar por asignar».

## 14. Perfiles con privacidad, aplicada por la base de datos
**Estado:** Aceptada, en `dev`

- **Contexto:** se quería ver la colección y las estadísticas de los amigos, buscar a otras personas y que cada uno decida qué enseña.
- **Decisión:** cada perfil tiene dos ajustes, uno para la colección y otro para las estadísticas, con tres valores: pública, solo amigos o privada. «Amigo» es alguien que **tú** has añadido con su cuenta (tabla `friend_links`): si yo te añado, tú ves lo que tengo en «Solo amigos». Por defecto todo es «Solo amigos». Las reglas están en Supabase (`sql/profiles-privacy.sql`): una política RLS de solo lectura sobre `games` y una función, `profile_game_stats`, que devuelve el resumen por juego de tus partidas, nunca las partidas en sí. La app solo explica por qué algo está oculto (`src/domain/profiles.ts` repite la regla). El buscador encuentra a todos por apodo; los apodos y las fotos ya los veía cualquiera con sesión.
- **Alternativas:** filtrar en la app (cualquiera podría saltárselo llamando a la API); solicitudes de amistad con aceptar o rechazar (más pantallas, para más adelante); ocultar del buscador a los privados.
- **Consecuencias:** quien vea tu colección ve también las notas de tus juegos. Como RLS ahora devuelve también juegos de otros, toda consulta a «mis juegos» debe filtrar por `user_id`: la app ya lo hacía y el MCP se ha corregido. Hasta ejecutar el SQL, los perfiles de otros se ven vacíos con un aviso.

## 15. Borrar la cuenta desde la app y desde la web
**Estado:** Aceptada, en `dev`

- **Contexto:** Google Play exige que una app que crea cuentas deje borrarlas, con sus datos, desde la app y desde una página web.
- **Decisión:** en «Mi perfil» hay un botón «Borrar mi cuenta» que pide escribir tu apodo para confirmar. Llama a `api/delete-account.js`, que usa la clave secreta de Supabase y siempre borra la cuenta de quien llama (la saca de su sesión, nunca de la petición). La lógica está en `api/_account.js`: casi todo se borra en cascada al borrar el usuario; antes, las partidas que registraste en grupos de otros pasan al dueño del grupo, tu nombre en las partidas que quedan pasa a «Cuenta borrada», se quitan los grupos compartidos con tu correo y tu foto. La cuenta de administración no se puede borrar desde la app. `borrar-cuenta.html` es la página pública que pide Google.
- **Alternativas:** una función SQL que borre de `auth.users` (sin servidor, pero Supabase recomienda su API de administración y la foto no se puede borrar desde SQL); borrar también las partidas registradas en grupos de otros (los amigos perderían su historial); pedir la contraseña en vez del apodo (más seguro, pero las cuentas sin contraseña, como las futuras de Google, no podrían).
- **Consecuencias:** se borra al momento y no se puede deshacer. Los tests de integración ejecutan la lógica real contra la base de datos del entorno de pruebas.

## 16. Landing en `/inicio` y un solo sistema de diseño y movimiento
**Estado:** Aceptada, en `dev`

- **Contexto:** hacía falta una página que explique la app a quien llega de fuera (amigos, Google, Google Play), con la misma estética que la app y el login.
- **Decisión:** la landing es una página más del proyecto (`inicio.html` + `src/landing/`), servida en `/inicio` con una reescritura de `vercel.json` que Vite y el entorno de tests también aplican. En la web, quien abre `/` sin sesión va a `/inicio` (`signedOutPage` en `src/domain/routes.ts`); la APK y los enlaces de correo siguen yendo al login. Colores, sombras y fuentes viven en un solo archivo, `public/tokens.css`, enlazado por todas las páginas. El movimiento usa GSAP a través de `src/motion/` (acciones `reveal`, `deal`, `countUp`, `flipList`, `cardEnter`) y respeta siempre «reducir movimiento»; lo ligado al scroll (ScrollTrigger, SplitText, Lenis) está en `src/motion/scroll.ts` y solo lo carga la landing. Las capturas de la landing son reales: las genera `scripts/landing-shots.mjs` desde el modo local.
- **Alternativas:** poner la landing en `/` y mover la app (la APK abriría la landing; Capacitor no deja elegir otra página de inicio de forma fiable); librerías de componentes de React (Motion, Aceternity, Magic UI), descartadas porque la app es Svelte; Anime.js, que se solapa con GSAP.
- **Consecuencias:** la landing pesa unos 67 KB de JavaScript comprimido y la app no carga lo del scroll. Las frases de amigos solo aparecen cuando sean reales y con permiso, y la política de privacidad no se enlaza hasta tener el correo de contacto.

## 17. Meeples para votar compras y duración real de las partidas
**Estado:** Aceptada, en `dev`

- **Contexto:** los «catanes» con estrella para votar qué comprar no convencían, y se quería comparar lo que dura de verdad un juego con lo que dice su caja.
- **Decisión:** en «Por comprar» cada persona tiene 3 meeples (su foto dentro de la silueta) para poner en las propuestas que más le apetecen; la tabla de votos es la misma y el límite lo pone la base de datos con un trigger (`sql/wishlist-meeples.sql`), además de la app. Las partidas guardan cuántos minutos duraron (`sql/plays-duration.sql`), obligatorio en las nuevas; la ficha del juego muestra la mediana de las partidas que ves, desde 3 partidas con tiempo. En «Qué jugamos» hay un «Juego al azar» por lugar, jugadores y tiempo, que no repite hasta agotar los que encajan.
- **Alternativas:** fichas repartibles (5 por persona, varias en el mismo juego: más estrategia, pero cambia la tabla); meeples sin límite (solo cambia el aspecto); media en vez de mediana (una partida eterna o un error al escribir la deforma).
- **Consecuencias:** quien ya tuviera más de 3 votos los conserva, pero no puede poner más hasta bajar de 3. Mientras no se ejecuten los SQL, la app funciona igual: guarda sin duración y no limita los meeples.

## 18. Recomendaciones que aprenden y pestaña Ranking
**Estado:** Aceptada, en `dev`

- **Contexto:** «Qué jugamos» solo miraba jugadores, duración y la nota media del grupo; y no había forma de ver qué juegos gustan más.
- **Decisión:** recomendación basada en contenido, calculada en el navegador (`src/domain/taste.ts`): con las notas tuyas o de los miembros del grupo se aprende la afinidad por estilo (nota − 5,5) y la dureza de los juegos que puntuáis con 7 o más; los juegos parecidos suben, el que alguien puntuó con 3 o menos baja, y los no estrenados o sin jugar hace meses reciben un empujón. Cada propuesta lleva hasta dos motivos. El Ranking ordena por media bayesiana (`src/domain/ranking.ts`, 3 notas «medias» imaginarias por juego) en tres vistas: tus notas, las de un grupo y la global. La global sale de `game_ranking()` (`sql/ranking.sql`): totales anónimos de todas las cuentas y solo de juegos valorados por 3 personas o más.
- **Alternativas:** filtrado colaborativo («gente como tú…»), que necesita los datos de todos en el servidor, para más adelante; ordenar por media simple (un 10 suelto ganaría); un ranking global con el detalle de cada nota (rompería la privacidad).
- **Consecuencias:** sin servidor nuevo ni coste; las recomendaciones mejoran cuantas más notas se ponen. El ranking global incluye, de forma anónima, notas de cuentas con estadísticas privadas.
