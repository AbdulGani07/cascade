import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "api-analysis-middleware",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/api/analysis") {
            const analysisPath = path.resolve(__dirname, "../../test-project/analysis.json");
            if (fs.existsSync(analysisPath)) {
              res.setHeader("Content-Type", "application/json");
              res.end(fs.readFileSync(analysisPath, "utf-8"));
              return;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
