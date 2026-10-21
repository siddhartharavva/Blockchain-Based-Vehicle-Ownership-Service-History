import { get, set } from "idb-keyval";
import { computeCid } from "./cid";

/**
 * Offline stand-in for IPFS used when no Pinata JWT is configured.
 * Files are content-addressed with a real IPFS CID and kept in this browser's IndexedDB,
 * so the on-chain CID and the hash check behave exactly as with Pinata.
 * Files are only visible in the browser that uploaded them.
 */
export function createBrowserStorage() {
  const key = (cid) => `ipfs:${cid}`;

  return {
    name: "Local browser store (no Pinata key)",
    isPersistentIpfs: false,

    async upload(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const cid = await computeCid(bytes, 1);
      await set(key(cid), { bytes, type: file.type, name: file.name });
      return cid;
    },

    async fetchBytes(cid) {
      const entry = await get(key(cid));
      if (!entry) throw new Error("This document is not stored in this browser. Configure Pinata to share files.");
      return entry.bytes;
    },

    async openUrl(cid) {
      const entry = await get(key(cid));
      if (!entry) throw new Error("This document is not stored in this browser. Configure Pinata to share files.");
      return URL.createObjectURL(new Blob([entry.bytes], { type: entry.type || "application/octet-stream" }));
    },
  };
}
