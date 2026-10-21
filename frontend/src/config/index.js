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

export const PINATA_JWT = env.VITE_PINATA_JWT || "";
export const PINATA_GATEWAY = env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
