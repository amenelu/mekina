import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


class NoCacheHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path).path

        if not os.path.splitext(parsed_path)[1] and parsed_path != "/":
            html_path = os.path.join(os.getcwd(), parsed_path.lstrip("/") + ".html")
            index_path = os.path.join(os.getcwd(), parsed_path.lstrip("/"), "index.html")

            if os.path.isfile(html_path):
                self.path = parsed_path + ".html"
            elif os.path.isfile(index_path):
                self.path = parsed_path.rstrip("/") + "/index.html"
            else:
                self.path = "/index.html"

        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8082), NoCacheHandler)
    server.serve_forever()
