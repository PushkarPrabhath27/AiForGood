// Empty module stub to prevent MSW browser SSR resolution crashes
export const setupWorker = () => ({
  start: () => Promise.resolve(),
  stop: () => {},
});

export const worker = null;

export const initMocks = () => Promise.resolve();
