import type * as React from 'react';
import { keycapLabel } from '@/features/editor/keyLabels';
import { BOARD_HEIGHT, BOARD_WIDTH, FACTORY_KEYS } from '@/lib/keymap';
import { lightMotion, lightPhase } from '@/lib/lighting';
import { cn } from '@/lib/utils';

type LightPreviewProps = {
  color: string;
  brightness: number;
  speed?: number;
  colorful?: boolean;
  off?: boolean;
  mode?: number;
  direction?: number;
};

const PAD = 12;
const WIDTH = BOARD_WIDTH;
const HEIGHT = BOARD_HEIGHT;
const FACTORS = [0.22, 0.38, 0.54, 0.7, 0.9];

const mix = (channel: number, factor: number) => Math.round(16 + (channel - 16) * factor);
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

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
  const motion = off ? 'none' : lightMotion(mode);

  const solid = `rgb(${mix(red, factor)} ${mix(green, factor)} ${mix(blue, factor)})`;
  const full = `rgb(${red} ${green} ${blue})`;
  const fill = off ? undefined : colorful || motion === 'hue' ? 'url(#light-rainbow)' : solid;
  const inkClass = off
    ? 'fill-muted'
    : colorful ||
        motion === 'hue' ||
        luminance(mix(red, factor), mix(green, factor), mix(blue, factor)) > 140
      ? 'fill-ink'
      : 'fill-ivory';

  const duration = Math.max(1, 7 / speed);
  const dim = 0.18 + brightness * 0.05;
  const bright = 0.55 + brightness * 0.09;
  const style = {
    '--light-dim': dim,
    '--light-bright': bright,
    '--light-duration': `${duration}s`,
  } as React.CSSProperties;

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
        strokeWidth="1"
        className="fill-bench stroke-line"
      />

      <g
        transform={`translate(${PAD} ${PAD})`}
        style={style}
        className={animated && motion === 'hue' ? 'light-hue' : undefined}
      >
        {FACTORY_KEYS.map((key) => {
          const label = keycapLabel(key.name);
          const size = label.length >= 5 ? 8 : label.length === 4 ? 9 : 10;
          const delay = animated ? -lightPhase(motion, mode, direction, key) * duration : 0;
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
                className={cn(off ? 'fill-surface-2' : undefined, className)}
                style={animated ? { animationDelay: `${delay}s` } : undefined}
              />
              <text
                x={key.x + key.w / 2}
                y={key.y + key.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size}
                fillOpacity="0.85"
                className={cn(
                  inkClass,
                  /^[A-Za-z]/.test(label) ? 'font-sans font-medium' : 'font-mono',
                )}
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
