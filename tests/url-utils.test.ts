import { describe, it, expect } from 'vitest';
import {
  extractHostname,
  normalizeDomain,
  isDomainWhitelisted,
  hashDomainToId,
} from '../src/common/url-utils';

describe('url-utils', () => {
  describe('extractHostname', () => {
    it('extracts and normalizes hostname from standard URLs', () => {
      expect(extractHostname('https://www.google.com/search?q=test')).toBe('google.com');
      expect(extractHostname('http://sub.domain.edu.vn/path')).toBe('sub.domain.edu.vn');
      expect(extractHostname('https://example.com:8080/')).toBe('example.com');
    });

    it('returns null for browser internal pages', () => {
      expect(extractHostname('chrome://extensions')).toBeNull();
      expect(extractHostname('chrome-extension://abcdefg/popup.html')).toBeNull();
      expect(extractHostname('edge://settings')).toBeNull();
      expect(extractHostname('about:blank')).toBeNull();
      expect(extractHostname('devtools://devtools/bundled/')).toBeNull();
      expect(extractHostname('view-source:https://example.com')).toBeNull();
    });

    it('returns null for invalid or empty URLs', () => {
      expect(extractHostname('')).toBeNull();
      expect(extractHostname('javascript:void(0)')).toBeNull();
      expect(extractHostname(null as unknown as string)).toBeNull();
    });

    it('handles domain strings without protocol', () => {
      expect(extractHostname('wikipedia.org')).toBe('wikipedia.org');
      expect(extractHostname('www.wikipedia.org/wiki/Main_Page')).toBe('wikipedia.org');
    });
  });

  describe('normalizeDomain', () => {
    it('strips leading www.', () => {
      expect(normalizeDomain('www.example.com')).toBe('example.com');
      expect(normalizeDomain('WWW.EXAMPLE.COM')).toBe('example.com');
    });

    it('strips ports and trailing dots', () => {
      expect(normalizeDomain('example.com:3000')).toBe('example.com');
      expect(normalizeDomain('example.com.')).toBe('example.com');
      expect(normalizeDomain('www.example.com.:8080')).toBe('example.com');
    });

    it('handles empty inputs', () => {
      expect(normalizeDomain('')).toBe('');
    });
  });

  describe('isDomainWhitelisted', () => {
    const whitelist = ['example.com', 'edu.vn', 'khanacademy.org'];

    it('matches exact domains', () => {
      expect(isDomainWhitelisted('example.com', whitelist)).toBe(true);
      expect(isDomainWhitelisted('www.example.com', whitelist)).toBe(true);
      expect(isDomainWhitelisted('khanacademy.org', whitelist)).toBe(true);
    });

    it('matches subdomains', () => {
      expect(isDomainWhitelisted('app.example.com', whitelist)).toBe(true);
      expect(isDomainWhitelisted('portal.edu.vn', whitelist)).toBe(true);
    });

    it('does not match unrelated domains with similar substrings', () => {
      expect(isDomainWhitelisted('notexample.com', whitelist)).toBe(false);
      expect(isDomainWhitelisted('myedu.vn.attacker.com', whitelist)).toBe(false);
    });

    it('returns false when whitelist is empty or target is empty', () => {
      expect(isDomainWhitelisted('example.com', [])).toBe(false);
      expect(isDomainWhitelisted('', whitelist)).toBe(false);
    });
  });

  describe('hashDomainToId', () => {
    it('generates consistent deterministic numeric IDs', () => {
      const id1 = hashDomainToId('example.com');
      const id2 = hashDomainToId('example.com');
      const id3 = hashDomainToId('google.com');

      expect(id1).toBe(id2);
      expect(typeof id1).toBe('number');
      expect(id1).toBeGreaterThan(0);
      expect(id1).not.toBe(id3);
    });
  });
});
