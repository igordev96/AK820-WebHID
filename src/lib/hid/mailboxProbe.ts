import type { Clock } from '@/lib/clock';
import { realClock } from '@/lib/clock';
import { hex } from '@/lib/format';
import type { HidTransport } from './client';
import type { LogFn } from './transfer';

export type MailboxProbeResult = {
  readonly lines: string[];
  readonly conclusions: string[];
};

export type MailboxProbeOptions = {
  readonly transport: HidTransport;
  readonly clock?: Clock;
  readonly log?: LogFn;
};

const sameExcept = (a: Uint8Array, b: Uint8Array, skip: number) => {
  for (let index = 0; index < 64; index += 1) {
    if (index === skip) continue;
    if (a[index] !== b[index]) return false;
  }
  return true;
};

export async function runMailboxProbe({
  transport,
  clock = realClock,
  log,
}: MailboxProbeOptions): Promise<MailboxProbeResult> {
  const lines: string[] = [];
  const conclusions: string[] = [];

  const run = async (label: string, payload: readonly number[]) => {
    try {
      await transport.send(Uint8Array.from(payload));
    } catch (error) {
      lines.push(`${label}: send error ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }

    await clock.sleep(200);
    const result = await transport.read(800);

    if (!result.ok) {
      lines.push(`${label}: no reply (${result.reason})`);
      return null;
    }

    lines.push(`${label}: sent ${hex(payload)} -> ${hex(result.bytes)}`);
    log?.(`${label}\n   sent  ${hex(payload)}\n   reply ${hex(result.bytes)}`, 'info');
    return result.bytes;
  };

  log?.('════ mailbox test start ════', 'info');

  const unknown: Array<[string, number[]]> = [
    ['unknown opcode 0xEE', [0x04, 0xee]],
    ['unknown opcode 0x7F', [0x04, 0x7f]],
    ['unknown opcode 0xBE', [0x04, 0xbe]],
  ];
  const unknownReplies: Array<Uint8Array | null> = [];
  for (const [label, payload] of unknown) unknownReplies.push(await run(label, payload));

  const b1 = await run('write byte[3] = 0xDE', [0x04, 0x19, 0x00, 0xde]);
  const b2 = await run('write byte[3] = 0x07', [0x04, 0x19, 0x00, 0x07]);

  await run('byte[2] = 0x40', [0x04, 0x19, 0x00, 0x00, 0x40]);
  await run('byte[2] = 0x01', [0x04, 0x19, 0x01]);
  await run('trailing 0x40', [0x04, 0x19, 0x00, 0x00, 0x00, 0x40]);

  const commitAlone = await run('commit alone', [0x04, 0x02]);
  await run('init', [0x04, 0x18]);
  const commitAfterInit = await run('commit after init', [0x04, 0x02]);

  await transport.send(Uint8Array.from([0x04, 0x19]));
  await clock.sleep(200);
  const c1 = await transport.read(800);
  const c2 = await transport.read(800);
  const consumed = c1.ok && c2.ok && hex(c1.bytes) !== hex(c2.bytes);
  lines.push(
    `consumption: read1=${c1.ok ? hex(c1.bytes) : 'fail'} read2=${
      c2.ok ? hex(c2.bytes) : 'fail'
    } -> ${consumed ? 'one-shot reply' : 'reply persists across reads'}`,
  );

  const unknownAllOk = unknownReplies
    .filter((bytes): bytes is Uint8Array => Boolean(bytes))
    .every((bytes) => bytes[3] === 0x01);
  const unknownAnyErr = unknownReplies
    .filter((bytes): bytes is Uint8Array => Boolean(bytes))
    .some((bytes) => bytes[3] === 0xff);

  if (unknownAnyErr) {
    conclusions.push(
      'The device rejects unknown opcodes with 0xFF, so byte[3] is a real result code.',
    );
  } else if (unknownAllOk) {
    conclusions.push(
      'Unknown opcodes also get 0x01, so the reply is a blind latch rather than command validation.',
    );
  }

  if (b1 && b1[3] !== 0xde && b1[3] !== 0x07) {
    conclusions.push(
      `byte[3] is overwritten by the firmware: writing 0xDE and 0x07 both returned 0x${b1[3]
        .toString(16)
        .toUpperCase()}.`,
    );
  } else if (b1) {
    conclusions.push('byte[3] came back as written, so the frame is a pure echo.');
  }

  if (b1 && b2 && !sameExcept(b1, b2, 3)) {
    conclusions.push('Other bytes vary between replies; inspect the log.');
  }

  if (commitAlone && commitAfterInit) {
    if (commitAlone[3] === 0xff && commitAfterInit[3] === 0x01) {
      conclusions.push(
        'Commit alone is 0xFF and commit after init is 0x01, so the status codes are error and success.',
      );
    } else if (commitAlone[3] === commitAfterInit[3]) {
      conclusions.push(
        'Commit returns the same status in both cases; these reads can show the previous command reply.',
      );
    }
  }

  if (consumed) conclusions.push('Each reply is delivered once and cleared by reading it.');

  conclusions.forEach((conclusion) => log?.(`  ⇒ ${conclusion}`, 'ok'));
  log?.('════ mailbox test done ════', 'info');

  return { lines, conclusions };
}
