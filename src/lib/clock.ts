export type Clock = {
  now(): number;
  sleep(ms: number): Promise<void>;
};

export const realClock: Clock = {
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
