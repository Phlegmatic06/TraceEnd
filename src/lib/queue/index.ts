import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/lib/config/env';

let scanQueueInstance: Queue | null = null;
let redisConnection: Redis | null = null;

export function getScanQueue(): Queue {
  if (scanQueueInstance) return scanQueueInstance;

  redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    // prevent connection errors from crashing the app immediately during build
    lazyConnect: true,
  });

  scanQueueInstance = new Queue('scans', { connection: redisConnection });
  return scanQueueInstance;
}
