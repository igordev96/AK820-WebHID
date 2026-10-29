const KEY_LABELS: Record<string, string> = {
  Esc: 'Esc',
  Delete: 'Del',
  home: 'Home',
  PgUp: 'PgUp',
  PgDn: 'PgDn',
  CapsLock: 'Caps',
  Backspace: 'Bksp',
  PrintScreen: 'PrtSc',
  ScrollLock: 'ScrLk',
  Shift_L: 'Shift',
  Shift_R: 'Shift',
  Ctrl_L: 'Ctrl',
  Ctrl_R: 'Ctrl',
  Alt_L: 'Alt',
  Alt_R: 'Alt',
  Win_L: 'Win',
  '}}': ']}',
};

export function keycapLabel(name: string): string {
  return KEY_LABELS[name] ?? name;
}

export function isSymbolLabel(label: string): boolean {
  return !/^[A-Za-z]/.test(label);
}
