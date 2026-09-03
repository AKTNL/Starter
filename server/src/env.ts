import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Load .env from the repo root (server/ is two levels below the repo root).
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../..', '.env') });
