import type { Clock } from '@/lib/clock';
import type { HidReadResult, HidTransport } from '@/lib/hid/client';

export class FakeClock implements Clock {
  private time = 0;

  now(): number {
    return this.time;
  }

  async sleep(ms: number): Promise<void> {
    this.time += ms;
  }
}

export class FakeTransport implements HidTransport {
  readonly sent: Uint8Array[] = [];
  readonly failAt = new Map<number, number>();
  replies: HidReadResult[] = [];

  async send(payload: Uint8Array): Promise<void> {
    const call = this.sent.length + 1;
    this.sent.push(payload.slice());

    const remaining = this.failAt.get(call) ?? 0;
    if (remaining > 0) {
      this.failAt.set(call, remaining - 1);
      throw new Error('feature write refused');
    }
  }

  async read(): Promise<HidReadResult> {
    return this.replies.shift() ?? { ok: false, reason: 'no reply' };
  }
}

export function reply(cmd: number, status: number): HidReadResult {
  const bytes = new Uint8Array(64);
  bytes[0] = 0x04;
  bytes[1] = cmd;
  bytes[3] = status;
  return { ok: true, bytes };
}
