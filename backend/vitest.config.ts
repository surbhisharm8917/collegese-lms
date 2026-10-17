import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@config": resolve(__dirname, "src/config"),
      "@controllers": resolve(__dirname, "src/controllers"),
      "@middlewares": resolve(__dirname, "src/middlewares"),
      "@routes": resolve(__dirname, "src/routes"),
      "@services": resolve(__dirname, "src/services"),
      "@utils": resolve(__dirname, "src/utils"),
      "@websocket": resolve(__dirname, "src/websocket"),
      "@types": resolve(__dirname, "src/types"),
      "@generated": resolve(__dirname, "generated"),
    },
  },
});
