/**
 * Utilities for URL parsing and domain normalization
 */

/**
 * Extracts a normalized hostname from a URL string.
 * Returns null if the URL is invalid or is an internal browser page.
 */
export function extractHostname(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('chrome://') ||
    trimmed.startsWith('chrome-extension://') ||
    trimmed.startsWith('edge://') ||
    trimmed.startsWith('about:') ||
    trimmed.startsWith('devtools://') ||
    trimmed.startsWith('view-source:')
  ) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return normalizeDomain(parsed.hostname);
  } catch {
    // If not a full URL, attempt prepending https://
    try {
      const parsed = new URL(`https://${trimmed}`);
      return normalizeDomain(parsed.hostname);
    } catch {
      return null;
    }
  }
}

/**
 * Normalizes a domain by lowercasing, stripping leading www., trailing dots and ports.
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  let cleaned = domain.trim().toLowerCase();

  // If protocol is present, parse URL directly to get clean hostname
  if (cleaned.includes('://')) {
    try {
      const parsed = new URL(cleaned);
      cleaned = parsed.hostname;
    } catch {
      // Continue with string parsing fallback
    }
  }

  // Strip path if present (e.g. domain.com/path or domain.com/)
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) {
    cleaned = cleaned.substring(0, slashIndex);
  }

  // Strip port if present
  const colonIndex = cleaned.indexOf(':');
  if (colonIndex !== -1) {
    cleaned = cleaned.substring(0, colonIndex);
  }

  // Strip trailing dot
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  // Strip leading www.
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.substring(4);
  }

  return cleaned;
}

/**
 * Checks whether a given hostname matches any domain in the whitelist.
 * Matches exact domain or subdomains (e.g. "api.example.com" matches "example.com").
 */
export function isDomainWhitelisted(
  hostname: string,
  whitelistedDomains: string[]
): boolean {
  if (!hostname || !whitelistedDomains || whitelistedDomains.length === 0) {
    return false;
  }

  const normalizedTarget = normalizeDomain(hostname);
  if (!normalizedTarget) return false;

  for (const entry of whitelistedDomains) {
    const normalizedEntry = normalizeDomain(entry);
    if (!normalizedEntry) continue;

    if (
      normalizedTarget === normalizedEntry ||
      normalizedTarget.endsWith(`.${normalizedEntry}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a stable numeric 32-bit positive integer hash for a domain name.
 * Used to map domain names to dynamic rule IDs deterministically.
 */
export function hashDomainToId(domain: string, baseOffset = 200000): number {
  const normalized = normalizeDomain(domain);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Keep positive and within reasonable Chrome DNR rule id limit (1 to 2^31 - 1)
  const positive = Math.abs(hash) % 500000;
  return baseOffset + positive;
}
