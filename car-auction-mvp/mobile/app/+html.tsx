import React, { PropsWithChildren } from "react";

const BACKGROUND = "#14181F";
const TAB_BAR = "#1C212B";
const BOTTOM_SHELL_HEIGHT = 10;

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content={TAB_BAR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                min-height: 100dvh;
                background: ${TAB_BAR};
                width: 100%;
              }

              body {
                height: 100%;
                min-height: 100dvh;
                overflow: hidden;
                overflow-x: hidden;
                overscroll-behavior: contain;
                touch-action: pan-x pan-y;
                background:
                  linear-gradient(
                    to bottom,
                    ${BACKGROUND} 0,
                    ${BACKGROUND} calc(100% - ${BOTTOM_SHELL_HEIGHT}px),
                    ${TAB_BAR} calc(100% - ${BOTTOM_SHELL_HEIGHT}px),
                    ${TAB_BAR} 100%
                  );
              }

              #root {
                display: flex;
                height: 100%;
                min-height: 100dvh;
                width: 100%;
                overflow: hidden;
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
