# Levantarlo en local y probarlo

Cuatro cosas que arrancar: PostgreSQL, la API, y los **dos** frontends. Que sean dos y en puertos
distintos no es capricho — ver más abajo.

## 1 · Base de datos

Compilar **no** necesita base de datos: las consultas con macro están cacheadas en `.sqlx/` y con
`SQLX_OFFLINE=true` basta. Ejecutar sí la necesita.

```powershell
# Si ya tienes el cluster del visor levantado, sirve el mismo.
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' `
    -D 'C:\Users\raul.figuera\pgdata\infra-visor-17' `
    -l 'C:\Users\raul.figuera\pgdata\postgres.log' `
    -o "-p 5432 -c listen_addresses=127.0.0.1" start

# Base propia y esquema
& 'C:\Program Files\PostgreSQL\17\bin\createdb.exe' -h 127.0.0.1 -p 5432 rust_auth
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h 127.0.0.1 -p 5432 -d rust_auth `
    -f migrations/20250827005838_create_users_and_suscripciones.sql
```

## 2 · Configuración

```powershell
Copy-Item .env.example .env
```

Y en `.env`, lo que importa:

```env
DATABASE_URL=postgres://postgres:TU_PASSWORD@127.0.0.1:5432/rust_auth
JWT_SECRET=una-cadena-larga-y-aleatoria

# 8081 y no 8080: el visor de infraestructura usa el 8080.
BIND_ADDR=127.0.0.1:8081

CORS_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:5174

# Solo en local: sin HTTPS, con Secure el navegador descarta la cookie
# y el login parece funcionar sin dejar sesión.
COOKIE_SECURE=false
```

## 3 · La API

```powershell
$env:SQLX_OFFLINE = "true"
cargo run
```

Arranca diciendo dónde escucha, qué orígenes acepta y si las cookies van sin `Secure`. Antes
imprimía `127.0.0.1` mientras escuchaba en `0.0.0.0`, así que ahora el mensaje es el dato.

## 4 · Los dos frontends

```powershell
cd web
npm install

npm run sso      # http://127.0.0.1:5173  — la pantalla de sesión
npm run tester   # http://127.0.0.1:5174  — el cliente de pruebas
```

Cada uno en su terminal.

### Por qué dos, y en puertos distintos

- **`web/sso`** es la pantalla del propio sistema de identidad: entrar, registrarse, salir.
- **`web/tester`** hace de **servicio consumidor**: no tiene login propio y vive en otro origen,
  igual que le pasará al visor.

Dos orígenes es lo que convierte esto en una prueba de verdad: así se ejercitan el **CORS con
credenciales** y el **`SameSite` de las cookies**, que es exactamente donde falla un SSO al salir de
una sola aplicación. Con todo en el mismo puerto, esos dos fallos quedan invisibles hasta el
despliegue.

> Vite se configura con `host: '127.0.0.1'` a propósito: si se le deja elegir escucha solo en `::1`
> (IPv6), y entonces Chrome —que resuelve `localhost` a IPv4— no encuentra nada mientras que Firefox
> sí. Con la dirección explícita funcionan los dos.

## El recorrido de prueba

1. Abre **`:5173`**. Debe decir «Sin sesión».
2. **Entra con el administrador inicial** del `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), que se crea
   al arrancar si no existe. O **crea una cuenta**: el formulario pide estado de Brasil y registra
   como `admin` porque `state` y `user_type` son `NOT NULL` en la tabla — restos del modelo de
   restaurantes, y justo lo que hay que quitar al separar la identidad del negocio.
3. **Entra.** El estado pasa a «Sesión activa» con tu identificador — y lo averigua preguntando a
   `/auth/verify`, no leyendo la cookie: es `HttpOnly` y JavaScript no la ve.
4. Abre **`:5174`** y pulsa **Ejecutar todo**. Sin haber puesto la contraseña aquí, debe:
   - `/auth/verify` → **200** con `X-Auth-User`
   - sin cookie → **401** (la ruta protegida rechaza como debe)
   - `/api/profile` → **200** con tus datos
   - `/refresh` → **200**, cookie de acceso renovada
5. Vuelve a `:5173`, pulsa **Cerrar sesión**, y repite el paso 4: todo debe dar **401**. El logout
   revoca el refresh token en la base, no solo borra la cookie.

Si el paso 4 funciona, **eso ya es SSO**: una sesión abierta en un origen sirve en otro sin volver
a pedir credenciales.

## Cuando algo falla

| Síntoma | Causa probable |
|---|---|
| «No se pudo hablar con el auth» | La API no está arrancada, o este origen no está en `CORS_ORIGINS` |
| Login da 200 pero sigue «Sin sesión» | `COOKIE_SECURE=true` sin HTTPS: el navegador acepta la respuesta y descarta la cookie |
| 200 pero sin `X-Auth-User` | Falta exponer la cabecera en CORS (`expose_headers`). Un proxy no lo sufre; un navegador sí |
| El alta se queja de `state` o `user_type` | Las dos son `NOT NULL` en la tabla. No hay trigger que lo exija —la función `check_user_profile` existe pero nadie la dispara— es la propia columna |
| `Address already in use` | El visor está en el 8080. Usa `BIND_ADDR=127.0.0.1:8081` |
| Chrome no abre `:5173` y Firefox sí | Vite escuchando solo en IPv6. Arranca con `--host 127.0.0.1` |

## Lo que esto todavía no prueba

- **El proxy inverso.** `/auth/verify` responde, pero nadie lo consume aún como `auth_request`. Ese
  es el paso 5 del [camino a SSO](camino-a-sso.md), y es un fichero de configuración de nginx.
- **Que un token no valga en otro servicio.** No puede probarse hasta que haya `aud` en los claims.
