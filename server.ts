import express, { type Request, type Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { app } from './server/app.ts';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

export async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[M.A. GROUP OF COMPANIES] Full-stack Server running on port ${PORT}`);
  });
}

// Automatically start server only when executed directly via node or tsx
const isDirectExecution = (): boolean => {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    return false;
  }
  const mainScript = process.argv[1];
  if (!mainScript) return false;
  return /(?:^|[\\/])server\.(?:ts|js|mjs|cjs)$/.test(mainScript);
};

if (isDirectExecution()) {
  startServer().catch((err) => {
    console.error('Fatal error starting server:', err);
  });
}

export { app };
export default app;
