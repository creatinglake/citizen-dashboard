import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./tests/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "tests/unit/**/*.test.{js,jsx}"],
    testTimeout: 15000,
  },
});
