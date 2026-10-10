import * as https from 'https';
import * as http from 'http';
import * as dns from 'dns';
import { isInternalIP, validateTargetDomain } from './ssrf';
import { TLSSocket } from 'tls';

export interface HttpFetchResult {
  headers: Record<string, string>;
  cert?: any;
  status: number;
}

const MAX_REDIRECTS = 3;
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const ABSOLUTE_TIMEOUT_MS = 10000; // 10 seconds

export async function fetchHttpInfo(domain: string, protocol: 'https:' | 'http:' = 'https:', redirectCount = 0): Promise<HttpFetchResult> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error('Too many redirects');
  }

  // Parse hostname from domain (in case it includes path or port from previous redirect)
  const urlObj = new URL(`${protocol}//${domain}`);

  // SSRF Protection: catch direct IP inputs quickly and validate initial host
  await validateTargetDomain(urlObj.hostname);

  return new Promise((resolve, reject) => {
    const ac = new AbortController();
    const timeoutId = setTimeout(() => {
      ac.abort(new Error('Absolute timeout reached'));
    }, ABSOLUTE_TIMEOUT_MS);

    const client = protocol === 'https:' ? https : http;
    const reqOptions = {
      method: 'HEAD',
      timeout: 5000,
      rejectUnauthorized: false, // We evaluate the cert manually
      signal: ac.signal,
      lookup: (
        lookupHostname: string,
        options: dns.LookupOptions,
        callback: any
      ) => {
        // Resolve and validate to prevent DNS rebinding TOCTOU
        dns.lookup(lookupHostname, options, (err, address, family) => {
          if (err) return callback(err, address, family);
          
          if (Array.isArray(address)) {
            for (const addr of address) {
              if (isInternalIP(addr.address)) {
                return callback(new Error(`SSRF Prevention: IP ${addr.address} for domain ${lookupHostname} is blocked`), address, family);
              }
            }
            callback(null, address, family);
          } else {
            if (!address) {
              return callback(new Error(`DNS lookup failed for ${lookupHostname}`), address, family);
            }
            if (isInternalIP(address as string)) {
              return callback(new Error(`SSRF Prevention: IP ${address} for domain ${lookupHostname} is blocked`), address, family);
            }
            callback(null, address, family);
          }
        });
      }
    };

    const req = client.request(urlObj, reqOptions, async (res) => {
      const statusCode = res.statusCode || 0;

      // Ensure we consume the body to free up memory/socket, and enforce size limits
      let bodySize = 0;
      res.on('data', (chunk) => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          res.destroy();
          clearTimeout(timeoutId);
          reject(new Error('Response body exceeded maximum size limit'));
        }
      });

      res.on('end', () => {
        // Stream fully consumed
      });

      // Handle redirects
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        try {
          clearTimeout(timeoutId);
          res.destroy(); // Important: close the socket for the redirect
          
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
      
      clearTimeout(timeoutId);
      resolve({
        headers,
        cert,
        status: statusCode
      });
    });
    
    req.on('error', (err: any) => {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return reject(new Error('Absolute timeout reached'));
      }
      // If initial HTTPS request fails, try HTTP fallback, but only on the first attempt
      if (protocol === 'https:' && redirectCount === 0) {
        fetchHttpInfo(domain, 'http:', 0).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      clearTimeout(timeoutId);
      reject(new Error('Socket inactivity timeout'));
    });
    
    req.end();
  });
}
