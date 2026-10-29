import {
  SCREEN_HEIGHT,
  SCREEN_MAX_FRAMES,
  SCREEN_WIDTH,
  encodeRgb565,
  normalizeDelayMs,
} from './animation';

export type DecodedAnimation = {
  readonly frames: Uint8Array[];
  readonly delaysMs: number[];
  readonly frameCount: number;
  readonly truncated: boolean;
};

type DecodedImage = {
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly duration: number | null;
  close(): void;
};

type ImageDecoderLike = {
  readonly tracks: {
    readonly ready: Promise<void>;
    readonly selectedTrack: { readonly frameCount: number } | null;
  };
  decode(options: { frameIndex: number }): Promise<{ image: DecodedImage }>;
  close(): void;
};

type ImageDecoderCtor = new (init: { data: ArrayBuffer; type: string }) => ImageDecoderLike;

const getImageDecoder = (): ImageDecoderCtor | undefined =>
  (globalThis as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;

export function supportsAnimationDecoding(): boolean {
  return typeof getImageDecoder() === 'function';
}

/**
 * Decodes an animated image with the browser's ImageDecoder, composites each
 * frame onto a 128 x 128 canvas, and returns RGB565 frames with delays in the
 * vendor range. Frames beyond the screen limit are dropped.
 */
export async function decodeAnimation(
  file: Blob,
  maxFrames: number = SCREEN_MAX_FRAMES,
): Promise<DecodedAnimation> {
  const Ctor = getImageDecoder();
  if (!Ctor) {
    throw new Error('This browser cannot decode animated images. Use Chrome, Edge or Opera.');
  }

  const data = await file.arrayBuffer();
  const decoder = new Ctor({ data, type: file.type || 'image/gif' });

  try {
    await decoder.tracks.ready;
    const total = decoder.tracks.selectedTrack?.frameCount ?? 1;
    const count = Math.min(total, maxFrames);

    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('the browser refused a 2D canvas');

    const frames: Uint8Array[] = [];
    const delaysMs: number[] = [];

    for (let index = 0; index < count; index += 1) {
      const { image } = await decoder.decode({ frameIndex: index });

      const scale = Math.max(
        SCREEN_WIDTH / image.displayWidth,
        SCREEN_HEIGHT / image.displayHeight,
      );
      const width = image.displayWidth * scale;
      const height = image.displayHeight * scale;

      context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      context.drawImage(
        image as unknown as CanvasImageSource,
        (SCREEN_WIDTH - width) / 2,
        (SCREEN_HEIGHT - height) / 2,
        width,
        height,
      );

      frames.push(
        encodeRgb565(
          context.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT).data,
          SCREEN_WIDTH,
          SCREEN_HEIGHT,
        ),
      );

      const durationMs = image.duration && image.duration > 0 ? image.duration / 1000 : 100;
      delaysMs.push(normalizeDelayMs(durationMs));
      image.close();
    }

    return { frames, delaysMs, frameCount: total, truncated: total > count };
  } finally {
    decoder.close();
  }
}
