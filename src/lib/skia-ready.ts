/**
 * Native builds link Skia in; there is nothing to wait for. The web build overrides this file
 * (skia-ready.web.ts) to fetch CanvasKit.
 */
export const skiaReady = (): Promise<void> => Promise.resolve();
export const prefetchSkia = (): void => {};
