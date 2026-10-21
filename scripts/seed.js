const hre = require("hardhat");
const { vehicleSpec } = require("./lib/deployRegistry");
const { readDeployment } = require("./lib/deployment");

/**
 * Demo data for local runs. Hardhat test accounts:
 *   #0 Admin   #1 RTO   #2 Service centre   #3 Insurer   #4 Bank   #5 Manufacturer
 *   #6 Owner A #7 Owner B
 */
async function main() {
  const { ethers } = hre;
  const [admin, rto, service, insurer, bank, maker, ownerA, ownerB] = await ethers.getSigners();
  const { chainId } = await ethers.provider.getNetwork();
  const { VehicleRegistry } = readDeployment(Number(chainId));
  const registry = await ethers.getContractAt("VehicleRegistry", VehicleRegistry, admin);
  const send = async (txPromise) => (await txPromise).wait();

  const roles = [
    ["RTO_ROLE", rto, "Hyderabad RTO"],
    ["SERVICE_CENTER_ROLE", service, "Speedy Motors Service"],
    ["INSURER_ROLE", insurer, "SafeDrive Insurance"],
    ["BANK_ROLE", bank, "City Bank Auto Loans"],
    ["MANUFACTURER_ROLE", maker, "Maruti Dealer Hyderabad"],
  ];
  for (const [role, account, name] of roles) {
    await send(registry.grantRole(await registry[role](), account.address));
    await send(registry.setEntityName(account.address, name));
    console.log(`Granted ${role} to ${name} (${account.address})`);
  }

  const asRto = registry.connect(rto);
  const asService = registry.connect(service);
  const asInsurer = registry.connect(insurer);

  // Vehicle 1: two services, a minor accident, insurance and a completed sale from Owner A to Owner B.
  const car1 = vehicleSpec({ owner: ownerA.address });
  await send(asRto.registerVehicle(car1));
  await send(asService.addServiceRecord(car1.vin, 5000, "General Service", "First free service", 0, ""));
  await send(asService.addServiceRecord(car1.vin, 10000, "Oil Change", "Engine oil and filter", 3200, ""));
  const now = Math.floor(Date.now() / 1000);
  await send(asInsurer.addInsurancePolicy(car1.vin, "SD-2024-00117", now, now + 365 * 86400, ""));
  await send(asInsurer.addAccidentRecord(car1.vin, "Rear bumper dent in parking", "Minor", 12000, ""));
  await send(registry.connect(ownerA).initiateTransfer(car1.vin, ownerB.address));
  await send(registry.connect(ownerB).acceptTransfer(car1.vin));
  await send(asRto.approveTransfer(car1.vin));
  console.log(`Vehicle ${car1.vin}: 2 services, 1 accident, sold Owner A -> Owner B`);

  // Vehicle 2: owned by Owner A with an active bank loan (transfer is blocked until cleared).
  const car2 = vehicleSpec({
    vin: "MA3EWDE1S00123456",
    registrationNumber: "TS08CD5678",
    make: "Maruti Suzuki",
    model: "Swift",
    year: 2022,
    color: "Red",
    engineNumber: "K12N998877",
    owner: ownerA.address,
  });
  await send(asRto.registerVehicle(car2));
  await send(asService.addServiceRecord(car2.vin, 3000, "General Service", "First service", 0, ""));
  await send(registry.connect(bank).addLoan(car2.vin, 450000, ""));
  console.log(`Vehicle ${car2.vin}: active loan with City Bank`);

  // Vehicle 3: created by the dealer, number plate assigned by the RTO afterwards.
  const car3 = vehicleSpec({
    vin: "MAT612345KLM67890",
    registrationNumber: "",
    make: "Tata",
    model: "Nexon EV",
    year: 2024,
    color: "Blue",
    engineNumber: "EVM2024001",
    owner: ownerB.address,
  });
  await send(registry.connect(maker).manufactureVehicle(car3));
  await send(asRto.assignRegistrationNumber(car3.vin, "TS07EF9012"));
  console.log(`Vehicle ${car3.vin}: created by dealer, plate TS07EF9012 assigned by RTO`);

  console.log("\nSeed complete. Import these Hardhat accounts into MetaMask:");
  const labels = ["Admin", "RTO", "Service centre", "Insurer", "Bank", "Manufacturer", "Owner A", "Owner B"];
  [admin, rto, service, insurer, bank, maker, ownerA, ownerB].forEach((s, i) =>
    console.log(`  #${i} ${labels[i].padEnd(15)} ${s.address}`)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
