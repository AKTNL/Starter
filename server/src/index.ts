import './env';
import express from 'express';
import { router as authRouter } from './routes/auth';

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error(
    'FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set. Copy .env.example to .env and fill them in.',
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authRouter);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
