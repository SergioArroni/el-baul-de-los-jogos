# Conectar El Baúl de los Jogos con Claude o ChatGPT

Con el conector puedes preguntar a tu asistente cosas como «¿qué cooperativo para 5 tenemos en
casa de Enzo?» o «¿quién gana más al Carcassonne?». Solo puede **leer** tu baúl: no cambia nada.

- **Dirección del conector:** `https://el-baul-de-los-jogos.vercel.app/api/mcp`
- **Inicio de sesión:** OAuth. Al conectar, te pedirá entrar con tu cuenta del Baúl y darle permiso.
- **Coste:** ninguno para el Baúl; usas tu propia cuenta de Claude o ChatGPT.
- **En la app:** «Mi perfil» → «Conectar con Claude o ChatGPT» tiene la dirección para copiar y estos pasos (o toca a Jogiño, el meeple de la esquina).

## Claude (claude.ai o la app de escritorio)
1. Abre **Ajustes → Conectores** y pulsa **Añadir conector personalizado**.
2. Nombre: `El Baúl de los Jogos`. URL: la de arriba. Guarda.
3. Pulsa **Conectar**. Se abre una ventana: entra con tu correo o apodo del Baúl.
4. Verás «¿Dejas que Claude vea tu baúl?». Pulsa **Permitir**.
5. En una conversación, activa el conector y pregunta lo que quieras.

## ChatGPT
Revisado en octubre de 2026: desde julio de 2026 los conectores están dentro de **Plugins** (antes
«Aplicaciones y conectores»). Hace falta un plan de pago (Plus o superior) y la web, chatgpt.com: la
app del móvil aún no deja añadirlos.
1. Si te lo pide, activa el **modo desarrollador** en **Ajustes → Seguridad e inicio de sesión** (en
   las cuentas más nuevas ya no hace falta).
2. Abre **Plugins** (chatgpt.com/plugins) y pulsa **+** para crear uno.
3. Nombre: `El Baúl de los Jogos`. URL: la de arriba. Autenticación: **OAuth**.
4. Entra con tu cuenta del Baúl y pulsa **Permitir**.
5. En una conversación, pulsa **+** junto a la caja de texto y elige El Baúl de los Jogos.

Los menús de ambas apps cambian a menudo: si algún nombre no coincide, busca «plugins», «conector»,
«MCP» o «desarrollador» en sus ajustes.

## Qué puede hacer
- `who_am_i`: con qué cuenta está conectado.
- `list_games`: tus juegos, con filtros por nombre, estilo o jugadores.
- `list_groups`: tus grupos y los compartidos contigo.
- `recommend_games`: a qué jugar según cuántos sois, el grupo, el estilo, la dureza y el tiempo.
- `play_stats`: partidas, ganadores y notas.

## Quitar el acceso
Borra el conector en Claude o ChatGPT. El permiso caduca solo y, si borras tu cuenta del Baúl,
deja de funcionar al momento.

## Cómo funciona por dentro
1. El asistente llama a `/api/mcp` sin token y recibe un 401 que apunta a
   `/.well-known/oauth-protected-resource/api/mcp`.
2. Ese documento dice que los permisos los da Supabase (`…supabase.co/auth/v1`).
3. El asistente se registra solo en Supabase (registro dinámico) y te manda a la página de permiso
   del Baúl (`/oauth/consent`).
4. Con tu «Permitir», Supabase le da un token a tu nombre; el servidor MCP lo comprueba y consulta
   Supabase con él, así que las reglas RLS aplican igual que en la app.
