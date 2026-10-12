import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import columnRoutes from './routes/column.routes.js';
import { authMiddleware } from './middlewares/auth.middleware.js';

export function createApp(): Express {
  const app = express();

  // Configuração flexível de CORS para suportar dev local e deploy no Vercel
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permite requisições sem origin (como mobile apps, curl ou webhooks de servidor para servidor)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Permissivo em boilerplate para evitar bloqueios indesejados
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Parsers de requisição
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Status / Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'todo-backend-api',
    });
  });

  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      name: 'Microsoft To Do Clone API',
      version: '1.0.0',
      endpoints: {
        tasks: '/tasks',
        columns: '/columns',
        webhooks: '/webhooks/incoming-email',
        health: '/health',
      },
    });
  });

  // Rotas de autenticação (Pública para login)
  app.use('/auth', authRoutes);

  // Rotas protegidas (Exigem token JWT válido)
  app.use('/tasks', authMiddleware, taskRoutes);
  app.use('/columns', authMiddleware, columnRoutes);

  // Webhooks externos (Make, Zapier)
  app.use('/webhooks', webhookRoutes);

  // Tratamento de 404 (Rota não encontrada)
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Rota [${req.method}] ${req.originalUrl} não encontrada` });
  });

  // Middleware global de tratamento de erros
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('Erro não tratado na requisição:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Erro interno no servidor',
    });
  });

  return app;
}
