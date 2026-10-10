import { encrypt, decrypt, hashString } from '../src/lib/crypto';
import crypto from 'crypto';

describe('Crypto Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set a valid 64-character hex key (32 bytes)
    process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should encrypt and decrypt correctly', () => {
    const rawSecret = 'gho_some_random_secret_string_12345';
    
    const encrypted = encrypt(rawSecret);
    expect(encrypted).not.toContain(rawSecret);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('should reject tampered ciphertext', () => {
    const rawSecret = 'gho_some_random_secret_string_12345';
    const encrypted = encrypt(rawSecret);
    
    // Tamper with the ciphertext (last part)
    const parts = encrypted.split(':');
    // Change a character in the ciphertext
    parts[2] = parts[2].substring(0, parts[2].length - 1) + (parts[2].endsWith('a') ? 'b' : 'a');
    
    const tampered = parts.join(':');
    
    expect(() => decrypt(tampered)).toThrow();
  });

  it('should reject tampered auth tag', () => {
    const rawSecret = 'super_secret';
    const encrypted = encrypt(rawSecret);
    
    const parts = encrypted.split(':');
    parts[1] = crypto.randomBytes(16).toString('hex'); // replacing tag
    
    const tampered = parts.join(':');
    
    expect(() => decrypt(tampered)).toThrow();
  });

  it('hashString should be deterministic', () => {
    const hash1 = hashString('test');
    const hash2 = hashString('test');
    const hash3 = hashString('test2');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });
});
