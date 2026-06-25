import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const openAIModel = env.OPENAI_IMAGE_MODEL || env.VITE_OPENAI_IMAGE_MODEL || 'gpt-5.5';

    const forwardOpenAIRequest = async (body: string) => {
      const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        return {
          status: 503,
          body: JSON.stringify({ error: 'OPENAI_API_KEY is not configured.' }),
        };
      }

      const requestBody = JSON.parse(body || '{}');
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestBody,
          model: requestBody.model || openAIModel,
        }),
      });

      return {
        status: response.status,
        body: await response.text(),
      };
    };

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'openai-local-api',
          configureServer(server) {
            server.middlewares.use('/api/openai-responses', async (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method not allowed.' }));
                return;
              }

              let body = '';
              req.setEncoding('utf8');
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const result = await forwardOpenAIRequest(body);
                  res.statusCode = result.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(result.body);
                } catch (error) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'OpenAI proxy failed.' }));
                }
              });
            });
          },
        },
      ],
      define: {
        'process.env.OPENAI_IMAGE_MODEL': JSON.stringify(openAIModel),
        'process.env.VITE_OPENAI_IMAGE_MODEL': JSON.stringify(openAIModel)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
            },
          },
        },
      }
    };
});
