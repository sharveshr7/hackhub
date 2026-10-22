import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function apiDevServerPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    const isStudentAuth = req.url?.startsWith('/api/student-auth');
    const isAdminUsers = req.url?.startsWith('/api/admin/users');

    if (isStudentAuth || isAdminUsers) {
      // Parse query params from URL if not already present
      if (!req.query && req.url?.includes('?')) {
        const queryPart = req.url.split('?')[1] || '';
        const parsedQuery: Record<string, string> = {};
        for (const [k, v] of new URLSearchParams(queryPart).entries()) {
          parsedQuery[k] = v;
        }
        req.query = parsedQuery;
      } else if (!req.query) {
        req.query = {};
      }

      if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        try {
          let bodyStr = '';
          for await (const chunk of req) bodyStr += chunk.toString();
          req.body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Request body must be valid JSON.' }));
          return;
        }
      }

      try {
        const apiModule = isStudentAuth
          ? await import('./api/student-auth.ts')
          : await import('./api/admin/users.ts');
        const apiHandler = apiModule.default;

        const responseAdapter = {
          setHeader(name: string, value: string) {
            res.setHeader(name, value);
            return this;
          },
          status(code: number) {
            res.statusCode = code;
            return this;
          },
          json(payload: unknown) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return this;
          },
          end() {
            res.end();
            return this;
          }
        };
        await apiHandler(req, responseAdapter);
      } catch (err: any) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
        }
        if (!res.writableEnded) res.end(JSON.stringify({ error: err.message || 'Server error' }));
      }
      return;
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
