import { FakeClock, FakeTransport, reply } from '@/test/hidFakes';
import { describe, expect, it } from 'vitest';
import { listenReplies, parseHex, sendRawCommand } from './raw';

describe('parseHex', () => {
  it('parses spaced and prefixed hex', () => {
    expect(Array.from(parseHex('04 18'))).toEqual([0x04, 0x18]);
    expect(Array.from(parseHex('0x04 0x18'))).toEqual([0x04, 0x18]);
  });

  it('rejects empty and odd input', () => {
    expect(() => parseHex('')).toThrow('nothing to send');
    expect(() => parseHex('0x4')).toThrow('odd number');
  });
});

describe('sendRawCommand', () => {
  it('sends one report for a short payload', async () => {
    const transport = new FakeTransport();
    const count = await sendRawCommand(transport, Uint8Array.from([0x04, 0x18]));

    expect(count).toBe(1);
    expect(transport.sent).toHaveLength(1);
  });

  it('splits a long payload into 64-byte chunks', async () => {
    const transport = new FakeTransport();
    const count = await sendRawCommand(transport, new Uint8Array(128).fill(0xaa));

    expect(count).toBe(2);
    expect(transport.sent).toHaveLength(2);
    expect(transport.sent.every((chunk) => chunk.length === 64)).toBe(true);
  });
});

describe('listenReplies', () => {
  it('reads the requested number of replies', async () => {
    const transport = new FakeTransport();
    transport.replies = [reply(0x19, 0x01), reply(0x19, 0x01), reply(0x19, 0x01)];
    const clock = new FakeClock();
    const lines = await listenReplies({ transport, clock, count: 3 });

    expect(lines).toHaveLength(3);
    expect(transport.replies).toHaveLength(0);
  });
});
