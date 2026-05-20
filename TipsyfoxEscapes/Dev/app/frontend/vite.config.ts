import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
) as { version?: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
  define: {
    /**
     * Injected as APP_BUILD_STAMP in the UI. Source: package.json.
     * MAJOR = product releases (`npm run bump:major`). MINOR = larger changes (`npm run bump:minor`).
     * PATCH auto-increments on each `npm run dev` / `npm run build` unless SKIP_VERSION_BUMP=1.
     */
    __APP_SEMVER__: JSON.stringify(typeof pkg.version === "string" ? pkg.version : "0.0.0"),
  },
  server: {
    proxy: {
      "/version": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (err, _req, res) => {
            const out = res as { headersSent?: boolean; writeHead: (c: number, h: Record<string, string>) => void; end: (b: string) => void };
            if (!out || out.headersSent) return;
            const msg = err instanceof Error ? err.message : String(err);
            out.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
            out.end(
              `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>API unavailable</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:42rem;line-height:1.45">` +
                `<h1 style="margin-top:0">Backend API is not reachable</h1>` +
                `<p>The Vite dev server proxies <code>/api</code> to <code>http://127.0.0.1:3001</code>. Start the backend:</p>` +
                `<pre style="background:#f4f4f5;padding:0.75rem;border-radius:8px;overflow:auto">cd Dev/app/backend\nnpm run dev</pre>` +
                `<p style="color:#555;font-size:0.92rem">Underlying error: ${msg.replace(/</g, "&lt;")}</p>` +
                `</body></html>`,
            );
          });
        },
      },
    },
  },
});

