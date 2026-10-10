import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/lib/config/env';

const globalForQueue = globalThis as unknown as {
  scanQueueInstance: Queue | null;
  redisConnection: Redis | null;
};

export function getScanQueue(): Queue {
  if (globalForQueue.scanQueueInstance) return globalForQueue.scanQueueInstance;

  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    // prevent connection errors from crashing the app immediately during build
    lazyConnect: true,
    // Prevent commands from queueing if connection is completely down
    enableOfflineQueue: false,
    retryStrategy(times) {
      // Retry a few times quickly, then give up so API requests don't hang indefinitely
      if (times > 3) return null;
      return Math.min(times * 100, 1000);
    }
  });

  redisConnection.on('error', (err) => {
    // Silence unhandled error events to avoid crashing the server
    console.error('Redis connection error:', err.message);
  });

  const scanQueueInstance = new Queue('scans', { connection: redisConnection });
  globalForQueue.redisConnection = redisConnection;
  globalForQueue.scanQueueInstance = scanQueueInstance;
  return scanQueueInstance;
}

export async function addScanJob(name: string, data: any, opts?: any) {
  try {
    const queue = getScanQueue();
    // In bullmq, lazyConnect means we might need to wait for it or just let queue.add attempt it
    return await queue.add(name, data, opts);
  } catch (error) {
    console.error('Failed to add scan job to queue:', error);
    throw new Error('QUEUE_UNAVAILABLE');
  }
}
