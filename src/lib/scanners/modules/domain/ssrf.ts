import * as dns from 'dns/promises';
import * as net from 'net';

/**
 * Validates that an IP address is a public address and not an internal/private/loopback/metadata IP.
 */
export function isInternalIP(ip: string): boolean {
  // Extract IPv4 from IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith('::ffff:')) {
    const v4Part = ip.substring(7);
    if (net.isIPv4(v4Part)) {
      ip = v4Part;
    } else {
      // Hex representation like ::ffff:7f00:1
      return true; // We can just block tricky mapped ones for safety or decode them, safer to just block if not standard mapped
    }
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    
    // Loopback: 127.0.0.0/8
    if (parts[0] === 127) return true;
    
    // Private: 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // Private: 172.16.0.0/12
    if (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) return true;
    
    // Private: 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // Metadata / Link-local: 169.254.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true;
    
    // Carrier-grade NAT: 100.64.0.0/10
    if (parts[0] === 100 && parts[1]! >= 64 && parts[1]! <= 127) return true;
    
    // Broadcast: 255.255.255.255
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

    // IPv4 current network: 0.0.0.0/8
    if (parts[0] === 0) return true;
  } else if (net.isIPv6(ip)) {
    // Simplistic IPv6 SSRF block for loopback/link-local/unique-local
    const lowerIp = ip.toLowerCase();
    if (lowerIp === '::1' || lowerIp.startsWith('fc') || lowerIp.startsWith('fd') || lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) {
      return true;
    }
    // Block IPv4-mapped IPv6 prefix if not already caught
    if (lowerIp.startsWith('::ffff:')) return true;
  }

  return false;
}

export async function validateTargetDomain(domain: string): Promise<string[]> {
  try {
    let addresses: string[] = [];
    
    // If it's already an IP, don't try to resolve it via DNS
    if (net.isIP(domain)) {
      addresses = [domain];
    } else {
      addresses = await dns.resolve4(domain);
      if (addresses.length === 0) {
        throw new Error(`SSRF Prevention: Could not resolve A records for ${domain}`);
      }
    }

    for (const ip of addresses) {
      if (isInternalIP(ip)) {
        throw new Error(`SSRF Prevention: IP ${ip} for domain ${domain} is blocked as an internal address`);
      }
    }
    
    return addresses;
  } catch (error) {
    if (error instanceof Error && error.message.includes('SSRF Prevention')) {
      throw error;
    }
    // If ENOTFOUND, maybe it's just IPv6 or it really doesn't exist
    let ipv6Addresses: string[] = [];
    if (!net.isIP(domain)) {
      ipv6Addresses = await dns.resolve6(domain).catch(() => []);
    }
    
    for (const ip of ipv6Addresses) {
      if (isInternalIP(ip)) {
        throw new Error(`SSRF Prevention: IPv6 ${ip} for domain ${domain} is blocked as an internal address`);
      }
    }

    if (ipv6Addresses.length > 0) {
      return ipv6Addresses;
    }

    throw new Error(`Could not resolve domain ${domain}`);
  }
}
