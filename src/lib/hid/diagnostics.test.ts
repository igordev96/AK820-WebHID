import { FakeClock, FakeTransport, reply } from '@/test/hidFakes';
import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnostics';

const device = {
  vendorId: 0x0c45,
  productId: 0x8009,
  collections: [
    {
      usagePage: 0xff13,
      usage: 0x0001,
      featureReports: [{ reportId: 0, items: [{}, {}] }],
      outputReports: [{ reportId: 0, items: [{}] }],
    },
  ],
};

describe('diagnose', () => {
  it('passes when the config interface and mailbox answer', async () => {
    const transport = new FakeTransport();
    transport.replies = [reply(0x19, 0x01), reply(0xf5, 0x01)];
    const result = await diagnose({
      device,
      transport,
      clock: new FakeClock(),
      secureContext: true,
    });

    expect(result.level).toBe('ok');
    expect(result.steps.map((step) => step.name)).toContain('feature write (04 18 init)');
    expect(result.steps.find((step) => step.name === 'feature read-back')?.status).toBe('ok');
    expect(result.steps.find((step) => step.name === 'feature reports')?.detail).toBe('0:2');
  });

  it('fails when the write is refused', async () => {
    const transport = new FakeTransport();
    transport.failAt.set(1, 1);
    const result = await diagnose({
      device,
      transport,
      clock: new FakeClock(),
      secureContext: true,
    });

    expect(result.level).toBe('err');
    expect(result.steps.find((step) => step.name === 'feature write (04 18 init)')?.status).toBe(
      'err',
    );
  });

  it('warns when writes work but reads do not answer', async () => {
    const transport = new FakeTransport();
    const result = await diagnose({
      device,
      transport,
      clock: new FakeClock(),
      secureContext: true,
    });

    expect(result.level).toBe('warn');
    expect(result.steps.find((step) => step.name === 'feature read-back')?.status).toBe('warn');
  });

  it('reports a missing config collection', async () => {
    const transport = new FakeTransport();
    const result = await diagnose({
      device: { ...device, collections: [] },
      transport,
      clock: new FakeClock(),
      secureContext: true,
    });

    expect(result.steps.find((step) => step.name.startsWith('config interface'))?.status).toBe(
      'err',
    );
  });
});
