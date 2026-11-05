# Correos de la app con Gmail (SMTP propio en Supabase)

## El problema
Supabase envía los correos de registro, confirmación y cambio de contraseña con su servidor de
pruebas, que solo permite **2 correos por hora en todo el proyecto**. Si dos personas se
registran en la misma hora, la tercera recibe «email rate limit exceeded». Desde noviembre de
2026 la app lo explica en español, pero el límite sigue ahí hasta configurar un servidor propio.

## La solución: enviar con la cuenta elbauldelosjogos@gmail.com
Gmail deja enviar unos 500 correos al día gratis, y como salen de una cuenta real de Gmail no
suelen acabar en spam.

### 1. Contraseña de aplicación en Google
1. Entra en https://myaccount.google.com con **elbauldelosjogos@gmail.com**.
2. **Seguridad → Verificación en dos pasos**: actívala si no lo está (es obligatoria para el paso siguiente).
3. Abre https://myaccount.google.com/apppasswords, ponle de nombre «Supabase» y pulsa **Crear**.
4. Copia la contraseña de 16 letras que aparece. Solo se muestra una vez, y es secreta: no la
   pegues en el chat ni en el código.

### 2. SMTP en Supabase
En https://supabase.com/dashboard/project/ibllpkczcsjxqzszwiby → **Authentication → Emails →
SMTP Settings**, activa **Enable custom SMTP** y rellena:

| Campo | Valor |
|---|---|
| Sender email | elbauldelosjogos@gmail.com |
| Sender name | El Baúl de los Jogos |
| Host | smtp.gmail.com |
| Port | 465 |
| Username | elbauldelosjogos@gmail.com |
| Password | la contraseña de aplicación del paso 1 |
| Minimum interval between emails | 60 segundos (el de por defecto) |

Pulsa **Save**.

### 3. Subir el límite
**Authentication → Rate Limits → Rate limit for sending emails**: con SMTP propio ya se puede
cambiar. Pon **30 por hora**, que es suficiente para un grupo de amigos y evita abusos.

### 4. Probar
Registra una cuenta con un correo tuyo de prueba, o usa «¿Has olvidado tu contraseña?», y
comprueba que llega el correo, enviado desde elbauldelosjogos@gmail.com.

## Si algún día se queda corto
Con más de 500 correos al día, se puede usar un servicio de envío como Brevo (300 al día
gratis) o Resend (necesita un dominio propio). Solo cambian los datos del paso 2.
