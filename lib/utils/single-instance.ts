import net from 'net';

export type ReleaseSingleInstance = () => void;

export interface SingleInstanceOptions {
  /** Human-readable identifier for logging */
  id: string;
  /** TCP port used to enforce single instance */
  port: number;
  /** Host interface to bind the guard server to */
  host?: string;
}

const DEFAULT_HOST = '127.0.0.1';

export async function enforceSingleInstance({
  id,
  port,
  host = DEFAULT_HOST,
}: SingleInstanceOptions): Promise<ReleaseSingleInstance> {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`[${id}] Invalid port provided for single-instance guard: ${port}`);
  }

  return new Promise<ReleaseSingleInstance>((resolve, reject) => {
    const server = net.createServer();

    const handleError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`[${id}] Another instance is already running (port ${host}:${port}).`));
      } else {
        reject(error);
      }
    };

    server.once('error', handleError);

    server.listen(port, host, () => {
      server.removeListener('error', handleError);
      server.unref();

      let closed = false;

      const closeServer = () => {
        if (closed) return;
        closed = true;
        server.close();
      };

      const shutdown = () => {
        closeServer();
        process.removeListener('exit', shutdown);
        process.removeListener('SIGINT', shutdown);
        process.removeListener('SIGTERM', shutdown);
      };

      process.once('exit', shutdown);
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);

      resolve(() => {
        shutdown();
      });
    });
  });
}





















