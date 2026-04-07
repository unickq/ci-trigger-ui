import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";

// https://vite.dev/config/
const commit = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? "/",
  define: {
    __COMMIT__: JSON.stringify(commit),
  },
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    reporters: ["default", "junit"],
    outputFile: "test-results.xml",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
