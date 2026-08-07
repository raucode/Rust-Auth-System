# Rust Auth System

Backend de autenticación y gestión de usuarios escrito en Rust. Proporciona sesiones basadas en JWT
en cookies, refresh tokens persistidos en PostgreSQL y un conjunto inicial de rutas protegidas.

## Capacidades

- Registro e inicio de sesión.
- JWT de acceso en cookie HTTP-only y renovación mediante refresh token.
- Refresh tokens almacenados como hash y revocables al cerrar sesión.
- Middleware de autenticación para rutas protegidas.
- Perfil del usuario y gestión de empleados desde el ámbito autenticado.
- PostgreSQL mediante SQLx y hash de contraseñas con bcrypt.

## Rutas principales

```text
POST /auth/user/register
POST /auth/user/login
POST /auth/user/refresh
POST /auth/user/logout
GET  /auth/verify                 # 200 o 401, para un proxy inverso

GET  /api/profile                 # requiere autenticación
POST /api/me                      # requiere autenticación
GET  /api/me/summary              # requiere autenticación
```

### `GET /auth/verify`

No sirve contenido: responde **200** si la cookie de sesión es válida —con el identificador del
usuario en la cabecera `X-Auth-User`— y **401** si no. Está pensado para que un proxy inverso lo
consulte antes de servir una ruta protegida (`auth_request` en nginx, `forwardAuth` en Traefik).

Con eso, **un servicio detrás del proxy no necesita saber nada de JWT**: recibe la identidad ya
resuelta en una cabecera.

> El proxy **tiene que borrar cualquier cabecera `X-Auth-*` que llegue de fuera** antes de reenviar
> la petición. Si un cliente pudiera mandarla, se declararía quien quisiera. Es la regla que
> sostiene todo el esquema.

Ejemplo con nginx:

```nginx
location /visor/ {
    auth_request     /_auth;
    auth_request_set $usuario $upstream_http_x_auth_user;

    proxy_set_header X-Auth-User $usuario;   # la escribe el proxy...
    proxy_pass       http://127.0.0.1:8080/; # ...y el servicio confía solo en él
}

location = /_auth {
    internal;
    proxy_pass              http://127.0.0.1:8081/auth/verify;
    proxy_pass_request_body off;
    proxy_set_header        Content-Length "";
}
```

## Ejecutar localmente

```bash
cp .env.example .env
# Completa DATABASE_URL y JWT_SECRET.
cargo run
```

El servidor escucha en `0.0.0.0:8080`. El esquema esperado incluye las tablas de usuarios y
`auth.refresh_tokens`; revisa las migraciones o prepara la base antes de arrancar.

## Configuración

```env
DATABASE_URL=postgres://USER:PASSWORD@127.0.0.1:5432/rust_auth
SQLX_MIGRATIONS_TABLE=_sqlx_migrations
JWT_SECRET=replace-with-a-long-random-secret
```

Nunca subas `.env` ni credenciales.

## Seguridad y estado

Es un proyecto de desarrollo. Las cookies se crean con `secure=false` y CORS contiene orígenes
locales concretos; antes de desplegarlo hay que activar cookies seguras bajo HTTPS, definir los
orígenes por configuración y revisar el flujo de refresh/revocación. La compilación no se verificó
en el runtime aislado de la sesión, que no expuso Cargo; debe comprobarse desde Distrobox en Linux
o de forma nativa en Windows.
