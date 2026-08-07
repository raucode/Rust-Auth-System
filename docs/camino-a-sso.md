# De auth de una aplicación a SSO

Documento de rumbo. Lo que hay, adónde va y por qué en ese orden.

## El objetivo

Convertir este componente en el **sistema de identidad único** de la infraestructura interna, con
el **visor de infraestructura** como primer cliente: hoy no tiene autenticación ninguna y guarda
las credenciales de las cámaras en claro, y esa deuda es lo único que impide sacarlo de una sola
máquina.

## Lo que hay no es SSO todavía

Hoy esto es **autenticación de una sola aplicación**: emite un JWT en cookie para su propio
frontend y lo valida su propio middleware. Un SSO es un login que sirve a **varias aplicaciones
que validan la sesión sin volver a pedir credenciales**. De la diferencia salen cuatro huecos:

| Hueco | Por qué importa |
|---|---|
| **Firma simétrica (HS256)** | La misma clave firma y verifica. Repartirla a cada servicio significa que **cualquiera de ellos puede emitir tokens de cualquier usuario** |
| **Sin `iss` ni `aud`** | Un token emitido para un servicio vale en todos |
| **La cookie no cruza dominios** | Con servicios en hosts distintos hace falta un flujo de redirección real |
| **Sin descubrimiento** | Un cliente no tiene de dónde sacar las claves ni los endpoints |

Y lo que **sí** está listo: los refresh tokens revocables son media base del cierre de sesión
global, y el RBAC del esquema sirve tal cual para autorizar por servicio.

## Dos caminos, y por qué se eligió empezar por uno

### A · OIDC propio

El auth se convierte en proveedor de identidad: par de claves, JWKS publicado, *authorization code*
con PKCE, y cada servicio verifica el token por su cuenta.

Es la respuesta ortodoxa y la única que sirve para clientes de terceros o aplicaciones móviles. El
precio: criptografía que gestionar y rotar, y **cada servicio necesita librería JWT y lógica de
validación** — tres implementaciones que pueden divergir.

### B · Puerta única con proxy inverso

Un proxy delante de todo. Antes de servir una petición hace una **subpetición** a `/auth/verify`;
si responde 200 deja pasar e inyecta la identidad en cabeceras, y si responde 401 redirige al
login.

Con esto **ningún servicio sabe qué es un JWT**. El visor queda protegido sin escribir una línea,
la revocación es inmediata —cada petición pregunta— y HTTPS se configura en un solo sitio.

El precio: un salto de red por petición, el proxy es punto único de fallo, y no sirve para clientes
externos.

### La decisión

**Empezar por B, sin cerrar A.** El visor se desbloquea en días en vez de semanas, y cuando
aparezca un cliente que no pase por el proxy, A se añade encima: el proxy sigue siendo la puerta y
el token pasa a ser una segunda forma de entrar, no un reemplazo.

Se consideró montar **Keycloak o Authentik** en lugar de escribirlo. Se descartó a favor del
control y del recorrido de aprendizaje, sabiendo que un proveedor de identidad es de las cosas más
fáciles de hacer mal en seguridad. Queda anotado por si algún día el coste de mantenerlo pesa más.

## Donde esto se rompe

**La seguridad del camino B depende de que los servicios no sean alcanzables salvo por el proxy.**
Si un servicio sigue escuchando en un puerto abierto, cualquiera lo pide directo y no hay
autenticación.

Y la regla que sostiene el esquema entero: **el proxy tiene que borrar cualquier cabecera
`X-Auth-*` que llegue de fuera** antes de escribir la suya. Si un cliente pudiera mandarla, se
declararía quien quisiera.

## Orden de trabajo

| # | Paso | Estado |
|---|---|---|
| 1 | Configuración fuera del código (`BIND_ADDR`, `CORS_ORIGINS`, `COOKIE_SECURE`) | **hecho** |
| 2 | `GET /auth/verify` para el proxy | **hecho** |
| 3 | Limpieza: fuera `src/generic/`, sqlx a 0.8, base64 al día | **hecho** |
| 4 | Frontends de prueba en dos orígenes | **hecho** |
| 5 | El proxy delante del visor | pendiente |
| 6 | Separar la identidad del modelo de restaurantes | pendiente, y depende de la decisión del AD |
| 7 | Firma asimétrica y JWKS | cuando haya un cliente que no pase por el proxy |

Los pasos 1 a 4 sirven **igual en los dos caminos**: no comprometen la arquitectura.

## Lo que sigue sin decidir

- **De dónde salen las personas**: padrón propio o el Active Directory como fuente de verdad. Es lo
  que da forma final a la tabla `users`, y mientras no se decida el paso 6 no tiene forma.
- **Qué relación tiene este repositorio con `gardenia-restaurantes`**, que comparte el mismo
  paquete `core_suite`. Los dos van a divergir.
- **Si el repositorio sigue siendo público** cuando pase a ser el sistema de identidad de la
  empresa.

## Documentos hermanos

- [`inventario.md`](inventario.md) — qué se reutiliza, qué se adapta y qué sobra, pieza por pieza.
- [`probar-en-local.md`](probar-en-local.md) — cómo levantarlo todo y qué comprobar.
