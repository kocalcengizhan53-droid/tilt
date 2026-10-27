import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The document the web build is served in: what a link preview reads, and the arcade's own
 * background from the first byte, so there is no white flash before the cabinet draws.
 */
const TITLE = 'Tilt — an offline neon arcade';
const DESCRIPTION = 'Six arcade games in one offline app — Stack, Orbit, Breakout, Slide, Trace and Simon — drawn with Skia and Reanimated, with sound, haptics and a lot of neon.';
const URL = 'https://tilt-arcade-77n.pages.dev';

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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background: #0b0414; }' }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
