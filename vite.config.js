import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js references `global`; map it to globalThis for the browser
  define: { global: "globalThis" },
  server: { port: 5173, open: true },
});
