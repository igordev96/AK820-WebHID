import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WebHid, WebHidDevice } from '@/lib/hid';
import { App } from './App';

const reply = (cmd: number, status: number) => {
  const bytes = new Uint8Array(64);
  bytes[0] = 0x04;
  bytes[1] = cmd;
  bytes[3] = status;
  return bytes;
};

describe('App upload flow', () => {
  it('connects, uploads a media change and reports success', async () => {
    const queue: Uint8Array[] = [];
    const device: WebHidDevice = {
      opened: false,
      productName: 'AK820',
      vendorId: 0x0c45,
      productId: 0x8009,
      collections: [{ usagePage: 0xff13, usage: 0x0001 }],
      open: async () => {},
      close: async () => {},
      sendFeatureReport: async (_reportId, data) => {
        const bytes = new Uint8Array(data as Uint8Array);
        if (bytes[0] !== 0x04) return;

        const command = bytes[1];
        if (command === 0x18) queue.push(reply(0x18, 0x01));
        else if (command === 0x11 || command === 0x27) queue.push(reply(command, 0x01));
        else if (command === 0x02) queue.push(reply(0x02, 0x01));
        else if (command === 0xf0) queue.push(reply(0xf0, 0x01));
      },
      receiveFeatureReport: async () => {
        const bytes = queue.shift() ?? new Uint8Array(64);
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const hid: WebHid = {
      requestDevice: async () => [device],
      getDevices: async () => [],
    };
    Object.defineProperty(navigator, 'hid', { value: hid, configurable: true });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /connect keyboard/i }));
    await screen.findByText('AK820');

    const board = screen.getByRole('group', { name: /keyboard board/i });
    await user.click(within(board).getByRole('button', { name: 'CapsLock' }));
    await user.selectOptions(screen.getByLabelText('Sends'), 'c:0xE2');
    await user.click(screen.getByRole('button', { name: /upload 1 change/i }));

    await screen.findByText('No pending changes', {}, { timeout: 8000 });

    await user.click(screen.getByRole('button', { name: /^log$/i }));
    expect(screen.getByRole('log')).toHaveTextContent(/Upload accepted/);
  }, 15000);
});

describe('App advanced drawer', () => {
  it('opens the advanced tools once the keyboard is connected and closes with Escape', async () => {
    const device: WebHidDevice = {
      opened: false,
      productName: 'AK820',
      vendorId: 0x0c45,
      productId: 0x8009,
      collections: [{ usagePage: 0xff13, usage: 0x0001 }],
      open: async () => {},
      close: async () => {},
      sendFeatureReport: async () => {},
      receiveFeatureReport: async () => {
        throw new Error('no reply');
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const hid: WebHid = {
      requestDevice: async () => [device],
      getDevices: async () => [],
    };
    Object.defineProperty(navigator, 'hid', { value: hid, configurable: true });

    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Advanced' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /connect keyboard/i }));
    await screen.findByText('AK820');
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const dialog = await screen.findByRole('dialog', { name: 'Advanced' });
    expect(within(dialog).getByRole('tab', { name: 'Diagnostics' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Advanced' })).not.toBeInTheDocument();
  });
});
