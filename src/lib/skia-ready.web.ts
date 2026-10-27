/**
 * On the web, Skia is CanvasKit: three megabytes of WebAssembly that must be loaded before any
 * module that imports Skia is evaluated. The cabinet does not draw with Skia, so the app starts
 * without it — even the loader is a separate chunk; the cabinet prefetches it once it is idle,
 * and a game's chunk is only imported after this promise resolves.
 */
let loading: Promise<void> | null = null;

export function skiaReady(): Promise<void> {
  loading ??= import("@shopify/react-native-skia/lib/module/web")
    .then(({ LoadSkiaWeb }) =>
      LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }),
    )
    .then(() => undefined);
  return loading;
}

export function prefetchSkia() {
  const start = () => void skiaReady();
  /*
   * On the first touch, or two seconds after the cabinet has painted in its own type, whichever
   * comes first. Started on idle it came 170 ms in, and three megabytes of WebAssembly competed
   * with the display face and the cards on a slow connection — for visitors who may never play.
   */
  window.addEventListener("pointerdown", start, { once: true, capture: true });
  const later = () =>
    void document.fonts.ready.then(() => setTimeout(start, 2000));
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}
