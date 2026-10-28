import { FakeClock, FakeTransport } from '@/test/hidFakes';
import { describe, expect, it } from 'vitest';
import { runDeepProbe } from './deepProbe';

const marker = Uint8Array.from([0x04, 0x19, 0xde, 0xad, 0xbe, 0xef, 0x11, 0x22, 0x33, 0x44]);

describe('runDeepProbe', () => {
  it('detects a pure echo and returns a verdict', async () => {
    const transport = {
      async send() {},
      async read() {
        return { ok: true as const, bytes: marker };
      },
    };

    const result = await runDeepProbe({ transport, clock: new FakeClock() });

    expect(result.level).toBe('warn');
    expect(result.lines.some((line) => line.includes('ECHO'))).toBe(true);
    expect(result.verdict).toContain('Write-through buffer');
  });

  it('handles a silent device without hanging', async () => {
    const transport = new FakeTransport();
    const result = await runDeepProbe({ transport, clock: new FakeClock() });

    expect(result.level).toBe('warn');
    expect(result.verdict).toContain('No usable reply');
  });
});
