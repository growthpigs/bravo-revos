import { spawn } from 'child_process';
import process from 'process';

import {
  enforceSingleInstance,
  type ReleaseSingleInstance,
} from '../lib/utils/single-instance';

const LOG_PREFIX = '[DEV_SERVER]';
const DEFAULT_PORT = 4700;

async function start() {
  const lockPort = Number.parseInt(process.env.DEV_SERVER_LOCK_PORT ?? String(DEFAULT_PORT), 10);
  let release: ReleaseSingleInstance | undefined;

  try {
    release = await enforceSingleInstance({
      id: 'DEV_SERVER',
      port: lockPort,
    });
    console.log(`${LOG_PREFIX} Single-instance guard acquired on port ${lockPort}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} ${message}`);
    console.error(
      `${LOG_PREFIX} If no server should be running, stop the other process or change DEV_SERVER_LOCK_PORT.`,
    );
    process.exit(1);
  }

  let released = false;
  const releaseGuard = () => {
    if (!released && release) {
      release();
      released = true;
    }
  };

  const child = spawn('next', ['dev'], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    releaseGuard();
    process.exit(code ?? 0);
  });

  const handleTermination = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal);
    }
    releaseGuard();
  };

  process.on('SIGINT', () => handleTermination('SIGINT'));
  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('exit', () => releaseGuard());
}

start().catch((error) => {
  console.error(`${LOG_PREFIX} Failed to start dev server wrapper`, error);
  process.exit(1);
});

