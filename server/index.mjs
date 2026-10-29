import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createApp } from './app.mjs';

process.env.NODE_ENV ||= process.argv.includes('--dev') ? 'development' : 'production';
if (process.env.NODE_ENV !== 'production' && existsSync('.env.local')) loadEnvFile('.env.local');
const port = Number(process.env.PORT || 3001);
createApp().listen(port, '0.0.0.0', () => console.log(`pempom server listening on port ${port}`));
