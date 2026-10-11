import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleStudentAuth } from './api/student-auth.ts'

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/student-auth' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk: any) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};
              const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString();
              const result = await handleStudentAuth(body, clientIp);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.body));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Server error' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
})
