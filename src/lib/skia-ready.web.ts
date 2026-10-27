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
  /*
   * Two seconds after the cabinet has painted in its own type, download the WebAssembly into the
   * cache at low priority — bytes only. Compiling and starting CanvasKit is main-thread work and
   * belongs to the moment someone is about to play: their first touch, or the game's own loading
   * state. Started on idle it came 170 ms in and competed with the fonts and the cards; started in
   * full after two seconds it stalled the page while the visitor was looking at it.
   */
  window.addEventListener("pointerdown", () => void skiaReady(), {
    once: true,
    capture: true,
  });
  const warm = () =>
    void fetch("/canvaskit.wasm", { priority: "low" } as RequestInit).catch(
      () => {},
    );
  const later = () =>
    void document.fonts.ready.then(() => setTimeout(warm, 2000));
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}
