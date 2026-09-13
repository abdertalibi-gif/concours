import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './routes/api.js';
import agentRoutes from './routes/agent.js';
import mastersRoutes from './routes/masters.js';

dotenv.config();

export const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Basic health check route
  app.get('/api/health', async (req, res) => {
    try {
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'disconnected', error: String(error) });
    }
  });

  // Import API routes
  app.use('/api/masters', mastersRoutes);
  app.use('/api', apiRoutes);
  
  app.use('/api/agent', agentRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur inattendue est survenue sur le serveur.' });
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Serveur backend démarré sur le port ${port}`);
  });
}

startServer();
