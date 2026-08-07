// Pantalla de sesión del SSO.
//
// Todas las llamadas van con `credentials: 'include'`. Sin eso el navegador no
// manda la cookie a otro origen ni guarda la que llega, y el login parece
// funcionar —la API responde 200— pero la sesión no queda en ninguna parte. Es el
// primer sitio donde se rompe un SSO al salir de una sola aplicación.

const API = import.meta.env.VITE_AUTH_URL ?? 'http://127.0.0.1:8081'

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const $ = (sel) => document.querySelector(sel)

const estado = $('#estado')
const estadoTxt = $('#estado-txt')
const registro = $('#registro')
const sinActividad = $('#sin-actividad')

$('#pie-api').textContent = API
$('#pie-origen').textContent = location.origin

// Estados de Brasil en el desplegable. Están aquí porque el esquema los exige,
// no porque tengan sentido para un SSO de empresa.
$('#sel-estado').innerHTML = ESTADOS_BR
  .map((e) => `<option value="${e}"${e === 'GO' ? ' selected' : ''}>${e}</option>`)
  .join('')

/** Escribe una línea en el registro de actividad. */
function anotar(codigo, texto, clase) {
  sinActividad.hidden = true
  const linea = document.createElement('div')
  linea.className = `linea ${clase}`
  linea.innerHTML = `<span class="cod"></span><span class="txt"></span>`
  linea.querySelector('.cod').textContent = codigo
  linea.querySelector('.txt').textContent = texto
  registro.prepend(linea)
}

function pintarEstado(clase, texto) {
  estado.className = `estado ${clase}`
  estadoTxt.textContent = texto
}

/** Llama a la API con la cookie incluida y devuelve la respuesta cruda. */
async function llamar(ruta, opciones = {}) {
  return fetch(`${API}${ruta}`, {
    credentials: 'include',
    headers: opciones.body ? { 'Content-Type': 'application/json' } : {},
    ...opciones,
  })
}

/**
 * Pregunta a la API si hay sesión.
 *
 * No se puede saber leyendo la cookie: es `HttpOnly` y el navegador la esconde de
 * JavaScript a propósito. Se pregunta a `/auth/verify`, que es el mismo endpoint
 * que consultará un proxy inverso — así esta pantalla comprueba de paso la pieza
 * de la que depende todo el esquema.
 */
async function comprobarSesion({ silencioso = false } = {}) {
  try {
    const res = await llamar('/auth/verify')
    if (res.ok) {
      const usuario = res.headers.get('X-Auth-User')
      pintarEstado('si', usuario ? `Sesión activa · ${usuario}` : 'Sesión activa')
      if (!silencioso) anotar(res.status, `/auth/verify → sesión de ${usuario ?? 'usuario desconocido'}`, 'ok')
      return true
    }
    pintarEstado('no', 'Sin sesión')
    if (!silencioso) anotar(res.status, '/auth/verify → sin sesión válida', 'fail')
    return false
  } catch (err) {
    // Aquí caen los fallos de red y los de CORS, y conviene distinguirlos: si el
    // auth no está arrancado el mensaje es el mismo que si el origen no está en
    // CORS_ORIGINS, y son dos arreglos muy distintos.
    pintarEstado('no', 'No se pudo hablar con el auth')
    anotar('—', `Sin respuesta de ${API}. ¿Está arrancado y este origen en CORS_ORIGINS? (${err.message})`, 'fail')
    return false
  }
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault()
  const datos = Object.fromEntries(new FormData(e.target))
  const res = await llamar('/auth/user/login', {
    method: 'POST',
    body: JSON.stringify({ email: datos.email, password: datos.password }),
  })
  const cuerpo = await res.text()
  anotar(res.status, res.ok ? 'Login correcto, cookie recibida' : `Login rechazado: ${cuerpo || 'sin detalle'}`, res.ok ? 'ok' : 'fail')
  if (res.ok) e.target.reset()
  await comprobarSesion({ silencioso: true })
})

$('#btn-salir').addEventListener('click', async () => {
  const res = await llamar('/auth/user/logout', { method: 'POST' })
  // El logout revoca el refresh token en la base, no solo borra la cookie: es lo
  // que hace que cerrar sesión sirva de algo con un token robado.
  anotar(res.status, res.ok ? 'Sesión cerrada y refresh token revocado' : 'No se pudo cerrar la sesión', res.ok ? 'ok' : 'fail')
  await comprobarSesion({ silencioso: true })
})

$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault()
  const datos = Object.fromEntries(new FormData(e.target))

  // El contrato real de la API: un objeto `base` más el perfil que corresponda al
  // `user_type`. Se manda `admin` porque es el único perfil que no arrastra datos
  // de restaurante (CPF, nómina, `restaurant_id`).
  const cuerpo = {
    base: {
      user_type: 'admin',
      email: datos.email,
      password: datos.password,
      full_name: datos.full_name,
      phone: datos.phone || null,
      state: datos.state,
    },
    admin: { access_level: 1, internal_note: 'creado desde el frontend de pruebas' },
  }

  const res = await llamar('/auth/user/register', {
    method: 'POST',
    body: JSON.stringify(cuerpo),
  })
  const texto = await res.text()
  anotar(res.status, res.ok ? `Cuenta creada: ${datos.email}` : `Alta rechazada: ${texto || 'sin detalle'}`, res.ok ? 'ok' : 'fail')
  if (res.ok) e.target.reset()
})

comprobarSesion()
