// Cliente de pruebas del SSO.
//
// Hace de servicio consumidor: **no tiene login propio**. Solo comprueba que una
// sesión abierta en otro origen sirve aquí, que es la definición práctica de SSO.
//
// Cada comprobación dice qué se espera y qué ha pasado, porque un 401 puede
// significar «no hay sesión» —correcto si no has entrado— o «el CORS no manda la
// cookie», y eso son dos arreglos distintos.

const API = import.meta.env.VITE_AUTH_URL ?? 'http://127.0.0.1:8081'
const ORIGEN_SSO = import.meta.env.VITE_SSO_URL ?? 'http://127.0.0.1:5173'

const $ = (sel) => document.querySelector(sel)

const estado = $('#estado')
const estadoTxt = $('#estado-txt')
const registro = $('#registro')
const sinActividad = $('#sin-actividad')
const perfil = $('#perfil')

$('#pie-api').textContent = API
$('#pie-origen').textContent = location.origin

function anotar(codigo, texto, clase) {
  sinActividad.hidden = true
  const linea = document.createElement('div')
  linea.className = `linea ${clase}`
  linea.innerHTML = `<span class="cod"></span><span class="txt"></span>`
  linea.querySelector('.cod').textContent = codigo
  linea.querySelector('.txt').textContent = texto
  registro.append(linea)
}

function pintarEstado(clase, texto) {
  estado.className = `estado ${clase}`
  estadoTxt.textContent = texto
}

async function llamar(ruta, opciones = {}) {
  return fetch(`${API}${ruta}`, { credentials: 'include', ...opciones })
}

/**
 * ¿Vale la sesión? Es la pregunta que hará el proxy inverso, así que es también la
 * comprobación más importante de esta página.
 */
async function probarVerify() {
  try {
    const res = await llamar('/auth/verify')
    const usuario = res.headers.get('X-Auth-User')

    if (res.ok && usuario) {
      anotar(res.status, `/auth/verify → 200 con X-Auth-User: ${usuario}`, 'ok')
      pintarEstado('si', `Sesión válida desde otro origen · ${usuario}`)
      return true
    }
    if (res.ok && !usuario) {
      // Pasa si el CORS no expone la cabecera: el 200 llega, el dato no. Un proxy
      // no lo sufriría —lee la respuesta directa, sin CORS— pero desde el
      // navegador engaña.
      anotar(res.status, '200 pero sin X-Auth-User visible: falta exponer la cabecera en CORS', 'fail')
      pintarEstado('espera', 'Sesión válida, cabecera no visible')
      return true
    }
    anotar(res.status, '/auth/verify → sin sesión. Entra primero en la pantalla de sesión', 'fail')
    pintarEstado('no', 'Sin sesión')
    return false
  } catch (err) {
    anotar('—', `No hubo respuesta. ¿Auth arrancado y ${location.origin} en CORS_ORIGINS? (${err.message})`, 'fail')
    pintarEstado('no', 'No se pudo hablar con el auth')
    return false
  }
}

/** Pide datos protegidos: prueba que la cookie sirve más allá de decir «sí». */
async function probarPerfil() {
  try {
    const res = await llamar('/api/profile')
    if (!res.ok) {
      anotar(res.status, '/api/profile → denegado por el middleware', 'fail')
      perfil.textContent = '— sin datos —'
      return
    }
    const datos = await res.json()
    perfil.textContent = JSON.stringify(datos, null, 2)
    anotar(res.status, '/api/profile → datos protegidos recibidos', 'ok')
  } catch (err) {
    anotar('—', `/api/profile sin respuesta (${err.message})`, 'fail')
  }
}

/**
 * Renueva el acceso con el refresh token.
 *
 * Es la parte más madura del proyecto y la que menos se prueba a mano: el refresh
 * se guarda como hash y es revocable, así que conviene ver que rota de verdad.
 */
async function probarRefresh() {
  try {
    const res = await llamar('/auth/user/refresh', { method: 'POST' })
    anotar(res.status, res.ok ? '/refresh → cookie de acceso renovada' : '/refresh → rechazado (¿sin refresh token o revocado?)', res.ok ? 'ok' : 'fail')
  } catch (err) {
    anotar('—', `/refresh sin respuesta (${err.message})`, 'fail')
  }
}

/** Comprueba que las rutas protegidas rechazan de verdad. */
async function probarSinCredenciales() {
  try {
    // Sin `credentials`, el navegador no manda la cookie: debe dar 401. Si diera
    // 200, la ruta no estaría protegida en absoluto.
    const res = await fetch(`${API}/api/profile`, { credentials: 'omit' })
    if (res.status === 401) {
      anotar(res.status, 'Sin cookie → 401. La ruta protegida rechaza como debe', 'ok')
    } else {
      anotar(res.status, `¡ATENCIÓN! Sin cookie deberia ser 401 y fue ${res.status}`, 'fail')
    }
  } catch (err) {
    anotar('—', `Prueba sin credenciales sin respuesta (${err.message})`, 'info')
  }
}

async function ejecutarTodo() {
  registro.replaceChildren()
  perfil.textContent = '— sin datos —'
  anotar('···', `Probando ${API} desde ${location.origin}`, 'info')

  const conSesion = await probarVerify()
  await probarSinCredenciales()

  if (conSesion) {
    await probarPerfil()
    await probarRefresh()
    await probarVerify()
  } else {
    anotar('···', `Abre ${ORIGEN_SSO} para entrar, y vuelve a ejecutar`, 'info')
  }
}

$('#btn-todo').addEventListener('click', ejecutarTodo)
$('#btn-verify').addEventListener('click', probarVerify)
$('#btn-refresh').addEventListener('click', probarRefresh)
$('#btn-limpiar').addEventListener('click', () => {
  registro.replaceChildren()
  perfil.textContent = '— sin datos —'
  sinActividad.hidden = false
  pintarEstado('espera', 'Sin comprobar')
})
