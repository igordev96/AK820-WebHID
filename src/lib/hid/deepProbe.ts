import type { Clock } from '@/lib/clock';
import { realClock } from '@/lib/clock';
import { hex } from '@/lib/format';
import type { HidTransport } from './client';
import type { DiagnosticStatus } from './diagnostics';
import type { LogFn } from './transfer';

export type DeepProbeResult = {
  readonly lines: string[];
  readonly verdict: string;
  readonly level: DiagnosticStatus;
};

export type DeepProbeOptions = {
  readonly transport: HidTransport;
  readonly clock?: Clock;
  readonly log?: LogFn;
};

const sameBytes = (a: Uint8Array, b: readonly number[], from: number, to: number) => {
  for (let index = from; index < to; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

export async function runDeepProbe({
  transport,
  clock = realClock,
  log,
}: DeepProbeOptions): Promise<DeepProbeResult> {
  const lines: string[] = [];
  const note = (line: string) => {
    lines.push(line);
    log?.(line, 'dim');
  };

  const frame = async (payload: readonly number[], label: string) => {
    await transport.send(Uint8Array.from(payload));
    await clock.sleep(220);
    const result = await transport.read(800);
    if (!result.ok) {
      log?.(`  ${label}: no reply (${result.reason})`, 'warn');
      return null;
    }
    log?.(`  ${label}: ${hex(result.bytes)}`, 'ok');
    return result.bytes;
  };

  log?.('════ deep probe start ════', 'info');

  log?.('1 · baseline (no write, 6 reads)', 'info');
  const baseline: Array<Uint8Array | null> = [];
  for (let index = 0; index < 6; index += 1) {
    const result = await transport.read(800);
    baseline.push(result.ok ? result.bytes : null);
    await clock.sleep(150);
  }
  const baseUnique = new Set(
    baseline.filter((bytes): bytes is Uint8Array => Boolean(bytes)).map(hex),
  );
  note(
    `distinct frames: ${baseUnique.size}${baseUnique.size === 1 ? ' (stable)' : ' (changes between reads)'}`,
  );
  if (baseUnique.size) note(`sample: ${[...baseUnique][0]}`);

  log?.('2 · echo test', 'info');
  const marker = [0x04, 0x19, 0xde, 0xad, 0xbe, 0xef, 0x11, 0x22, 0x33, 0x44];
  const echo = await frame(marker, 'after 04 19 DE AD BE EF 11 22 33 44');
  let echoVerdict = 'no reply';
  if (echo) {
    if (sameBytes(echo, marker, 2, 10)) echoVerdict = 'ECHO: the payload came back untouched';
    else if (echo[1] === 0x19) echoVerdict = 'device-generated: command mirrored, payload replaced';
    else echoVerdict = 'device-generated: command not mirrored';
  }
  note(`→ ${echoVerdict}`);
  if (echo) note(`bytes 2..9 sent ${hex(marker.slice(2))} / got ${hex(echo.slice(2, 10))}`);

  log?.('3 · command isolation', 'info');
  const iso = await frame([0x04, 0x18], 'after 04 18');
  const iso2 = await frame([0x04, 0x02], 'after 04 02');
  let isoVerdict = 'unknown';
  if (iso && echo) {
    if (iso[1] === 0x18)
      isoVerdict = 'byte[1] follows the last command, so replies are per-command';
    else if (sameBytes(iso, [...echo], 0, 64))
      isoVerdict = 'byte[1] unchanged, so the buffer is stale';
    else isoVerdict = 'differs in other bytes; inspect the log';
  }
  note(`→ ${isoVerdict}`);
  if (iso2) note(`04 02 reply byte[1] = 0x${iso2[1].toString(16).toUpperCase()}`);

  log?.('4 · stream test (04 19 then 32 reads)', 'info');
  await transport.send(Uint8Array.from([0x04, 0x19]));
  const stream: Array<Uint8Array | null> = [];
  for (let index = 0; index < 32; index += 1) {
    const result = await transport.read(600);
    stream.push(result.ok ? result.bytes : null);
    await clock.sleep(90);
  }
  const okStream = stream.filter((bytes): bytes is Uint8Array => Boolean(bytes));
  const unique = new Set(okStream.map(hex));
  note(`replies: ${okStream.length}/32, distinct frames: ${unique.size}`);
  [...unique].slice(0, 8).forEach((frameHex, index) => note(`#${index + 1} ${frameHex}`));
  if (unique.size > 8) note(`${unique.size - 8} more`);
  const byte3 = new Set(okStream.map((bytes) => bytes[3]));
  note(
    `byte[3] values seen: ${[...byte3]
      .map((value) => `0x${value.toString(16).toUpperCase()}`)
      .join(', ')} (${byte3.size} distinct)`,
  );

  let verdict: string;
  if (echoVerdict.startsWith('ECHO')) {
    verdict =
      'Write-through buffer only: what we read back is our own last frame. There is no read channel, so the driver must keep its own configuration copy.';
  } else if (echoVerdict.startsWith('device-generated') && unique.size > 1) {
    verdict =
      'The reply mirrors the command and stamps a result byte at index 3. There is no state read-back, but the mailbox is a reliable acknowledgement channel.';
  } else if (echoVerdict.startsWith('device-generated')) {
    verdict =
      'The device answers with one constant frame. Reads confirm delivery but carry no data, so the driver keeps its own copy.';
  } else {
    verdict = 'No usable reply. Treat the device as write-only, like the desktop app does.';
  }

  note(`VERDICT: ${verdict}`);
  log?.('════ deep probe done ════', 'info');

  return { lines, verdict, level: 'warn' };
}
