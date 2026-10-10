import * as dns from 'dns/promises';
import * as net from 'net';

/**
 * Validates that an IP address is a public address and not an internal/private/loopback/metadata IP.
 */
export function isInternalIP(ip: string): boolean {
  // Normalize IPv6 to lower case and expand if necessary for basic checks
  const lowerIp = ip.toLowerCase();

  // IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (lowerIp.startsWith('::ffff:')) {
    const v4Part = lowerIp.substring(7);
    if (net.isIPv4(v4Part)) {
      ip = v4Part; // Let the IPv4 block handle it
    } else {
      // Hex representation like ::ffff:7f00:1
      return true; // Safer to block all tricky mapped ones
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
    
    // Multicast: 224.0.0.0/4
    if (parts[0]! >= 224 && parts[0]! <= 239) return true;
  } else if (net.isIPv6(ip)) {
    // Unspecified address (::)
    if (lowerIp === '::' || lowerIp === '0:0:0:0:0:0:0:0') return true;

    // Loopback (::1, 0:0:0:0:0:0:0:1)
    if (lowerIp === '::1' || lowerIp === '0:0:0:0:0:0:0:1' || /^0(:0){6}:1$/.test(lowerIp) || lowerIp === '::0:1') return true;
    
    // Unique-local (fc00::/7) -> fc or fd
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
    
    // Link-local (fe80::/10) -> fe8, fe9, fea, feb
    if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return true;
    
    // Multicast (ff00::/8) -> ff
    if (lowerIp.startsWith('ff')) return true;

    // Block any remaining IPv4-mapped forms just in case
    if (lowerIp.startsWith('::ffff:')) return true;
    
    // Discard prefix (IPv4 translated/mapped) 64:ff9b::/96
    if (lowerIp.startsWith('64:ff9b::')) return true;
  }

  return false;
}

export async function validateTargetDomain(domain: string): Promise<string[]> {
  // Strip IPv6 brackets if present
  if (domain.startsWith('[') && domain.endsWith(']')) {
    domain = domain.slice(1, -1);
  }

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
