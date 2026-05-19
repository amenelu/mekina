const http = require("http");

const LISTEN_PORT = Number(process.env.PROXY_PORT || 8082);
const TARGET_HOST = process.env.TARGET_HOST || "127.0.0.1";
const TARGET_PORT = Number(process.env.TARGET_PORT || 5001);

const server = http.createServer((clientReq, clientRes) => {
  const forwardedProto = "http";
  const proxyOrigin = `${forwardedProto}://${clientReq.headers.host}`;
  const requestOrigin = clientReq.headers.origin || "*";
  const remoteAddress =
    clientReq.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
  console.log(`${new Date().toISOString()} ${remoteAddress} ${clientReq.method} ${clientReq.url}`);

  const corsHeaders = {
    "access-control-allow-origin": requestOrigin,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      clientReq.headers["access-control-request-headers"] ||
      "Authorization, Content-Type",
    "access-control-max-age": "3600",
    vary: "Origin",
  };

  if (clientReq.method === "OPTIONS") {
    clientRes.writeHead(204, corsHeaders);
    clientRes.end();
    return;
  }

  const headers = {
    ...clientReq.headers,
    host: `${TARGET_HOST}:${TARGET_PORT}`,
    origin: proxyOrigin,
  };

  const upstreamReq = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: clientReq.method,
      path: clientReq.url,
      headers,
    },
    (upstreamRes) => {
      const chunks = [];
      upstreamRes.on("data", (chunk) => chunks.push(chunk));
      upstreamRes.on("end", () => {
        const responseHeaders = { ...upstreamRes.headers };
        const contentType = String(responseHeaders["content-type"] || "");
        let body = Buffer.concat(chunks);

        if (responseHeaders.location) {
          responseHeaders.location = String(responseHeaders.location).replace(
            `http://${TARGET_HOST}:${TARGET_PORT}`,
            proxyOrigin
          );
        }

        if (/json|text|javascript|html|css/i.test(contentType)) {
          body = Buffer.from(
            body
              .toString("utf8")
              .replaceAll(`http://${TARGET_HOST}:${TARGET_PORT}`, proxyOrigin)
              .replaceAll(`https://${TARGET_HOST}:${TARGET_PORT}`, proxyOrigin)
          );
          responseHeaders["content-length"] = String(body.length);
        }

        Object.assign(responseHeaders, corsHeaders);
        clientRes.writeHead(upstreamRes.statusCode || 502, responseHeaders);
        clientRes.end(body);
      });
    }
  );

  upstreamReq.on("error", (error) => {
    clientRes.writeHead(502, {
      "content-type": "application/json",
      ...corsHeaders,
    });
    clientRes.end(JSON.stringify({ error: error.message }));
  });

  clientReq.pipe(upstreamReq);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(
    `Dev API proxy listening on http://0.0.0.0:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`
  );
});
