import * as https from 'https';
import * as http from 'http';
import { validateTargetDomain } from './ssrf';
import { TLSSocket } from 'tls';

export interface HttpFetchResult {
  headers: Record<string, string>;
  cert?: any;
  status: number;
}

export async function fetchHttpInfo(domain: string, protocol: 'https:' | 'http:' = 'https:', redirectCount = 0): Promise<HttpFetchResult> {
  if (redirectCount > 5) {
    throw new Error('Too many redirects');
  }

  // Parse hostname from domain (in case it includes path or port from previous redirect)
  const urlObj = new URL(`${protocol}//${domain}`);
  const hostname = urlObj.hostname;

  // SSRF Protection on the resolved hostname
  await validateTargetDomain(hostname);

  return new Promise((resolve, reject) => {
    const client = protocol === 'https:' ? https : http;
    const reqOptions = {
      method: 'HEAD',
      timeout: 5000,
      rejectUnauthorized: false // We evaluate the cert manually
    };

    const req = client.request(urlObj, reqOptions, async (res) => {
      const statusCode = res.statusCode || 0;
      
      // Handle redirects
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        try {
          // Resolve relative redirects
          const nextUrl = new URL(res.headers.location, urlObj.href);
          if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
            throw new Error(`Unsupported redirect protocol: ${nextUrl.protocol}`);
          }
          
          const redirectResult = await fetchHttpInfo(
            nextUrl.host + nextUrl.pathname + nextUrl.search, 
            nextUrl.protocol as 'http:' | 'https:', 
            redirectCount + 1
          );
          resolve(redirectResult);
        } catch (err) {
          reject(err);
        }
        return;
      }

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          headers[key.toLowerCase()] = value.join(', ');
        }
      }
      
      let cert;
      if (protocol === 'https:') {
        const socket = res.socket as TLSSocket;
        if (socket && typeof socket.getPeerCertificate === 'function') {
          cert = socket.getPeerCertificate(true);
        }
      }
      
      resolve({
        headers,
        cert,
        status: statusCode
      });
    });
    
    req.on('error', (err) => {
      // If initial HTTPS request fails, try HTTP fallback, but only on the first attempt
      if (protocol === 'https:' && redirectCount === 0) {
        fetchHttpInfo(domain, 'http:', 0).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}
