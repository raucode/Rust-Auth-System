import { defineConfig } from 'vite'

// La pantalla de sesión: el propio SSO.
//
// `host: '127.0.0.1'` y no el valor por defecto: Vite escucha en `::1` (IPv6) si
// se le deja elegir, y entonces Chrome —que resuelve `localhost` a IPv4— no
// encuentra nada. Con la dirección explícita funcionan los dos navegadores.
export default defineConfig({
  root: 'sso',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
