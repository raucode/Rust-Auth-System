import { defineConfig } from 'vite'

// El cliente de pruebas, en **otro puerto a propósito**.
//
// Dos orígenes distintos es lo que convierte esto en una prueba de verdad: así se
// ejercitan el CORS con credenciales y el `SameSite` de las cookies, que es donde
// falla un SSO en cuanto sale de una sola aplicación. Con todo en el mismo puerto
// esos dos problemas quedan invisibles.
export default defineConfig({
  root: 'tester',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
})
