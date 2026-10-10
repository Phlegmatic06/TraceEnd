import { redactSecret, redactPrivateKey } from '../src/lib/scanners/modules/github/redaction';
import { createFindingFingerprint } from '../src/lib/scanners/modules/github/fingerprint';
import { detectors } from '../src/lib/scanners/modules/github/detectors';
import { shouldSkipFile } from '../src/lib/scanners/modules/github/file-filter';
import crypto from 'crypto';

describe('GitHub Scanner Modules', () => {
  describe('Redaction', () => {
    it('redacts github tokens correctly', () => {
      const ghp = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const redacted = redactSecret(ghp);
      expect(redacted).toBe('ghp_••••••••••••••••••••••••••••••••wxyz');
      expect(redacted).not.toContain('1234567890abcdefghijklmnopqrstuv');
    });

    it('redacts generic secrets correctly', () => {
      const secret = 'supersecretpassword123';
      const redacted = redactSecret(secret);
      expect(redacted).toBe('supe••••••••••••••d123');
    });

    it('redacts short secrets securely', () => {
      const secret = 'short';
      const redacted = redactSecret(secret);
      expect(redacted).toBe('********');
    });

    it('redacts private keys entirely', () => {
      const pk = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
-----END RSA PRIVATE KEY-----`;
      const redacted = redactPrivateKey();
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('MIIE');
    });
  });

  describe('Fingerprinting', () => {
    it('generates consistent fingerprints for same secret in same file', () => {
      const params = {
        repositoryId: 'repo-123',
        detectorType: 'github-token',
        filePath: 'src/config.ts',
        rawSecret: 'ghp_secret'
      };

      const fp1 = createFindingFingerprint(params);
      const fp2 = createFindingFingerprint(params);

      expect(fp1.findingFingerprint).toBe(fp2.findingFingerprint);
      expect(fp1.secretFingerprint).toBe(fp2.secretFingerprint);
      expect(fp1.secretFingerprint).not.toContain('ghp_secret');
      expect(fp1.findingFingerprint).not.toContain('ghp_secret');
    });

    it('generates different fingerprints for different files', () => {
      const fp1 = createFindingFingerprint({
        repositoryId: 'repo-123', detectorType: 'github-token', filePath: 'src/config.ts', rawSecret: 'ghp_secret'
      });
      const fp2 = createFindingFingerprint({
        repositoryId: 'repo-123', detectorType: 'github-token', filePath: 'src/app.ts', rawSecret: 'ghp_secret'
      });

      expect(fp1.findingFingerprint).not.toBe(fp2.findingFingerprint);
      expect(fp1.secretFingerprint).toBe(fp2.secretFingerprint); // same secret
    });
  });

  describe('File Filter', () => {
    it('skips noisy directories', () => {
      expect(shouldSkipFile('node_modules/express/index.js')).toBe(true);
      expect(shouldSkipFile('.git/config')).toBe(true);
      expect(shouldSkipFile('src/components/button.tsx')).toBe(false);
    });

    it('skips binary extensions', () => {
      expect(shouldSkipFile('src/assets/logo.png')).toBe(true);
      expect(shouldSkipFile('dist/app.exe')).toBe(true);
      expect(shouldSkipFile('app.tar.gz')).toBe(true);
      expect(shouldSkipFile('main.ts')).toBe(false);
    });
  });

  describe('Detectors', () => {
    it('detects GitHub PATs', () => {
      const content = 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
      const detector = detectors.find(d => d.id === 'github-token')!;
      detector.pattern.lastIndex = 0;
      const match = detector.pattern.exec(content);
      expect(match).not.toBeNull();
      const extracted = detector.extract(match!, content);
      expect(extracted.rawSecret).toBe('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(extracted.redacted).toBe('ghp_••••••••••••••••••••••••••••••••wxyz');
    });

    it('detects Database Credentials', () => {
      const content = 'DATABASE_URL=postgres://user:supersecretpass@localhost:5432/db';
      const detector = detectors.find(d => d.id === 'database-credential')!;
      detector.pattern.lastIndex = 0;
      const match = detector.pattern.exec(content);
      expect(match).not.toBeNull();
      const extracted = detector.extract(match!, content);
      expect(extracted.rawSecret).toBe('supersecretpass');
      expect(extracted.redacted).toContain('supe•••••••pass');
      expect(extracted.redacted).toContain('postgres://user:');
    });
  });
});
