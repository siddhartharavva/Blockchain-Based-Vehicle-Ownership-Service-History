import deployments from "../contracts/address.json";
import registryArtifact from "../contracts/VehicleRegistry.json";

/** Single source for runtime configuration (env + deployment output from scripts/deploy.js). */
const env = import.meta.env;

export const CHAIN_ID = Number(env.VITE_CHAIN_ID || 31337);
export const RPC_URL = env.VITE_RPC_URL || "http://127.0.0.1:8545";

const KNOWN_CHAINS = {
  31337: { name: "Hardhat Local", explorer: null, currency: "ETH" },
  11155111: { name: "Sepolia", explorer: "https://sepolia.etherscan.io", currency: "SepoliaETH" },
};
export const CHAIN = { id: CHAIN_ID, ...(KNOWN_CHAINS[CHAIN_ID] || { name: `Chain ${CHAIN_ID}`, explorer: null }) };

export const DEPLOYMENT = deployments[CHAIN_ID] || null;
export const REGISTRY_ABI = registryArtifact.abi;

/**
 * Base URL put in QR codes and PDF reports. A phone cannot open "localhost", so:
 * VITE_PUBLIC_URL (e.g. your Vercel URL) wins; otherwise, when the app is opened on localhost
 * during `npm run dev`, use this computer's Wi-Fi address; otherwise the current origin.
 */
function publicBaseUrl() {
  if (env.VITE_PUBLIC_URL) return env.VITE_PUBLIC_URL.replace(/\/+$/, "");
  const { protocol, hostname, port, origin } = window.location;
  const lanHost = typeof __LAN_HOST__ === "string" ? __LAN_HOST__ : "";
  if ((hostname === "localhost" || hostname === "127.0.0.1") && lanHost) {
    return `${protocol}//${lanHost}${port ? `:${port}` : ""}`;
  }
  return origin;
}
export const PUBLIC_URL = publicBaseUrl();
export const vehiclePageUrl = (vin) => `${PUBLIC_URL}/vehicle/${encodeURIComponent(vin)}`;

export const PINATA_JWT = env.VITE_PINATA_JWT || "";
export const PINATA_GATEWAY = env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
