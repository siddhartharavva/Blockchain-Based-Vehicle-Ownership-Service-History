const hre = require("hardhat");
const { deployRegistry } = require("./lib/deployRegistry");
const { writeDeployment } = require("./lib/deployment");

async function main() {
  const { ethers, artifacts, network } = hre;
  const [admin] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const startBlock = await ethers.provider.getBlockNumber();

  console.log(`Deploying to ${network.name} (chain ${chainId}) from ${admin.address}`);
  const { registry, nft } = await deployRegistry(ethers, admin);

  // Title-token metadata opens the public history page (override with FRONTEND_URL for hosted builds).
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  await (await nft.setBaseURI(`${frontendUrl}/vehicle/`)).wait();

  const deployment = {
    chainId: Number(chainId),
    network: network.name,
    VehicleRegistry: await registry.getAddress(),
    VehicleNFT: await nft.getAddress(),
    deployBlock: startBlock,
  };
  writeDeployment(artifacts, deployment);

  console.log("VehicleRegistry:", deployment.VehicleRegistry);
  console.log("VehicleNFT:     ", deployment.VehicleNFT);
  console.log("ABIs and addresses written to frontend/src/contracts/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
