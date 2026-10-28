import { MAX_KEY_INDEX } from './constants';
import type { MapEntry } from './types';

export function parseMapText(text: string): MapEntry[] {
  const entries: MapEntry[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const idx = Number.parseInt(parts[0] ?? '', 10);

    // Consumer usages always carry a c: prefix. Without it the value is a keyboard usage:
    // 0xE2 is Left Alt, and 0xCD/0xB5 are below 0xE7 but are reserved keyboard usages.
    const media = /^c:/i.test(parts[1] ?? '');
    const token = media ? (parts[1] ?? '').slice(2) : (parts[1] ?? '');
    const usage = Number.parseInt(token.replace(/^0x/i, ''), /^0x/i.test(token) ? 16 : 10);

    if (!Number.isFinite(idx) || !Number.isFinite(usage)) continue;
    if (idx < 0 || idx > MAX_KEY_INDEX) continue;
    if (media ? usage < 1 || usage > 0xffff : usage < 0 || usage > 0xff) continue;

    entries.push({ idx, usage, media, name: parts.slice(2).join(' ') });
  }

  return entries;
}
