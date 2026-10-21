const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployRegistry, vehicleSpec } = require("../scripts/lib/deployRegistry");

const VIN = "1HGCM82633A004352";
const VIN2 = "WVWZZZ1JZXW000001";
const DAY = 24 * 60 * 60;

describe("VehicleRegistry", function () {
  async function deployFixture() {
    const [admin, rto, service, insurer, bank, maker, ownerA, ownerB, stranger] = await ethers.getSigners();
    const { registry, nft } = await deployRegistry(ethers, admin);
    await registry.grantRole(await registry.RTO_ROLE(), rto.address);
    await registry.grantRole(await registry.SERVICE_CENTER_ROLE(), service.address);
    await registry.grantRole(await registry.INSURER_ROLE(), insurer.address);
    await registry.grantRole(await registry.BANK_ROLE(), bank.address);
    await registry.grantRole(await registry.MANUFACTURER_ROLE(), maker.address);
    return { registry, nft, admin, rto, service, insurer, bank, maker, ownerA, ownerB, stranger };
  }

  async function registeredFixture() {
    const ctx = await deployFixture();
    await ctx.registry.connect(ctx.rto).registerVehicle(vehicleSpec({ owner: ctx.ownerA.address }));
    return ctx;
  }

  async function transferReady(ctx) {
    await ctx.registry.connect(ctx.ownerA).initiateTransfer(VIN, ctx.ownerB.address);
    await ctx.registry.connect(ctx.ownerB).acceptTransfer(VIN);
  }

  describe("Roles (README tests 1, 2, 16)", function () {
    it("1. deployer has the admin role", async function () {
      const { registry, admin } = await loadFixture(deployFixture);
      expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    });

    it("2. admin grants the RTO role and the RTO can register", async function () {
      const { registry, rto, ownerA } = await loadFixture(deployFixture);
      expect(await registry.hasRole(await registry.RTO_ROLE(), rto.address)).to.equal(true);
      await expect(registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address }))).to.emit(
        registry,
        "VehicleRegistered"
      );
    });

    it("non-admin cannot grant roles", async function () {
      const { registry, stranger } = await loadFixture(deployFixture);
      await expect(
        registry.connect(stranger).grantRole(await registry.RTO_ROLE(), stranger.address)
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("lists role holders", async function () {
      const { registry, service } = await loadFixture(deployFixture);
      expect(await registry.getRoleMembers(await registry.SERVICE_CENTER_ROLE())).to.deep.equal([service.address]);
    });

    it("admin sets organisation names; others cannot", async function () {
      const { registry, service, stranger } = await loadFixture(deployFixture);
      await expect(registry.setEntityName(service.address, "Speedy Motors"))
        .to.emit(registry, "EntityNameSet")
        .withArgs(service.address, "Speedy Motors");
      expect(await registry.getEntityName(service.address)).to.equal("Speedy Motors");
      await expect(
        registry.connect(stranger).setEntityName(stranger.address, "Fake")
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
      await expect(registry.setEntityName(ethers.ZeroAddress, "x")).to.be.revertedWithCustomError(
        registry,
        "ZeroAddress"
      );
    });

    it("16. revoked service centre cannot add records", async function () {
      const { registry, service } = await loadFixture(registeredFixture);
      await registry.revokeRole(await registry.SERVICE_CENTER_ROLE(), service.address);
      await expect(
        registry.connect(service).addServiceRecord(VIN, 1000, "General Service", "", 0, "")
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Registration (README tests 3 to 6)", function () {
    it("3. non-RTO cannot register", async function () {
      const { registry, stranger, ownerA } = await loadFixture(deployFixture);
      await expect(
        registry.connect(stranger).registerVehicle(vehicleSpec({ owner: ownerA.address }))
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("4. stores the vehicle, emits the event and starts ownership history", async function () {
      const { registry, nft, rto, ownerA } = await loadFixture(deployFixture);
      await expect(registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address, documentCID: "bafyRC" })))
        .to.emit(registry, "VehicleRegistered")
        .withArgs(VIN, ownerA.address, rto.address);

      const vehicle = await registry.getVehicle(VIN);
      expect(vehicle.currentOwner).to.equal(ownerA.address);
      expect(vehicle.registrationNumber).to.equal("TS09AB1234");
      expect(vehicle.documentCID).to.equal("bafyRC");
      expect(vehicle.exists).to.equal(true);
      expect(await registry.getOwnershipHistory(VIN)).to.have.lengthOf(1);
      expect(await registry.getVehiclesByOwner(ownerA.address)).to.deep.equal([VIN]);
      expect(await registry.getVinByRegNumber("TS09AB1234")).to.equal(VIN);
      expect(await registry.getAllVins()).to.deep.equal([VIN]);
      expect(await registry.getVehicleCount()).to.equal(1n);
      expect(await nft.ownerOf(await registry.tokenIdOf(VIN))).to.equal(ownerA.address);
    });

    it("5. rejects a duplicate VIN", async function () {
      const { registry, rto, ownerA } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address, registrationNumber: "TS09ZZ0001" }))
      ).to.be.revertedWithCustomError(registry, "VehicleAlreadyExists");
    });

    it("rejects a duplicate registration number", async function () {
      const { registry, rto, ownerA } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address, vin: VIN2 }))
      ).to.be.revertedWithCustomError(registry, "RegistrationNumberTaken");
    });

    it("6. rejects a VIN that is not 17 characters", async function () {
      const { registry, rto, ownerA } = await loadFixture(deployFixture);
      await expect(registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address, vin: "SHORTVIN" })))
        .to.be.revertedWithCustomError(registry, "InvalidVinLength")
        .withArgs(8);
    });

    it("rejects a zero owner address and an empty registration number", async function () {
      const { registry, rto, ownerA } = await loadFixture(deployFixture);
      await expect(
        registry.connect(rto).registerVehicle(vehicleSpec({ owner: ethers.ZeroAddress }))
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
      await expect(
        registry.connect(rto).registerVehicle(vehicleSpec({ owner: ownerA.address, registrationNumber: "" }))
      ).to.be.revertedWithCustomError(registry, "RegistrationNumberRequired");
    });

    it("getVehicle reverts for an unknown VIN", async function () {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.getVehicle(VIN)).to.be.revertedWithCustomError(registry, "VehicleNotFound");
      expect(await registry.vehicleExistsByVin(VIN)).to.equal(false);
    });
  });

  describe("Manufacturer flow", function () {
    it("manufacturer creates the record and the RTO assigns the number plate", async function () {
      const { registry, maker, rto, ownerA } = await loadFixture(deployFixture);
      await registry.connect(maker).manufactureVehicle(vehicleSpec({ owner: ownerA.address, registrationNumber: "" }));
      expect((await registry.getVehicle(VIN)).registrationNumber).to.equal("");

      await expect(registry.connect(rto).assignRegistrationNumber(VIN, "TS09AB1234"))
        .to.emit(registry, "RegistrationNumberAssigned")
        .withArgs(VIN, "TS09AB1234", rto.address);
      expect(await registry.getVinByRegNumber("TS09AB1234")).to.equal(VIN);
      await expect(
        registry.connect(rto).assignRegistrationNumber(VIN, "TS09AB9999")
      ).to.be.revertedWithCustomError(registry, "RegistrationNumberAlreadyAssigned");
    });

    it("manufacturer cannot set a number plate itself; RTO must supply one", async function () {
      const { registry, maker, rto, ownerA } = await loadFixture(deployFixture);
      await expect(
        registry.connect(maker).manufactureVehicle(vehicleSpec({ owner: ownerA.address }))
      ).to.be.revertedWithCustomError(registry, "RegistrationNumberAlreadyAssigned");
      await registry.connect(maker).manufactureVehicle(vehicleSpec({ owner: ownerA.address, registrationNumber: "" }));
      await expect(registry.connect(rto).assignRegistrationNumber(VIN, "")).to.be.revertedWithCustomError(
        registry,
        "RegistrationNumberRequired"
      );
    });
  });

  describe("Ownership transfer (README tests 7 to 11)", function () {
    it("7. non-owner cannot initiate a transfer", async function () {
      const { registry, stranger, ownerB } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(stranger).initiateTransfer(VIN, ownerB.address)
      ).to.be.revertedWithCustomError(registry, "NotVehicleOwner");
    });

    it("rejects transferring to yourself or the zero address", async function () {
      const { registry, ownerA } = await loadFixture(registeredFixture);
      await expect(registry.connect(ownerA).initiateTransfer(VIN, ownerA.address)).to.be.revertedWithCustomError(
        registry,
        "InvalidBuyer"
      );
      await expect(
        registry.connect(ownerA).initiateTransfer(VIN, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidBuyer");
    });

    it("8. full transfer: initiate -> accept -> approve", async function () {
      const ctx = await loadFixture(registeredFixture);
      const { registry, nft, rto, ownerA, ownerB } = ctx;
      await expect(registry.connect(ownerA).initiateTransfer(VIN, ownerB.address))
        .to.emit(registry, "TransferInitiated")
        .withArgs(VIN, ownerA.address, ownerB.address);
      expect(await registry.getPendingTransferVins()).to.deep.equal([VIN]);
      await expect(registry.connect(ownerB).acceptTransfer(VIN))
        .to.emit(registry, "TransferAccepted")
        .withArgs(VIN, ownerB.address);
      await expect(registry.connect(rto).approveTransfer(VIN))
        .to.emit(registry, "OwnershipTransferred")
        .withArgs(VIN, ownerA.address, ownerB.address);

      expect((await registry.getVehicle(VIN)).currentOwner).to.equal(ownerB.address);
      const history = await registry.getOwnershipHistory(VIN);
      expect(history).to.have.lengthOf(2);
      expect(history[0].toTimestamp).to.be.greaterThan(0n);
      expect(history[1].owner).to.equal(ownerB.address);
      expect(history[1].toTimestamp).to.equal(0n);
      expect(await registry.getVehiclesByOwner(ownerA.address)).to.deep.equal([]);
      expect(await registry.getVehiclesByOwner(ownerB.address)).to.deep.equal([VIN]);
      expect(await registry.getPendingTransferVins()).to.deep.equal([]);
      expect(await nft.ownerOf(await registry.tokenIdOf(VIN))).to.equal(ownerB.address);
    });

    it("keeps the owner's vehicle list correct when one of several vehicles is sold", async function () {
      const ctx = await loadFixture(registeredFixture);
      const { registry, rto, ownerA, ownerB } = ctx;
      await registry
        .connect(rto)
        .registerVehicle(vehicleSpec({ owner: ownerA.address, vin: VIN2, registrationNumber: "TS09CD5678" }));
      await transferReady(ctx);
      await registry.connect(rto).approveTransfer(VIN);
      expect(await registry.getVehiclesByOwner(ownerA.address)).to.deep.equal([VIN2]);
    });

    it("9. RTO cannot approve before the buyer accepts", async function () {
      const { registry, rto, ownerA, ownerB } = await loadFixture(registeredFixture);
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await expect(registry.connect(rto).approveTransfer(VIN)).to.be.revertedWithCustomError(
        registry,
        "BuyerHasNotAccepted"
      );
    });

    it("only the named buyer can accept and only the RTO can approve", async function () {
      const ctx = await loadFixture(registeredFixture);
      const { registry, ownerA, ownerB, stranger } = ctx;
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await expect(registry.connect(stranger).acceptTransfer(VIN)).to.be.revertedWithCustomError(registry, "NotBuyer");
      await registry.connect(ownerB).acceptTransfer(VIN);
      await expect(registry.connect(ownerA).approveTransfer(VIN)).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("rejects a second request while one is pending, and calls with nothing pending", async function () {
      const { registry, rto, ownerA, ownerB, stranger } = await loadFixture(registeredFixture);
      await expect(registry.connect(ownerB).acceptTransfer(VIN)).to.be.revertedWithCustomError(
        registry,
        "NoPendingTransfer"
      );
      await expect(registry.connect(rto).approveTransfer(VIN)).to.be.revertedWithCustomError(
        registry,
        "NoPendingTransfer"
      );
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await expect(
        registry.connect(ownerA).initiateTransfer(VIN, stranger.address)
      ).to.be.revertedWithCustomError(registry, "TransferAlreadyPending");
    });

    it("10. blocks transfers while the vehicle is flagged stolen", async function () {
      const { registry, rto, ownerA, ownerB } = await loadFixture(registeredFixture);
      await expect(registry.connect(rto).setStolenStatus(VIN, true))
        .to.emit(registry, "StolenStatusChanged")
        .withArgs(VIN, true);
      await expect(
        registry.connect(ownerA).initiateTransfer(VIN, ownerB.address)
      ).to.be.revertedWithCustomError(registry, "VehicleIsStolen");

      await registry.connect(rto).setStolenStatus(VIN, false);
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
    });

    it("blocks approval if the vehicle is flagged stolen after the request", async function () {
      const ctx = await loadFixture(registeredFixture);
      await transferReady(ctx);
      await ctx.registry.connect(ctx.rto).setStolenStatus(VIN, true);
      await expect(ctx.registry.connect(ctx.rto).approveTransfer(VIN)).to.be.revertedWithCustomError(
        ctx.registry,
        "VehicleIsStolen"
      );
    });

    it("only the RTO can flag a vehicle stolen", async function () {
      const { registry, ownerA } = await loadFixture(registeredFixture);
      await expect(registry.connect(ownerA).setStolenStatus(VIN, true)).to.be.revertedWithCustomError(
        registry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("11. owner or buyer can cancel a pending transfer; others cannot", async function () {
      const { registry, ownerA, ownerB, stranger } = await loadFixture(registeredFixture);
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await expect(registry.connect(stranger).cancelTransfer(VIN)).to.be.revertedWithCustomError(
        registry,
        "NotTransferParty"
      );
      await expect(registry.connect(ownerB).cancelTransfer(VIN)).to.emit(registry, "TransferCancelled").withArgs(VIN);
      expect((await registry.getTransferRequest(VIN)).active).to.equal(false);
      expect(await registry.getPendingTransferVins()).to.deep.equal([]);

      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await registry.connect(ownerA).cancelTransfer(VIN);
    });

    it("keeps the pending list correct when a middle request closes", async function () {
      const ctx = await loadFixture(registeredFixture);
      const { registry, rto, ownerA, ownerB } = ctx;
      await registry
        .connect(rto)
        .registerVehicle(vehicleSpec({ owner: ownerA.address, vin: VIN2, registrationNumber: "TS09CD5678" }));
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
      await registry.connect(ownerA).initiateTransfer(VIN2, ownerB.address);
      await registry.connect(ownerA).cancelTransfer(VIN);
      expect(await registry.getPendingTransferVins()).to.deep.equal([VIN2]);
    });
  });

  describe("Title NFT", function () {
    it("cannot be moved outside the registry flow", async function () {
      const { registry, nft, ownerA, ownerB } = await loadFixture(registeredFixture);
      const tokenId = await registry.tokenIdOf(VIN);
      await expect(
        nft.connect(ownerA).transferFrom(ownerA.address, ownerB.address, tokenId)
      ).to.be.revertedWithCustomError(nft, "TransferOnlyViaRegistry");
      await expect(nft.connect(ownerA).mint(ownerA.address, 1, "x")).to.be.revertedWithCustomError(
        nft,
        "NotRegistry"
      );
    });

    it("registry can be set only once and tokenURI points at the VIN", async function () {
      const { registry, nft, admin } = await loadFixture(registeredFixture);
      await expect(nft.setRegistry(admin.address)).to.be.revertedWithCustomError(nft, "RegistryAlreadySet");
      await nft.setBaseURI("http://localhost:5173/vehicle/");
      expect(await nft.tokenURI(await registry.tokenIdOf(VIN))).to.equal(`http://localhost:5173/vehicle/${VIN}`);
      expect(await nft.vinOf(await registry.tokenIdOf(VIN))).to.equal(VIN);
    });
  });

  describe("Service records (README tests 12 to 14)", function () {
    it("12. service centre adds a record and lastOdometer updates", async function () {
      const { registry, service } = await loadFixture(registeredFixture);
      await expect(registry.connect(service).addServiceRecord(VIN, 5000, "General Service", "First service", 2500, "bafyInv"))
        .to.emit(registry, "ServiceRecordAdded")
        .withArgs(VIN, service.address, 5000);
      const records = await registry.getServiceHistory(VIN);
      expect(records).to.have.lengthOf(1);
      expect(records[0].serviceCenter).to.equal(service.address);
      expect(records[0].invoiceCID).to.equal("bafyInv");
      expect((await registry.getVehicle(VIN)).lastOdometer).to.equal(5000n);
    });

    it("13. rejects a lower odometer reading (rollback)", async function () {
      const { registry, service } = await loadFixture(registeredFixture);
      await registry.connect(service).addServiceRecord(VIN, 10000, "General Service", "", 0, "");
      await expect(registry.connect(service).addServiceRecord(VIN, 8000, "Repair", "", 0, ""))
        .to.be.revertedWithCustomError(registry, "OdometerRollback")
        .withArgs(10000, 8000);
      await registry.connect(service).addServiceRecord(VIN, 10000, "Correction", "Same reading is allowed", 0, "");
    });

    it("14. non-service-centre cannot add a service record", async function () {
      const { registry, insurer } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(insurer).addServiceRecord(VIN, 1000, "General Service", "", 0, "")
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("rejects a record for an unknown vehicle", async function () {
      const { registry, service } = await loadFixture(deployFixture);
      await expect(
        registry.connect(service).addServiceRecord(VIN, 1000, "General Service", "", 0, "")
      ).to.be.revertedWithCustomError(registry, "VehicleNotFound");
    });
  });

  describe("Insurance (README test 15)", function () {
    it("15. insurer adds an accident record", async function () {
      const { registry, insurer } = await loadFixture(registeredFixture);
      await expect(registry.connect(insurer).addAccidentRecord(VIN, "Rear bumper damage", "Minor", 15000, "bafyRep"))
        .to.emit(registry, "AccidentRecordAdded")
        .withArgs(VIN, insurer.address, "Minor");
      const records = await registry.getAccidentHistory(VIN);
      expect(records).to.have.lengthOf(1);
      expect(records[0].claimAmount).to.equal(15000n);
      expect(records[0].insurer).to.equal(insurer.address);
    });

    it("non-insurer cannot add accident records", async function () {
      const { registry, service } = await loadFixture(registeredFixture);
      await expect(
        registry.connect(service).addAccidentRecord(VIN, "x", "Minor", 0, "")
      ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });

    it("insurer adds a policy; invalid periods are rejected", async function () {
      const { registry, insurer } = await loadFixture(registeredFixture);
      const now = BigInt(await time.latest());
      await expect(registry.connect(insurer).addInsurancePolicy(VIN, "POL-1", now, now + 365n * BigInt(DAY), ""))
        .to.emit(registry, "InsurancePolicyAdded")
        .withArgs(VIN, insurer.address, "POL-1");
      expect(await registry.getInsurancePolicies(VIN)).to.have.lengthOf(1);
      await expect(
        registry.connect(insurer).addInsurancePolicy(VIN, "POL-2", now, now, "")
      ).to.be.revertedWithCustomError(registry, "InvalidPolicyPeriod");
    });
  });

  describe("Loans / hypothecation", function () {
    it("an active loan blocks transfer until the bank clears it", async function () {
      const { registry, bank, ownerA, ownerB } = await loadFixture(registeredFixture);
      await expect(registry.connect(bank).addLoan(VIN, 500000, "bafyLoan"))
        .to.emit(registry, "LoanAdded")
        .withArgs(VIN, bank.address, 500000);
      expect(await registry.hasActiveLoan(VIN)).to.equal(true);
      await expect(
        registry.connect(ownerA).initiateTransfer(VIN, ownerB.address)
      ).to.be.revertedWithCustomError(registry, "ActiveLoanExists");

      await expect(registry.connect(bank).clearLoan(VIN)).to.emit(registry, "LoanCleared").withArgs(VIN, bank.address);
      expect(await registry.hasActiveLoan(VIN)).to.equal(false);
      const loans = await registry.getLoanHistory(VIN);
      expect(loans[0].clearedAt).to.be.greaterThan(0n);
      await registry.connect(ownerA).initiateTransfer(VIN, ownerB.address);
    });

    it("blocks approval if a loan is added after the request", async function () {
      const ctx = await loadFixture(registeredFixture);
      await transferReady(ctx);
      await ctx.registry.connect(ctx.bank).addLoan(VIN, 1, "");
      await expect(ctx.registry.connect(ctx.rto).approveTransfer(VIN)).to.be.revertedWithCustomError(
        ctx.registry,
        "ActiveLoanExists"
      );
    });

    it("rejects a second active loan, clearing with none, and clearing by another bank", async function () {
      const { registry, admin, bank, stranger } = await loadFixture(registeredFixture);
      await expect(registry.connect(bank).clearLoan(VIN)).to.be.revertedWithCustomError(registry, "NoActiveLoan");
      await registry.connect(bank).addLoan(VIN, 1, "");
      await expect(registry.connect(bank).addLoan(VIN, 1, "")).to.be.revertedWithCustomError(
        registry,
        "ActiveLoanExists"
      );
      await registry.connect(admin).grantRole(await registry.BANK_ROLE(), stranger.address);
      await expect(registry.connect(stranger).clearLoan(VIN)).to.be.revertedWithCustomError(registry, "NotLender");
    });
  });

  describe("Time-limited document access", function () {
    it("owner shares private documents with a buyer until the grant expires", async function () {
      const { registry, ownerA, ownerB, rto, stranger } = await loadFixture(registeredFixture);
      await expect(registry.connect(ownerA).addPrivateDocument(VIN, "Insurance copy", "bafyPriv"))
        .to.emit(registry, "PrivateDocumentAdded")
        .withArgs(VIN, ownerA.address, "Insurance copy");

      expect(await registry.connect(ownerA).getPrivateDocuments(VIN)).to.have.lengthOf(1);
      expect(await registry.connect(rto).getPrivateDocuments(VIN)).to.have.lengthOf(1);
      await expect(registry.connect(ownerB).getPrivateDocuments(VIN)).to.be.revertedWithCustomError(
        registry,
        "AccessDenied"
      );

      await expect(registry.connect(ownerA).grantDocumentAccess(VIN, ownerB.address, DAY)).to.emit(
        registry,
        "DocumentAccessGranted"
      );
      expect(await registry.connect(ownerB).getPrivateDocuments(VIN)).to.have.lengthOf(1);
      expect(await registry.getDocumentAccessExpiry(VIN, ownerB.address)).to.be.greaterThan(0n);

      await time.increase(DAY + 1);
      expect(await registry.canViewPrivateDocuments(VIN, ownerB.address)).to.equal(false);
      await expect(registry.connect(stranger).addPrivateDocument(VIN, "x", "y")).to.be.revertedWithCustomError(
        registry,
        "NotVehicleOwner"
      );
    });

    it("owner can revoke access; grants lapse when the vehicle is sold", async function () {
      const ctx = await loadFixture(registeredFixture);
      const { registry, ownerA, ownerB, stranger, rto } = ctx;
      await registry.connect(ownerA).grantDocumentAccess(VIN, stranger.address, DAY);
      await expect(registry.connect(ownerA).revokeDocumentAccess(VIN, stranger.address)).to.emit(
        registry,
        "DocumentAccessRevoked"
      );
      expect(await registry.canViewPrivateDocuments(VIN, stranger.address)).to.equal(false);

      await registry.connect(ownerA).grantDocumentAccess(VIN, stranger.address, DAY);
      await transferReady(ctx);
      await registry.connect(rto).approveTransfer(VIN);
      expect(await registry.canViewPrivateDocuments(VIN, stranger.address)).to.equal(false);
      expect(await registry.canViewPrivateDocuments(VIN, ownerB.address)).to.equal(true);
    });

    it("rejects zero duration and zero viewer", async function () {
      const { registry, ownerA, ownerB } = await loadFixture(registeredFixture);
      await expect(registry.connect(ownerA).grantDocumentAccess(VIN, ownerB.address, 0)).to.be.revertedWithCustomError(
        registry,
        "InvalidDuration"
      );
      await expect(
        registry.connect(ownerA).grantDocumentAccess(VIN, ethers.ZeroAddress, DAY)
      ).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });
  });

  describe("Public reads (README test 17)", function () {
    it("17. read functions work without a wallet", async function () {
      const { registry, service, insurer } = await loadFixture(registeredFixture);
      await registry.connect(service).addServiceRecord(VIN, 5000, "General Service", "", 2500, "");
      await registry.connect(insurer).addAccidentRecord(VIN, "Scratch", "Minor", 0, "");

      const readOnly = registry.connect(ethers.provider); // provider only, no signer
      expect((await readOnly.getVehicle(VIN)).vin).to.equal(VIN);
      expect(await readOnly.getOwnershipHistory(VIN)).to.have.lengthOf(1);
      expect(await readOnly.getServiceHistory(VIN)).to.have.lengthOf(1);
      expect(await readOnly.getAccidentHistory(VIN)).to.have.lengthOf(1);
      expect(await readOnly.getVinByRegNumber("TS09AB1234")).to.equal(VIN);
    });
  });

  describe("Append-only guarantee", function () {
    it("exposes no function that edits or deletes a history record", async function () {
      const { registry } = await loadFixture(deployFixture);
      const names = registry.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
      const mutators = names.filter((n) => /^(update|edit|delete|remove)/i.test(n));
      expect(mutators).to.deep.equal([]);
    });
  });
});
