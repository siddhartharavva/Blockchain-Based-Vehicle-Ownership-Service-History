const fs = require("fs");
const path = require("path");

/** Where deploy.js writes ABIs + addresses for the frontend, and where seed.js reads them back. */
const CONTRACTS_DIR = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
const ADDRESS_FILE = path.join(CONTRACTS_DIR, "address.json");

function writeDeployment(artifacts, deployment) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  for (const name of ["VehicleRegistry", "VehicleNFT"]) {
    const { abi } = artifacts.readArtifactSync(name);
    fs.writeFileSync(path.join(CONTRACTS_DIR, `${name}.json`), JSON.stringify({ abi }, null, 2));
  }
  // Keep one entry per chain so local and Sepolia deployments can live side by side.
  const all = fs.existsSync(ADDRESS_FILE) ? JSON.parse(fs.readFileSync(ADDRESS_FILE, "utf8")) : {};
  all[deployment.chainId] = deployment;
  fs.writeFileSync(ADDRESS_FILE, JSON.stringify(all, null, 2));
}

function readDeployment(chainId) {
  if (!fs.existsSync(ADDRESS_FILE)) throw new Error("No deployment found. Run scripts/deploy.js first.");
  const deployment = JSON.parse(fs.readFileSync(ADDRESS_FILE, "utf8"))[chainId];
  if (!deployment) throw new Error(`No deployment for chain ${chainId}. Run scripts/deploy.js on this network.`);
  return deployment;
}

module.exports = { writeDeployment, readDeployment };
