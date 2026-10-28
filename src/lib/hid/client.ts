import type { Clock } from '@/lib/clock';
import { realClock } from '@/lib/clock';
import { padFrame, REPORT_ID } from './protocol';

export type HidDeviceLike = {
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
};

export type HidReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly reason: string };

export type HidTransport = {
  send(payload: Uint8Array): Promise<void>;
  read(timeoutMs: number): Promise<HidReadResult>;
};

export class HidClient implements HidTransport {
  constructor(
    private readonly device: HidDeviceLike,
    private readonly clock: Clock = realClock,
  ) {}

  async send(payload: Uint8Array): Promise<void> {
    await this.device.sendFeatureReport(REPORT_ID, padFrame(payload));
  }

  async read(timeoutMs: number): Promise<HidReadResult> {
    const timeout = Symbol('timeout');

    try {
      const result = await Promise.race([
        this.device.receiveFeatureReport(REPORT_ID),
        this.clock.sleep(timeoutMs).then(() => timeout),
      ]);

      if (result === timeout) return { ok: false, reason: 'timeout' };

      if (!(result instanceof DataView)) {
        return { ok: false, reason: 'unexpected read result' };
      }

      return {
        ok: true,
        bytes: new Uint8Array(result.buffer, result.byteOffset, result.byteLength),
      };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}
