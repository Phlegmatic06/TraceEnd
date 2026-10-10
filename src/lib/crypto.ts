import crypto from 'crypto';
import { env } from '@/lib/config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM with the INTEGRATION_ENCRYPTION_KEY.
 * Returns a hex string in the format: iv:tag:encryptedData
 */
export function encrypt(text: string): string {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is not defined');
  }

  const key = Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted using encrypt().
 */
export function decrypt(encryptedText: string): string {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is not defined');
  }

  const key = Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, 'hex');
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const ivString = parts[0] as string;
  const tagString = parts[1] as string;
  const encrypted = parts[2] as string;

  const iv = Buffer.from(ivString, 'hex');
  const tag = Buffer.from(tagString, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Computes a deterministic SHA-256 hash. Useful for creating stable fingerprints.
 */
export function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
