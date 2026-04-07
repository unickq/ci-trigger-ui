import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? "/",
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
