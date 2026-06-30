import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Custom Socket.IO adapter that uses Redis for cross-node signaling distribution.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(appOrHttpServer: any, private readonly redisUrl: string) {
    super(appOrHttpServer);
  }

  /**
   * Connect clients and configure Adapter.
   */
  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl, {
      maxRetriesPerRequest: null,
    });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('Socket.IO Redis PubClient Error:', err);
    });

    subClient.on('error', (err) => {
      console.error('Socket.IO Redis SubClient Error:', err);
    });

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
