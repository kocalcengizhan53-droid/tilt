/**
 * On the web, Skia is CanvasKit: three megabytes of WebAssembly that must be loaded before any
 * module that imports Skia is evaluated. The cabinet does not draw with Skia, so the app starts
 * without it — even the loader is a separate chunk; the cabinet prefetches it once it is idle,
 * and a game's chunk is only imported after this promise resolves.
 */
let loading: Promise<void> | null = null;

export function skiaReady(): Promise<void> {
  loading ??= import('@shopify/react-native-skia/lib/module/web')
    .then(({ LoadSkiaWeb }) => LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }))
    .then(() => undefined);
  return loading;
}

export function prefetchSkia() {
  const start = () => void skiaReady();
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, { timeout: 2500 });
  else setTimeout(start, 1200);
}
