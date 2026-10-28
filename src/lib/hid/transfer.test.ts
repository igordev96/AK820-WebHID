import { FACTORY_KEYS, buildTable } from '@/lib/keymap';
import type { HidReadResult } from '@/lib/hid/client';
import { FakeClock, FakeTransport, reply } from '@/test/hidFakes';
import { describe, expect, it } from 'vitest';
import { TransferService, isTransportFailed } from './transfer';

const table = buildTable(FACTORY_KEYS);

const topReplies = (): HidReadResult[] => [
  reply(0x18, 0x01),
  reply(0x11, 0x01),
  reply(0x02, 0x01),
  reply(0xf0, 0x01),
];

const makeService = (replies: HidReadResult[] = []) => {
  const transport = new FakeTransport();
  transport.replies = replies;
  const clock = new FakeClock();
  const lines: string[] = [];
  const service = new TransferService(transport, clock, (message, level) => {
    lines.push(`${level ?? 'log'}: ${message}`);
  });
  return { service, transport, clock, lines };
};

const bytes = (value: Uint8Array) => Array.from(value);

describe('TransferService', () => {
  it('sends the full top-layer sequence', async () => {
    const { service, transport, lines } = makeService(topReplies());

    const result = await service.sendTable(table, 'top');

    expect(result.busy).toBeUndefined();
    expect(result.steps.map((step) => step.step)).toEqual(['begin', 'announce', 'commit', 'end']);
    expect(isTransportFailed(result.steps)).toBe(false);
    expect(transport.sent).toHaveLength(13);

    expect(bytes(transport.sent[0] ?? new Uint8Array())).toEqual([0x04, 0x18]);

    const announce = transport.sent[1] ?? new Uint8Array();
    expect(announce).toHaveLength(64);
    expect(bytes(announce.subarray(0, 2))).toEqual([0x04, 0x11]);
    expect(announce[8]).toBe(9);

    for (let index = 0; index < 9; index += 1) {
      expect(bytes(transport.sent[2 + index] ?? new Uint8Array())).toEqual(
        bytes(table.subarray(index * 64, (index + 1) * 64)),
      );
    }

    expect(bytes(transport.sent[11] ?? new Uint8Array())).toEqual([0x04, 0x02]);
    expect(bytes(transport.sent[12] ?? new Uint8Array())).toEqual([0x04, 0xf0]);
    expect(lines.some((line) => line.includes('begin 04 18: status 0x01 OK'))).toBe(true);
  });

  it('uses the Fn announce byte', async () => {
    const { service, transport } = makeService([
      reply(0x18, 0x01),
      reply(0x27, 0x01),
      reply(0x02, 0x01),
      reply(0xf0, 0x01),
    ]);

    await service.sendTable(table, 'fn');

    expect((transport.sent[1] ?? new Uint8Array())[1]).toBe(0x27);
  });

  it('aborts before staging when begin is refused', async () => {
    const { service, transport } = makeService([reply(0x18, 0xff)]);

    const result = await service.sendTable(table, 'top');

    expect(result.steps.map((step) => step.step)).toEqual(['begin', 'aborted']);
    expect(isTransportFailed(result.steps)).toBe(true);
    expect(transport.sent).toHaveLength(2);
    expect(bytes(transport.sent[0] ?? new Uint8Array())).toEqual([0x04, 0x18]);
    expect(bytes(transport.sent[1] ?? new Uint8Array())).toEqual([0x04, 0xf0]);
  });

  it('aborts before staging when the announce is refused', async () => {
    const { service, transport } = makeService([reply(0x18, 0x01), reply(0x11, 0xff)]);

    const result = await service.sendTable(table, 'top');

    expect(result.steps.map((step) => step.step)).toEqual(['begin', 'announce', 'aborted']);
    expect(isTransportFailed(result.steps)).toBe(true);
    expect(transport.sent).toHaveLength(3);
    expect(bytes(transport.sent[2] ?? new Uint8Array())).toEqual([0x04, 0xf0]);
  });

  it('retries a refused chunk once', async () => {
    const { service, transport, lines } = makeService(topReplies());
    transport.failAt.set(3, 1);

    const result = await service.sendTable(table, 'top');

    expect(isTransportFailed(result.steps)).toBe(false);
    expect(transport.sent).toHaveLength(14);
    expect(lines.some((line) => line.includes('(attempt 2)'))).toBe(true);
  });

  it('stops after four refused attempts on one chunk', async () => {
    const { service, transport } = makeService([reply(0x18, 0x01), reply(0x11, 0x01)]);
    for (const call of [3, 4, 5, 6]) transport.failAt.set(call, 1);

    const result = await service.sendTable(table, 'top');

    expect(result.steps.map((step) => step.step)).toEqual(['begin', 'announce', 'chunks']);
    expect(isTransportFailed(result.steps)).toBe(true);
    expect(transport.sent).toHaveLength(7);
    expect(transport.sent.some((payload) => payload.length === 2 && payload[1] === 0x02)).toBe(
      false,
    );
  });

  it('sends the end command even when the commit is rejected', async () => {
    const { service, transport } = makeService([
      reply(0x18, 0x01),
      reply(0x11, 0x01),
      reply(0x02, 0xff),
      reply(0xf0, 0x01),
    ]);

    const result = await service.sendTable(table, 'top');

    expect(result.steps.at(-1)?.step).toBe('end');
    expect(isTransportFailed(result.steps)).toBe(false);
    expect(bytes(transport.sent.at(-1) ?? new Uint8Array())).toEqual([0x04, 0xf0]);
  });

  it('refuses a second transfer while one is running', async () => {
    const { service, transport } = makeService(topReplies());

    const first = service.sendTable(table, 'top');
    const second = await service.sendTable(table, 'top');
    await first;

    expect(second).toEqual({ steps: [], busy: true });
    expect(transport.sent).toHaveLength(13);
    expect(service.isBusy).toBe(false);
  });

  it('gives up when begin never answers', async () => {
    const { service, clock } = makeService([]);

    const result = await service.sendTable(table, 'top');

    expect(result.steps[0]?.reply.status).toBeNull();
    expect(result.steps.at(-1)?.step).toBe('aborted');
    expect(clock.now()).toBeGreaterThan(6000);
  });

  it('rejects a table that is not 576 bytes', async () => {
    const { service } = makeService();

    await expect(service.sendTable(new Uint8Array(575), 'top')).rejects.toThrow('576');
  });
});
