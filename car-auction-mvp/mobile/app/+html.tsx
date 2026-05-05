import React, { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const BACKGROUND = "#14181F";
const TAB_BAR = "#1C212B";

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content={TAB_BAR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                min-height: 100%;
                background: ${TAB_BAR};
                overscroll-behavior: none;
              }

              body {
                min-height: 100vh;
                min-height: 100dvh;
                background:
                  linear-gradient(
                    to bottom,
                    ${BACKGROUND} 0,
                    ${BACKGROUND} calc(100% - 96px),
                    ${TAB_BAR} calc(100% - 96px),
                    ${TAB_BAR} 100%
                  );
              }

              #root {
                min-height: 100vh;
                min-height: 100dvh;
                background: transparent;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
