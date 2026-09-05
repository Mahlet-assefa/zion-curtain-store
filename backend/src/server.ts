import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './database/client';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import curtainRoutes from './routes/curtains.routes';
import ledgerRoutes from './routes/ledger.routes';
import debitRoutes from './routes/debits.routes';
import financeRoutes from './routes/finance.routes';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/curtains', curtainRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/debits', debitRoutes);
app.use('/api/finance', financeRoutes);

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(error.name === 'ZodError' ? 400 : 500).json({
    message: error.name === 'ZodError' ? 'Please check the submitted fields' : 'Something went wrong'
  });
});

async function start() {
  const schema = await fs.readFile(path.join(__dirname, 'database/schema.sql'), 'utf8');
  await pool.query(schema);
  app.listen(Number(process.env.PORT) || 4000, () => console.log(`Zion API listening on ${process.env.PORT || 4000}`));
}

start().catch(error => {
  console.error('Unable to start API', error);
  process.exit(1);
});
