import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

/*
 * The app starts at once. Skia's WebAssembly is fetched separately (src/lib/skia-ready.web.ts):
 * the cabinet does not need it, and a game waits for it before its chunk is imported.
 */
renderRootComponent(App);
