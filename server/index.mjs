import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createApp } from './app.mjs';
import { createStore } from './store.mjs';

process.env.NODE_ENV ||= process.argv.includes('--dev') ? 'development' : 'production';
if (process.env.NODE_ENV !== 'production' && existsSync('.env.local')) loadEnvFile('.env.local');
const port = Number(process.env.PORT || 3001);
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('Production requires DATABASE_URL.');
const store = await createStore({ connectionString: process.env.DATABASE_URL, ownerEmail: process.env.OWNER_EMAIL });
const server = createApp({ store }).listen(port, '0.0.0.0', () => console.log(`pempom server listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await store.close(); process.exit(0); }));
