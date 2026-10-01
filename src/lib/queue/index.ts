import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/lib/config/env'; // Assuming REDIS_URL is in env

// For a production app, we would validate REDIS_URL in envSchema.
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const scanQueue = new Queue('scans', { connection });
