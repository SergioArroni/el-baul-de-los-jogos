# Ideas pendientes

Lista de cosas por hacer, en el orden en que se apuntaron. Cuando una se empieza,
se decide su diseño (y si es una decisión de arquitectura, va a `DECISIONES.md`).
Al terminarla, se borra de aquí.

## Ya hablado, falta hacerlo

- **Pasar `dev` a `main`** siguiendo `PUBLICAR.md`. Arregla el «Failed to fetch» al entrar con apodo
  en la APK (producción aún no da permiso CORS a la app) y empieza a contar visitas.
- **APK de `dev` contra el servidor de `dev`** (opción A): que cada APK hable con el servidor de su
  misma rama, para que no se rompa cuando la APK es más nueva que producción.
- **Fase 2 del MCP (OAuth).** Supabase ya está configurado: falta la página `/oauth/consent`,
  `/.well-known/oauth-protected-resource`, la cabecera `WWW-Authenticate`, tests y una guía para
  conectar Claude y ChatGPT.
- **Ejecutar en Supabase** `sql/wishlist-hype.sql` y `sql/profiles-privacy.sql` (en ese orden).
- **Reglas de 7 juegos** sin explicación fiable: Game Off, ¿Alguien ha probado este juego?,
  La Vacuna Española, El Cubilete, el juego de beber, Codex y Brink.

## Publicar en Google Play (acordado el 2026-10-25; sin monetizar de momento)
1. Pasar `dev` a `main` y ejecutar los SQL pendientes.
2. Requisitos de Play: borrar la cuenta (hecho: botón en «Mi perfil» y `borrar-cuenta.html`),
   página de política de privacidad, compilar en AAB además de APK y, opcional, entrar con Google.
3. Crear la cuenta de desarrollador (25 $) y hacer la prueba cerrada: 12 testers durante 14 días.
4. Publicar gratis para todos.
5. Monetizar, más adelante y solo si hay usuarios: empezar por donaciones. Cobrar o poner anuncios
   obliga a pasar Vercel a Pro, a pedir licencia comercial a BGG y a revisar lo fiscal.

## Ideas nuevas

### 1. Juego al azar por lugar
Eliges un lugar (o «donde estemos») y te sale un juego al azar de los que hay allí, con su
portada y un botón para «otro». Se puede filtrar por número de jugadores y tiempo.
- Datos: ya están (cada juego tiene su lugar).
- Tamaño: pequeño. Lógica en `domain/`, con tests.

### 2. Recomendaciones con aprendizaje (sistema de recomendación básico)
Mejorar «Qué jugamos» usando el historial de puntuaciones, tuyo y del grupo.
- Datos: cada partida guarda, por jugador, la nota (1–10), los puntos y si ganó.
- Ideas de técnica, de menos a más:
  - Basado en contenido: si te gustan los juegos con ciertos estilos y dureza, te propone otros parecidos.
  - Filtrado colaborativo: «a gente con gustos parecidos a los tuyos les encantó X».
  - Para un grupo: combinar las preferencias de los que juegan (media, o evitar lo que alguien odia).
  - Explorar y explotar: de vez en cuando proponer algo poco jugado para no repetir siempre lo mismo.
- Decidir: si se calcula en el navegador o en el servidor, y cómo explicar al usuario «por qué te lo recomiendo».
- Tamaño: mediano-grande. Buena para aprender: empezar simple, medir y mejorar.

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

### 4. Ranking de mejores juegos (pestaña nueva)
Una pestaña con los juegos mejor valorados de todos los usuarios, de cada grupo y tuyos.
- Datos: las notas de las partidas.
- Decidir: cómo ordenar sin que un juego con una sola nota de 10 gane a uno con cincuenta notas
  de 9 (media bayesiana); y qué se ve de otros usuarios (privacidad, RLS).
- Seguramente una vista o función en Supabase para el ranking global.
- Tamaño: mediano.

### 6. Tiempo real de partida frente al teórico
Al registrar una partida, que sea obligatorio poner cuánto duró. En la ficha del juego, junto al
título, mostrar la mediana del tiempo real frente al de la caja (p. ej. «⏱ 30 min · real 45 min»).
- Datos: hoy no se guarda la duración de las partidas. Hace falta una columna nueva en `plays`
  (migración SQL a mano en Supabase) y el campo en el formulario de partida.
- Las partidas antiguas no tienen tiempo: se ignoran al calcular la mediana.
- Mediana y no media: una partida eterna (o un error al escribir 600 en vez de 60) no la deforma.
- Decidir: desde cuántas partidas se muestra (con una sola no dice mucho) y si es la mediana tuya,
  la del grupo o la de todos.
- Tamaño: pequeño-mediano.
