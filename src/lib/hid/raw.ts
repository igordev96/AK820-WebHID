import type { Clock } from '@/lib/clock';
import { realClock } from '@/lib/clock';
import { hex } from '@/lib/format';
import type { HidTransport } from './client';
import { CHUNK_SIZE } from './protocol';
import type { LogFn } from './transfer';

export function parseHex(input: string): Uint8Array {
  const clean = input.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (!clean.length) throw new Error('nothing to send');
  if (clean.length % 2) throw new Error('odd number of hex digits');

  const bytes = new Uint8Array(clean.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export async function sendRawCommand(
  transport: HidTransport,
  payload: Uint8Array,
): Promise<number> {
  if (!payload.length) throw new Error('nothing to send');
  if (payload.length <= CHUNK_SIZE) {
    await transport.send(payload);
    return 1;
  }

  const chunks = payload.length >> 6;
  for (let index = 0; index < chunks; index += 1) {
    await transport.send(payload.subarray(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE));
  }
  return chunks;
}

export type ListenOptions = {
  readonly transport: HidTransport;
  readonly clock?: Clock;
  readonly log?: LogFn;
  readonly count?: number;
};

export async function listenReplies({
  transport,
  clock = realClock,
  log,
  count = 3,
}: ListenOptions): Promise<string[]> {
  const lines: string[] = [];

  for (let index = 0; index < count; index += 1) {
    await clock.sleep(350);
    const result = await transport.read(600);
    const line = result.ok
      ? `FEATURE read: ${hex(result.bytes)}`
      : `feature read: ${result.reason}`;
    lines.push(line);
    log?.(line, result.ok ? 'ok' : 'dim');
  }

  return lines;
}
