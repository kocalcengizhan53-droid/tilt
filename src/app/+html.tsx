import { Bungee_400Regular } from '@expo-google-fonts/bungee';
import { Asset } from 'expo-asset';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The document the web build is served in: what a link preview reads, and the arcade's own
 * background from the first byte, so there is no white flash before the cabinet draws.
 */
const TITLE = 'Tilt — an offline neon arcade';
const DESCRIPTION = 'Seven arcade games in one offline app — Roll, played by tilting the phone, then Stack, Orbit, Breakout, Slide, Trace and Simon — drawn with Skia and Reanimated, with sound, haptics and a lot of neon.';
const URL = 'https://tilt-arcade-77n.pages.dev';
/*
 * The display face, asked for by the document rather than by the app once its JavaScript runs.
 * Requested late, the font sat behind the bundles on the page's critical path, and Lighthouse's
 * simulation put the first paint at 2.5 s or 4.2 s depending on which way it read the chain.
 */
const DISPLAY_FONT = Asset.fromModule(Bungee_400Regular).uri;

export default function Root({ children }: PropsWithChildren) {
  // Expo hands over the nodes it needs in the document: fonts and styles for the head, the
  // JavaScript bundles for the end of the body. Without them the page renders and never runs.
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#0b0414" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tilt" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={URL} />
        <meta property="og:image" content={`${URL}/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preload" href={DISPLAY_FONT} as="font" type="font/ttf" crossOrigin="" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body { background: #0b0414; } @font-face { font-family: Bungee_400Regular; src: url(${DISPLAY_FONT}) format('truetype'); font-display: swap; }`,
          }}
        />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
