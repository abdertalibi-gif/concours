import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './routes/api.js';
import agentRoutes from './routes/agent.js';
import mastersRoutes from './routes/masters.js';
import authRoutes from './routes/auth.js';
import { updateAllMastersStatus } from './services/mastersService.js';

dotenv.config();

// Guard DATABASE_URL to prevent Prisma datasource validation errors (P1012)
if (!process.env.DATABASE_URL || (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://'))) {
  console.warn('[Server] DATABASE_URL not configured. Server will use Prisma default connection.');
}

export const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static uploads folder for documents and PDFs
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

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
  app.use('/api/auth', authRoutes);
  
  app.use('/api/agent', agentRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });

    // SPA Fallback AVANT les middlewares Vite :
    // Le plugin @cloudflare/vite-plugin force appType: "custom" et installe son
    // propre middleware catch-all (proxy workerd) qui répond 404 pour toute route
    // inconnue (/connexion, /mot-de-passe-reinitialisation, ...). Le fallback SPA
    // natif de Vite est donc inopérant et notre ancien fallback (après
    // vite.middlewares) n'était jamais atteint.
    // On sert index.html pour toute navigation SPA (GET non-API, hors fichiers).
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();

      const rawPath = req.originalUrl.split('?')[0];
      let pathname: string;
      try {
        pathname = decodeURIComponent(rawPath);
      } catch {
        return next();
      }

      // Laisser Vite gérer ses ressources internes et les modules sources.
      if (
        pathname.startsWith('/@') ||
        pathname.startsWith('/__') ||
        pathname.startsWith('/src/') ||
        pathname.startsWith('/node_modules/')
      ) {
        return next();
      }

      // Ne pas intercepter les demandes de fichiers statiques réels
      // (images, PDF, HTML nommé, etc.) : Vite / express.static s'en chargent.
      const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
      if (lastSegment.includes('.')) return next();

      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur inattendue est survenue sur le serveur.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);

    // Mise à jour automatique initiale des statuts des masters en comparant les dates limites avec la date du jour
    try {
      const initialUpdate = updateAllMastersStatus();
      console.log(`[Masters] ${initialUpdate.message}`);
    } catch (err) {
      console.error('[Masters] Erreur lors de la vérification initiale des statuts:', err);
    }

    // Vérification et mise à jour automatique planifiée toutes les heures
    setInterval(() => {
      try {
        updateAllMastersStatus();
      } catch (err) {
        console.error('[Masters] Erreur lors de la mise à jour automatique des statuts:', err);
      }
    }, 60 * 60 * 1000);
  });
}

startServer();
