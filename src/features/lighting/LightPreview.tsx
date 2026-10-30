import type * as React from 'react';
import { keycapLabel } from '@/features/editor/keyLabels';
import { FACTORY_KEYS } from '@/lib/keymap';

type LightPreviewProps = {
  color: string;
  brightness: number;
  speed?: number;
  colorful?: boolean;
  off?: boolean;
  mode?: number;
  direction?: number;
};

type Motion = 'none' | 'pulse' | 'row' | 'column' | 'radial' | 'rotate' | 'twinkle' | 'hue';

const PAD = 12;
const WIDTH = 624;
const HEIGHT = 250;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const FACTORS = [0.22, 0.38, 0.54, 0.7, 0.9];

const mix = (channel: number, factor: number) => Math.round(16 + (channel - 16) * factor);
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

const motionFor = (mode: number): Motion => {
  if (mode === 20) return 'none';
  if (mode === 1) return 'none';
  if (mode === 4) return 'twinkle';
  if (mode === 6 || mode === 8) return 'hue';
  if (mode === 5) return 'row';
  if (mode === 9 || mode === 13 || mode === 15) return 'radial';
  if (mode === 12) return 'rotate';
  if (mode === 11 || mode === 16 || mode === 18 || mode === 19) return 'column';
  if (mode === 10) return 'row';
  if (mode === 14) return 'row';
  return 'pulse';
};

// Modes with a fixed travel direction, regardless of the direction control.
const fixedUp = (mode: number) => mode === 14;
const fixedDown = (mode: number) => mode === 5;

export function LightPreview({
  color,
  brightness,
  speed = 3,
  colorful = false,
  off = false,
  mode = 1,
  direction = 0,
}: LightPreviewProps) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const factor = FACTORS[brightness - 1] ?? 0.54;
  const motion = off ? 'none' : motionFor(mode);

  const solid = `rgb(${mix(red, factor)} ${mix(green, factor)} ${mix(blue, factor)})`;
  const full = `rgb(${red} ${green} ${blue})`;
  const fill = off ? '#1b2129' : colorful || motion === 'hue' ? 'url(#light-rainbow)' : solid;
  const ink = off
    ? '#929ba8'
    : colorful ||
        motion === 'hue' ||
        luminance(mix(red, factor), mix(green, factor), mix(blue, factor)) > 140
      ? '#0f1216'
      : '#f2ecdf';

  const duration = Math.max(1, 7 / speed);
  const dim = 0.18 + brightness * 0.05;
  const bright = 0.55 + brightness * 0.09;
  const style = {
    '--light-dim': dim,
    '--light-bright': bright,
    '--light-duration': `${duration}s`,
  } as React.CSSProperties;

  const phase = (key: (typeof FACTORY_KEYS)[number]): number => {
    if (motion === 'row') {
      const up = fixedUp(mode) || (!fixedDown(mode) && direction === 2);
      return up ? 1 - key.y / HEIGHT : key.y / HEIGHT;
    }
    if (motion === 'column') {
      const right = direction === 0;
      return right ? 1 - key.x / WIDTH : key.x / WIDTH;
    }
    if (motion === 'radial') {
      const cx = key.x + key.w / 2 - CENTER.x;
      const cy = key.y + key.h / 2 - CENTER.y;
      return Math.min(1, Math.hypot(cx, cy) / 340);
    }
    if (motion === 'rotate') {
      const angle = Math.atan2(key.y + key.h / 2 - CENTER.y, key.x + key.w / 2 - CENTER.x);
      return (angle + Math.PI) / (Math.PI * 2);
    }
    if (motion === 'twinkle') return ((key.idx * 37) % 100) / 100;
    return 0;
  };

  const animated = motion !== 'none' && !off;

  return (
    <svg
      viewBox={`0 0 ${WIDTH + PAD * 2} ${HEIGHT + PAD * 2}`}
      role="img"
      aria-label={
        off
          ? 'Keyboard light preview: off'
          : colorful
            ? `Keyboard light preview: colourful at brightness ${brightness} of 5`
            : `Keyboard light preview: ${color.toUpperCase()} at brightness ${brightness} of 5`
      }
      className="block h-auto w-full"
    >
      {(colorful || motion === 'hue') && !off ? (
        <defs>
          <linearGradient
            id="light-rainbow"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={WIDTH}
            y2={HEIGHT}
          >
            <stop offset="0" stopColor="#ff3b30" />
            <stop offset="0.2" stopColor="#ffcc00" />
            <stop offset="0.4" stopColor="#34c759" />
            <stop offset="0.6" stopColor="#32ade6" />
            <stop offset="0.8" stopColor="#af52de" />
            <stop offset="1" stopColor="#ff2d55" />
          </linearGradient>
        </defs>
      ) : null}

      <rect
        x="0"
        y="0"
        width={WIDTH + PAD * 2}
        height={HEIGHT + PAD * 2}
        rx="16"
        fill="#10151b"
        stroke="#303845"
        strokeWidth="1"
      />

      <g
        transform={`translate(${PAD} ${PAD})`}
        style={style}
        className={animated && motion === 'hue' ? 'light-hue' : undefined}
      >
        {FACTORY_KEYS.map((key) => {
          const label = keycapLabel(key.name);
          const size = label.length >= 5 ? 8 : label.length === 4 ? 9 : 10;
          const delay = animated ? -phase(key) * duration : 0;
          const className =
            animated && motion !== 'hue'
              ? motion === 'twinkle'
                ? 'light-twinkle'
                : 'light-wave'
              : undefined;

          return (
            <g key={key.idx}>
              <rect
                x={key.x}
                y={key.y}
                width={key.w}
                height={key.h}
                rx="5"
                fill={animated && motion !== 'hue' && !colorful ? full : fill}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
                className={className}
                style={animated ? { animationDelay: `${delay}s` } : undefined}
              />
              <text
                x={key.x + key.w / 2}
                y={key.y + key.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size}
                fill={ink}
                fillOpacity="0.85"
                className={/^[A-Za-z]/.test(label) ? 'font-sans font-medium' : 'font-mono'}
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
