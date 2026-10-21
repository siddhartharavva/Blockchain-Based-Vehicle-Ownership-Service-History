/**
 * Deploys VehicleNFT + VehicleRegistry and wires them together.
 * Shared by scripts/deploy.js and the test suite so deployment logic exists once.
 */
async function deployRegistry(ethers, admin) {
  const nftFactory = await ethers.getContractFactory("VehicleNFT", admin);
  const nft = await nftFactory.deploy(admin.address);
  await nft.waitForDeployment();

  const registryFactory = await ethers.getContractFactory("VehicleRegistry", admin);
  const registry = await registryFactory.deploy(admin.address, await nft.getAddress());
  await registry.waitForDeployment();

  await (await nft.setRegistry(await registry.getAddress())).wait();
  return { nft, registry };
}

/** Builds the VehicleSpec tuple the contract expects. */
function vehicleSpec(overrides = {}) {
  return {
    vin: "1HGCM82633A004352",
    registrationNumber: "TS09AB1234",
    make: "Honda",
    model: "City",
    year: 2021,
    color: "White",
    engineNumber: "ENG123456",
    owner: overrides.owner,
    documentCID: "",
    ...overrides,
  };
}

module.exports = { deployRegistry, vehicleSpec };
