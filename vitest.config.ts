import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      PORT: "3000",
      UAZAPI_BASE_URL: "http://localhost:4000",
      WEBHOOK_SECRET: "test-secret",
    },
  },
});
