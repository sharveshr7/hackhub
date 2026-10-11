import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleStudentAuth } from './api/student-auth.ts'

function apiDevServerPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    if (req.url?.startsWith('/api/student-auth')) {
      if (req.method === 'GET') {
        const urlStr = req.url || '';
        const hasDiagnosticsQuery = urlStr.includes('diagnostics=true') || urlStr.includes('diagnostics=1');

        if (hasDiagnosticsQuery) {
          const authHeader = req.headers['authorization'];
          if (!authHeader) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unauthorized: Administrative authorization required to view internal diagnostic telemetry.' }));
            return;
          }

          try {
            const { verifyServerRequest, getAuthDiagnostics } = await import('./api/student-auth.ts');
            const verification = await verifyServerRequest(authHeader, 'ADMIN');
            if (!verification.valid) {
              res.statusCode = verification.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: verification.error || 'Forbidden: Administrative privileges required.' }));
              return;
            }

            const diag = await getAuthDiagnostics();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              status: 'ok',
              service: 'HackHub Student Authentication & Verification API',
              diagnostics: diag
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Server error' }));
          }
          return;
        }

        // Public health check without exposing internal infrastructure details
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', service: 'HackHub Student Authentication & Verification API' }));
        return;
      }

      if (req.method === 'POST') {
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
    }
    next();
  };

  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
})
