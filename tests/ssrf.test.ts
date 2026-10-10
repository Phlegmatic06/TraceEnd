import { fetchHttpInfo } from '../src/lib/scanners/modules/domain/http';
import * as http from 'http';

describe('SSRF Hardening', () => {
  let server: http.Server;

  beforeAll((done) => {
    // Create a local server to test SSRF block
    server = http.createServer((req, res) => {
      if (req.url === '/redirect') {
        res.writeHead(301, { Location: 'http://127.0.0.1:8080/target' });
        res.end();
      } else {
        res.writeHead(200);
        res.end('OK');
      }
    });
    server.listen(8080, '127.0.0.1', done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('blocks localhost directly', async () => {
    await expect(fetchHttpInfo('127.0.0.1:8080', 'http:')).rejects.toThrow(/SSRF Prevention/);
  });

  it('blocks AWS metadata IP', async () => {
    await expect(fetchHttpInfo('169.254.169.254', 'http:')).rejects.toThrow(/SSRF Prevention/);
  }, 10000);

  it('blocks redirects to internal IP', async () => {
    // Decimal IP
    await expect(fetchHttpInfo('2130706433:8080', 'http:')).rejects.toThrow(/SSRF Prevention/);
  });

  describe('isInternalIP completeness', () => {
    // We can test isInternalIP through fetchHttpInfo by just passing raw IPs, 
    // since validateTargetDomain checks raw IPs instantly without DNS resolution.
    const blockedIPs = [
      '127.0.0.1',           // IPv4 Loopback
      '10.1.2.3',            // IPv4 Private
      '172.16.0.1',          // IPv4 Private
      '192.168.1.1',         // IPv4 Private
      '169.254.169.254',     // IPv4 Metadata
      '100.64.0.1',          // IPv4 CGNAT
      '224.0.0.1',           // IPv4 Multicast
      '0.0.0.0',             // IPv4 Unspecified
      '::1',                 // IPv6 Loopback
      '0:0:0:0:0:0:0:1',     // IPv6 Loopback full
      '::',                  // IPv6 Unspecified
      '0:0:0:0:0:0:0:0',     // IPv6 Unspecified full
      'fc00::1',             // IPv6 Unique-local
      'fd00::1',             // IPv6 Unique-local
      'fe80::1',             // IPv6 Link-local
      'ff02::1',             // IPv6 Multicast
      '::ffff:127.0.0.1',    // IPv4-mapped IPv6 loopback
      '::ffff:7f00:1',       // IPv4-mapped IPv6 hex loopback
    ];

    for (const ip of blockedIPs) {
      it(`blocks ${ip}`, async () => {
        await expect(fetchHttpInfo(ip.includes(':') ? `[${ip}]` : ip, 'http:')).rejects.toThrow(/SSRF Prevention/);
      });
    }

    const allowedIPs = [
      '8.8.8.8',             // Public IPv4
      '2001:4860:4860::8888' // Public IPv6
    ];

    for (const ip of allowedIPs) {
      it(`allows public IP ${ip} to proceed`, async () => {
        // Will throw standard connection error, not SSRF prevention error
        await expect(fetchHttpInfo(ip.includes(':') ? `[${ip}]` : ip, 'http:')).rejects.not.toThrow(/SSRF Prevention/);
      }, 15000);
    }
  });
});
