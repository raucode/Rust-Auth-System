# Inventario: qué se reutiliza, qué se adapta y qué sobra

Hecho leyendo el código y la migración, no de memoria. La conclusión corta: **se va el dominio de
negocio, no la mecánica de seguridad** — y lo difícil ya está hecho y correcto.

El paquete se llama **`core_suite`**, el mismo nombre que el backend de Gardenia Restaurantes. Los
dos repositorios comparten código base, y eso explica que el modelo de usuarios sea de un SaaS de
restaurantes y no de un sistema de identidad.

## Las 13 tablas del esquema

**5 se reutilizan tal cual · 2 se adaptan · 6 no pertenecen a un SSO**

| Tabla | Veredicto | Por qué |
|---|---|---|
| `refresh_tokens` | reutilizar | Lo mejor del proyecto: guarda el *hash* y no el token, con `revoked`, `user_agent`, `ip` y los índices de las tres consultas reales — validar, revocar en masa y limpiar expirados |
| `roles` | reutilizar | RBAC genérico |
| `permissions` | reutilizar | RBAC genérico |
| `user_roles` | reutilizar | RBAC genérico |
| `role_permissions` | reutilizar | RBAC genérico |
| `users` | **adaptar** | Sirven `email`, `password_hash`, `full_name`, `phone`, `is_active` y las marcas de tiempo. Fuera `state` (los 27 estados de Brasil, dato de cliente final) y `user_type` (dueño / empleado / admin de un negocio) |
| `admins` | **adaptar** | `access_level` como entero duplica lo que ya hace el RBAC |
| `owners` | fuera | `cpf` y `verified`: el dueño de un restaurante |
| `employers` | fuera | `restaurant_id`, `salary`, `hire_date`, `role_gerarqui`. **Guarda nóminas** |
| `plans` | fuera | Suscripciones de pago |
| `features` | fuera | Funcionalidades por plan |
| `plan_features` | fuera | Idem |
| `user_plans` | fuera | Qué plan tiene contratado cada cliente |

«Fuera» significa **fuera del SSO**, no borrado del mundo: si este código base es también el de
Gardenia, esas tablas siguen vivas allí. Por eso hay que aclarar la relación entre los dos
repositorios antes de cortar.

## El corte es limpio

Todas las claves ajenas apuntan hacia `users`: **lo que sobra depende de él y no al revés**, y
nada de lo que se conserva depende de lo que se va. Las seis tablas se desprenden sin arrastrar
nada.

> **Corrección del 2026-08-07.** Aquí se dijo que el trigger `check_user_profile` era una costura
> que obligaba a declarar el tipo de negocio en cada alta. **Es falso.** La migración crea la
> `FUNCTION auth.check_user_profile()` pero **no hay ningún `CREATE TRIGGER` que la conecte**: es
> una función huérfana que no se ha ejecutado nunca. Se afirmó al leer la función sin comprobar que
> algo la disparara.
>
> Consecuencia: el corte es **más** limpio de lo dicho, sin ninguna costura. Y lo que de verdad
> obliga en cada alta no es un trigger, sino que **`state` y `user_type` son `NOT NULL`** en la
> tabla — dos columnas que se van con el resto del modelo de restaurantes.

Lo primero que hay que quitar para que `users` vuelva a ser una tabla de personas son esas dos
columnas y la función huérfana, que no hace nada pero describe un modelo que ya no será el de este
sistema.

## El código

| Pieza | Veredicto | Nota |
|---|---|---|
| `middleware.rs` | reutilizar | La validación salió a `validar_token` para compartirla con `/verify` |
| refresh tokens | reutilizar | Generación aleatoria, hash SHA-256, rotación y revocación |
| cookies | reutilizar | Ya con `Secure` por configuración, en las tres |
| `/auth/verify` | reutilizar | La pieza del camino con proxy; en OIDC se convierte en el *userinfo* |
| `config.rs`, `db.rs` | reutilizar | Sin cambios previstos |
| Swagger / `utoipa` | reutilizar | Gana valor con varios clientes |
| `Claims` | **adaptar** | Solo `sub`, `exp` e `iat`. Sin `iss` ni `aud`, un token vale en todos los servicios |
| `create_jwt` · firma | **adaptar** | HS256 basta con proxy; OIDC exige asimétrica, y eso cambia el formato del token |
| `handler_users.rs` | reescribir | `register_employer` y `get_employees_summary` gestionan empleados de un restaurante |
| ~~`src/generic/`~~ | **eliminado** | Seis ficheros que **no compilaban**: `main.rs` no declaraba `mod generic`. Código muerto nunca ejecutado |

## Dependencias

| Qué | Acción | Motivo |
|---|---|---|
| `sqlx` | **0.7 → 0.8** ✔ | La 0.7.4 arrastraba código que una versión futura de Rust va a rechazar, y alinea con el visor (0.8.6) |
| `bigdecimal` | **0.3 → 0.4** ✔ | Obligado por sqlx 0.8: con dos versiones del tipo en el árbol, los traits `Decode`/`Type` no son los mismos |
| `base64` | **0.21 → 0.22** ✔ | `encode` quedó deprecada; ahora se codifica por un *engine* explícito |
| `actix-web` 4 | se queda | El visor usa axum, pero son servicios separados que hablan HTTP |
| `jsonwebtoken`, `bcrypt` | se quedan | Al día y adecuadas |
| `rust_decimal`, `bigdecimal` | fuera **más adelante** | Solo los usa `salary`, de `employers`. Se van con esa tabla, no antes |

## De qué depende el bloque «adaptar»

De una sola pregunta: **de dónde salen las personas.** Si la respuesta es el Active Directory,
`users` deja de ser el padrón y pasa a ser una proyección de lo que ya existe allí — y entonces
`email` y `password_hash` también cambian de sentido, porque la contraseña la valida el AD.

Hasta que eso se decida, lo reutilizable se puede tocar y lo que sobra se puede quitar, pero lo
adaptable no tiene forma final.
