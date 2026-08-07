import { defineConfig } from 'vite'

// La pantalla de sesión: el propio SSO.
//
// Se sirve en `localhost`, y el auth escucha en **los dos loopbacks** (`127.0.0.1`
// y `[::1]`) precisamente por esto: en Windows `localhost` resuelve primero a
// `::1`, así que un auth atado solo a IPv4 no responde y el navegador solo dice
// «no se pudo conectar». Los cuatro orígenes —localhost y 127.0.0.1, en los dos
// puertos— están en el CORS por defecto por la misma razón: para el navegador son
// orígenes distintos.
export default defineConfig({
  root: 'sso',
  server: { host: 'localhost', port: 5173, strictPort: true },
})
