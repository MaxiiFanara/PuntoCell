import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Dentro de Docker Vite imprime su puerto interno (5173), no el publicado en el host.
// PUBLIC_FRONT_URL (la define docker-compose) muestra la URL real para el navegador.
const urlPublica = {
  name: 'url-publica',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      if (process.env.PUBLIC_FRONT_URL) {
        console.log(`  ➜  Acceso externo: ${process.env.PUBLIC_FRONT_URL}`)
      }
    })
  },
}

export default defineConfig({
  // Fuera de Docker las VITE_* se leen del .env de la raíz del proyecto.
  envDir: '..',
  plugins: [tailwindcss(), react(), urlPublica],
  server: {
    // Mercado Pago rechaza auto_return si las back_urls no son https, así que para
    // probar la vuelta automática en desarrollo el front se expone por un túnel de
    // cloudflared. Vite bloquea por defecto los hosts que no conoce.
    allowedHosts: ['.trycloudflare.com'],

    // El front pide siempre a /api, del mismo origen, y Vite reenvía a la API.
    // Así la cookie de sesión nunca es cross-site: andaba en localhost pero se
    // rompía apenas el front se servía desde otro dominio (el login entraba y
    // rebotaba, porque el navegador no mandaba la cookie). De paso evita el
    // contenido mixto al servir el front por https, y el CORS deja de intervenir.
    // En Docker el destino es el contenedor `api`; corriendo fuera, localhost.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // La API valida CORS por el header Origin, y el proxy lo reenviaba
            // tal cual: servido por un túnel, la API veía el dominio del túnel y
            // rechazaba la llamada. Este salto lo hace el servidor de Vite, no
            // el navegador, así que se reescribe al origen que la API espera.
            // El navegador sigue aplicando su política entre página y dev server.
            proxyReq.setHeader('origin', 'http://localhost:5175');
          });
        },
      },
    },
  },
})
