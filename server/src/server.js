import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env, validateEnv } from './config/env.js';

function findCauseCode(error, depth = 0, seen = new Set()) {
  if (!error || depth > 5 || seen.has(error)) return undefined;
  seen.add(error);
  if (typeof error.code === 'string') return error.code;
  const nestedServers = error.reason?.servers instanceof Map ? [...error.reason.servers.values()].map(server => server.error) : [];
  for (const nested of [error.cause, error.reason, ...nestedServers]) {
    const code = findCauseCode(nested, depth + 1, seen);
    if (code) return code;
  }
  return undefined;
}

async function start() {
  try {
    validateEnv();
  } catch (error) {
    console.error(`Startup configuration error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase(env.mongoUri);
  } catch (error) {
    const code = findCauseCode(error);
    const issue = code ? `, network/code ${code}` : '';
    const hint = code === 'ECONNRESET'
      ? 'The remote host reset the connection. For local development, add this computer’s current public IP to Atlas Network Access; also check VPN/firewall rules and the Atlas database user.'
      : 'Check the server/.env MONGODB_URI, Atlas IP access list, and database user credentials.';
    console.error(`MongoDB connection failed (${error.name || 'unknown error'}${issue}). ${hint}`);
    process.exitCode = 1;
    return;
  }

  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => console.log(`AI Mystery Room listening on port ${env.port}`));
  server.on('error', error => {
    console.error(`HTTP server could not start (${error.code || error.name}). Check whether port ${env.port} is already in use.`);
    process.exitCode = 1;
  });
}

start();
