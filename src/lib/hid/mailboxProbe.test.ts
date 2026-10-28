import { FakeClock, FakeTransport } from '@/test/hidFakes';
import { describe, expect, it } from 'vitest';
import { runMailboxProbe } from './mailboxProbe';

describe('runMailboxProbe', () => {
  it('returns lines and conclusions for a silent device', async () => {
    const transport = new FakeTransport();
    const result = await runMailboxProbe({ transport, clock: new FakeClock() });

    expect(result.lines.length).toBeGreaterThan(0);
    expect(Array.isArray(result.conclusions)).toBe(true);
    expect(result.lines.some((line) => line.includes('commit alone'))).toBe(true);
  });
});
