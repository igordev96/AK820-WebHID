import { useCallback, useState } from 'react';
import { findConfigCollection } from '@/lib/hid/collections';
import type { LogFn } from '@/lib/hid/transfer';
import {
  buildWebHidFilters,
  getWebHid,
  pickDevice,
  type WebHid,
  type WebHidDevice,
} from '@/lib/hid/webhid';

export type DeviceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type DeviceState = {
  readonly status: DeviceStatus;
  readonly device: WebHidDevice | null;
  readonly name: string | null;
  readonly vendorId: number | null;
  readonly productId: number | null;
  readonly configFound: boolean;
  readonly error: string | null;
};

const initialState: DeviceState = {
  status: 'idle',
  device: null,
  name: null,
  vendorId: null,
  productId: null,
  configFound: false,
  error: null,
};

const hex = (value: number) => value.toString(16).toUpperCase().padStart(4, '0');

export function useDevice({ hid, log }: { hid?: WebHid; log?: LogFn } = {}) {
  const available = hid ?? getWebHid();
  const [state, setState] = useState<DeviceState>(initialState);

  const connect = useCallback(async () => {
    if (!available) {
      const message =
        'WebHID is not available in this browser. Use Chrome, Edge or Opera on desktop.';
      setState({ ...initialState, status: 'error', error: message });
      log?.(message, 'err');
      return;
    }

    setState({ ...initialState, status: 'connecting' });
    log?.('requesting device…', 'dim');

    try {
      const devices = await available.requestDevice({ filters: buildWebHidFilters() });
      const device = pickDevice(devices);

      if (!device) {
        setState(initialState);
        log?.('no device selected', 'warn');
        return;
      }

      await device.open();
      const configFound = Boolean(findConfigCollection({ collections: device.collections }));

      const handleDisconnect = () => {
        log?.('keyboard disconnected', 'warn');
        setState(initialState);
      };
      device.addEventListener('disconnect', handleDisconnect);

      setState({
        status: 'connected',
        device,
        name: device.productName ?? 'AK820',
        vendorId: device.vendorId,
        productId: device.productId,
        configFound,
        error: null,
      });

      log?.(
        `selected ${device.productName ?? 'AK820'} ${hex(device.vendorId)}:${hex(device.productId)}`,
        'ok',
      );
      log?.('device opened', 'ok');
      if (!configFound) {
        log?.(
          'config interface 0xFF13/0x0001 not found. Use USB mode and close the vendor app.',
          'err',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ ...initialState, status: 'error', error: message });
      log?.(`connection failed: ${message}`, 'err');
    }
  }, [available, log]);

  const disconnect = useCallback(async () => {
    const device = state.device;
    if (!device) return;

    try {
      await device.close();
    } catch (error) {
      log?.(`close failed: ${error instanceof Error ? error.message : String(error)}`, 'warn');
    }

    setState(initialState);
    log?.('disconnected', 'dim');
  }, [log, state.device]);

  return {
    ...state,
    supported: Boolean(available),
    connect,
    disconnect,
  };
}
