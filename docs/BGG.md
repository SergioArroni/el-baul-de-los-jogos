# Activar el catálogo de BoardGameGeek

El catálogo ya está programado: al escribir el nombre de un juego en «Añadir juego» o en «Por
comprar» salen sugerencias, y al elegir una se rellena la ficha. Falta el permiso de BGG.

1. **Registra la aplicación en BGG.** Entra en boardgamegeek.com con tu cuenta, ve a la página de
   aplicaciones de la XML API («Using the XML API» → applications) y registra una aplicación
   **no comercial**: «El Baúl de los Jogos», app personal para organizar juegos con amigos, URL
   `https://el-baul-de-los-jogos.vercel.app/inicio`. La aprobación puede tardar una semana o más.
2. **Crea un token** cuando la aprueben (en esa misma página).
3. **Vercel → Settings → Environment Variables:** añade `BGG_TOKEN` con el token, marcada como
   *Sensitive*, para Production y Preview. No lo pegues en ningún chat.
4. **Supabase → SQL Editor:** ejecuta `sql/catalog.sql` (la tabla donde se guardan los juegos que
   se consultan, para no preguntar a BGG dos veces).
5. Vuelve a desplegar (cualquier push) y prueba a escribir «Cata» en «Añadir juego».

**Condiciones de BGG que cumple la app:** uso no comercial, crédito «Datos de BoardGameGeek ·
Powered by BGG» con enlace bajo las sugerencias, los datos se guardan tal cual llegan y se hacen
pocas peticiones (caché). Cuando BGG te dé su logo oficial «Powered by BGG», se puede poner en lugar
del texto. Las imágenes de las cajas no se usan por ahora (son de las editoriales).

**Sin token** la app funciona igual: simplemente no hay sugerencias (o solo las de juegos ya
guardados en la tabla).
