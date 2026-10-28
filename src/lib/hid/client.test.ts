import type { Clock } from '@/lib/clock';
import { describe, expect, it } from 'vitest';
import { HidClient, type HidDeviceLike } from './client';

const blockingClock: Clock = {
  now: () => 0,
  sleep: () => new Promise<void>(() => {}),
};

describe('HidClient', () => {
  it('sends a 64-byte feature report with report id 0', async () => {
    const calls: Array<{ id: number; frame: Uint8Array }> = [];
    const device: HidDeviceLike = {
      async sendFeatureReport(id, data) {
        calls.push({ id, frame: new Uint8Array(data as Uint8Array) });
      },
      async receiveFeatureReport() {
        throw new Error('not used');
      },
    };

    await new HidClient(device, blockingClock).send(Uint8Array.from([0x04, 0x18]));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe(0);
    expect(calls[0]?.frame).toHaveLength(64);
    expect(Array.from(calls[0]?.frame.subarray(0, 2) ?? [])).toEqual([0x04, 0x18]);
  });

  it('returns the mailbox bytes', async () => {
    const bytes = Uint8Array.from([0x04, 0x18, 0x00, 0x01]);
    const device: HidDeviceLike = {
      async sendFeatureReport() {},
      async receiveFeatureReport() {
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      },
    };

    const result = await new HidClient(device, blockingClock).read(100);

    expect(result).toEqual({ ok: true, bytes });
  });

  it('reports a read timeout', async () => {
    const device: HidDeviceLike = {
      async sendFeatureReport() {},
      receiveFeatureReport() {
        return new Promise<DataView>(() => {});
      },
    };
    const immediateClock: Clock = {
      now: () => 0,
      sleep: async () => {},
    };

    const result = await new HidClient(device, immediateClock).read(5);

    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('reports a read error', async () => {
    const device: HidDeviceLike = {
      async sendFeatureReport() {},
      async receiveFeatureReport() {
        throw new Error('device busy');
      },
    };

    const result = await new HidClient(device, blockingClock).read(100);

    expect(result).toEqual({ ok: false, reason: 'device busy' });
  });
});
