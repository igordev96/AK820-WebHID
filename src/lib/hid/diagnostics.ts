import type { Clock } from '@/lib/clock';
import { realClock } from '@/lib/clock';
import { hex } from '@/lib/format';
import type { HidTransport } from './client';
import { findConfigCollection } from './collections';
import type { LogFn } from './transfer';
import type { WebHidCollection } from './webhid';

export type DiagnosticStatus = 'ok' | 'warn' | 'err';

export type DiagnosticStep = {
  readonly name: string;
  readonly status: DiagnosticStatus;
  readonly detail: string;
};

export type DiagnosticResult = {
  readonly steps: DiagnosticStep[];
  readonly verdict: string;
  readonly level: DiagnosticStatus;
};

export type DiagnosticDevice = {
  readonly collections: readonly WebHidCollection[];
  readonly vendorId: number;
  readonly productId: number;
};

export type DiagnoseOptions = {
  readonly device: DiagnosticDevice;
  readonly transport: HidTransport;
  readonly clock?: Clock;
  readonly log?: LogFn;
  readonly secureContext?: boolean;
};

const reportDetail = (
  reports: readonly { reportId: number; items: readonly unknown[] }[] | undefined,
) =>
  reports?.length
    ? reports.map((report) => `${report.reportId}:${report.items.length}`).join(', ')
    : 'none';

export async function diagnose({
  device,
  transport,
  clock = realClock,
  log,
  secureContext,
}: DiagnoseOptions): Promise<DiagnosticResult> {
  const steps: DiagnosticStep[] = [];
  const push = (name: string, status: DiagnosticStatus, detail: string) => {
    steps.push({ name, status, detail });
    const mark = status === 'ok' ? 'PASS' : status === 'warn' ? 'WARN' : 'FAIL';
    log?.(
      `[${mark}] ${name}${detail ? `: ${detail}` : ''}`,
      status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'err',
    );
  };

  log?.('──── diagnostics start ────', 'dim');

  const secure = secureContext ?? (typeof window !== 'undefined' ? window.isSecureContext : true);
  push('secure context', secure ? 'ok' : 'err', secure ? 'yes' : 'serve over HTTPS or localhost');

  const config = findConfigCollection({ collections: device.collections });
  push('config interface 0xFF13/0x0001', config ? 'ok' : 'err', config ? 'found' : 'not found');

  if (config) {
    push(
      'feature reports',
      config.featureReports?.length ? 'ok' : 'err',
      reportDetail(config.featureReports),
    );
    push(
      'output reports',
      config.outputReports?.length ? 'ok' : 'warn',
      reportDetail(config.outputReports),
    );
  }

  let writable = false;
  try {
    await transport.send(Uint8Array.from([0x04, 0x18]));
    writable = true;
    push('feature write (04 18 init)', 'ok', 'sendFeatureReport resolved');
  } catch (error) {
    push(
      'feature write (04 18 init)',
      'err',
      error instanceof Error ? error.message : String(error),
    );
  }

  let readBack: Uint8Array | null = null;

  if (writable) {
    const probe = async (name: string, payload: readonly number[]) => {
      log?.(`probe ${name}`, 'dim');
      try {
        await transport.send(Uint8Array.from(payload));
      } catch (error) {
        log?.(`  send failed: ${error instanceof Error ? error.message : String(error)}`, 'err');
        return null;
      }

      await clock.sleep(700);
      const result = await transport.read(900);
      await clock.sleep(400);

      if (result.ok) {
        log?.(`  feature read returned ${hex(result.bytes)}`, 'ok');
        return result.bytes;
      }

      log?.(`  feature read: ${result.reason}`, 'dim');
      return null;
    };

    const generic = await probe('04 19 (generic read)', [0x04, 0x19]);
    const version = await probe('04 F5 (firmware ver)', [0x04, 0xf5]);
    readBack = generic ?? version;

    push(
      'feature read-back',
      readBack ? 'ok' : 'warn',
      readBack ? `${hex(readBack.subarray(0, 5))}…` : 'no reply',
    );
    push('async input reports', 'warn', 'not used by the config interface');
  }

  let verdict: string;
  let level: DiagnosticStatus;

  if (!writable) {
    verdict =
      'WebHID could not write to the keyboard. Close the AJAZZ app, check the USB connection and try again.';
    level = 'err';
  } else if (readBack) {
    verdict =
      'Transport works. Commands are written and the mailbox answers with a per-command status byte. The configuration has no read-back, so the driver keeps its own copy.';
    level = 'ok';
  } else {
    verdict =
      'The keyboard accepts writes but does not answer the read probes. Treat it as write-only: the driver keeps its own configuration copy.';
    level = 'warn';
  }

  log?.(`VERDICT: ${verdict}`, level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'err');
  log?.('──── diagnostics done ────', 'dim');

  return { steps, verdict, level };
}
