import { keycapLabel } from '@/features/editor/keyLabels';
import { FACTORY_KEYS } from '@/lib/keymap';

type LightPreviewProps = {
  color: string;
  brightness: number;
};

const PAD = 12;
const WIDTH = 624;
const HEIGHT = 250;
const FACTORS = [0.22, 0.38, 0.54, 0.7, 0.9];

const mix = (channel: number, factor: number) => Math.round(16 + (channel - 16) * factor);

const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

export function LightPreview({ color, brightness }: LightPreviewProps) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const factor = FACTORS[brightness - 1] ?? 0.54;

  const fill = `rgb(${mix(red, factor)} ${mix(green, factor)} ${mix(blue, factor)})`;
  const ink =
    luminance(mix(red, factor), mix(green, factor), mix(blue, factor)) > 140
      ? '#0f1216'
      : '#f2ecdf';

  return (
    <svg
      viewBox={`0 0 ${WIDTH + PAD * 2} ${HEIGHT + PAD * 2}`}
      role="img"
      aria-label={`Keyboard light preview: ${color.toUpperCase()} at brightness ${brightness} of 5`}
      className="block h-auto w-full"
    >
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

      <g transform={`translate(${PAD} ${PAD})`}>
        {FACTORY_KEYS.map((key) => {
          const label = keycapLabel(key.name);
          const size = label.length >= 5 ? 8 : label.length === 4 ? 9 : 10;

          return (
            <g key={key.idx}>
              <rect
                x={key.x}
                y={key.y}
                width={key.w}
                height={key.h}
                rx="5"
                fill={fill}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
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
