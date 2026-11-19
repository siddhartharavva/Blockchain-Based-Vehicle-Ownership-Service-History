import os from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PORT = 5173;

/** First private IPv4 address of this computer (e.g. 192.168.1.20), used for QR links in dev. */
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "";
}

export default defineConfig({
  plugins: [react()],
  // `host: true` lets a phone on the same Wi-Fi open the QR-code link.
  server: { port: PORT, host: true },
  define: {
    __LAN_HOST__: JSON.stringify(lanAddress()),
  },
});
