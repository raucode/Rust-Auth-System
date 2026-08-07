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

GET  /api/profile                 # requiere autenticación
POST /api/me                      # requiere autenticación
GET  /api/me/summary              # requiere autenticación
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
