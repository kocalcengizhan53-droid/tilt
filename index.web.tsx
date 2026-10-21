import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/*
 * On the web, Skia is CanvasKit — a WebAssembly build that has to be loaded before any Skia
 * module is evaluated. The file is served from /public, where the postinstall script puts it.
 */
LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  renderRootComponent(App);
});
