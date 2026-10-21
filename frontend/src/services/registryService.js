import { Contract } from "ethers";
import { DEPLOYMENT, REGISTRY_ABI } from "../config";
import { ROLES } from "../constants/roles";
import { normalizeRegNumber, normalizeVin, isValidVin } from "../utils/vin";
import {
  toAccident,
  toLoan,
  toOwnership,
  toPolicy,
  toPrivateDocument,
  toService,
  toTransferRequest,
  toVehicle,
  toVehicleSpec,
} from "./mappers";

/** Events that make up a vehicle's timeline (all are indexed by VIN). */
const HISTORY_EVENTS = [
  "VehicleRegistered",
  "RegistrationNumberAssigned",
  "OwnershipTransferred",
  "ServiceRecordAdded",
  "AccidentRecordAdded",
  "InsurancePolicyAdded",
  "LoanAdded",
  "LoanCleared",
  "StolenStatusChanged",
];

const EVENT_ONLY = new Set(["StolenStatusChanged", "RegistrationNumberAssigned"]);

/**
 * The only module that talks to the VehicleRegistry contract.
 * Reads use a JSON-RPC provider (no wallet needed); writes use the connected signer.
 */
export class RegistryService {
  #reader;
  #writer;
  #nameCache = new Map();

  constructor(readProvider, signer = null) {
    if (!DEPLOYMENT) throw new Error("Contract is not deployed on the configured chain. Run scripts/deploy.js.");
    this.address = DEPLOYMENT.VehicleRegistry;
    this.nftAddress = DEPLOYMENT.VehicleNFT;
    this.deployBlock = DEPLOYMENT.deployBlock || 0;
    this.#reader = new Contract(this.address, REGISTRY_ABI, readProvider);
    this.#writer = signer ? new Contract(this.address, REGISTRY_ABI, signer) : null;
  }

  /** Same service, now able to sign transactions. */
  withSigner(signer) {
    const service = new RegistryService(this.#reader.runner, signer);
    service.#nameCache = this.#nameCache;
    return service;
  }

  get canWrite() {
    return this.#writer !== null;
  }

  get contract() {
    return this.#reader;
  }

  // ------------------------------------------------------------------ reads

  async vehicleExists(vin) {
    return this.#reader.vehicleExistsByVin(normalizeVin(vin));
  }

  async getVehicle(vin) {
    return toVehicle(await this.#reader.getVehicle(normalizeVin(vin)));
  }

  /** Accepts a VIN or a number plate and returns the VIN, or null if nothing matches. */
  async resolveVin(query) {
    const vin = normalizeVin(query);
    if (isValidVin(vin) && (await this.vehicleExists(vin))) return vin;
    const byPlate = await this.#reader.getVinByRegNumber(normalizeRegNumber(query));
    return byPlate || null;
  }

  async getVehicleRecords(vin) {
    const id = normalizeVin(vin);
    const c = this.#reader;
    const [vehicle, owners, services, accidents, policies, loans, transfer] = await Promise.all([
      c.getVehicle(id),
      c.getOwnershipHistory(id),
      c.getServiceHistory(id),
      c.getAccidentHistory(id),
      c.getInsurancePolicies(id),
      c.getLoanHistory(id),
      c.getTransferRequest(id),
    ]);
    return {
      vehicle: toVehicle(vehicle),
      owners: owners.map(toOwnership),
      services: services.map(toService),
      accidents: accidents.map(toAccident),
      policies: policies.map(toPolicy),
      loans: loans.map(toLoan),
      transfer: toTransferRequest(transfer),
    };
  }

  /**
   * Event logs for a vehicle, grouped by event name, oldest first. Used to attach transaction
   * hashes to records. Best effort: some public RPCs limit log queries, so failures return {}.
   */
  async getVehicleEvents(vin) {
    const id = normalizeVin(vin);
    try {
      const groups = await Promise.all(
        HISTORY_EVENTS.map((name) => this.#reader.queryFilter(this.#reader.filters[name](id), this.deployBlock))
      );
      const plain = await Promise.all(groups.map((logs, i) => Promise.all(logs.map((log) => this.#toPlainLog(HISTORY_EVENTS[i], log)))));
      const byName = Object.fromEntries(HISTORY_EVENTS.map((name, i) => [name, plain[i]]));
      return byName;
    } catch (error) {
      console.warn("Could not load event logs; showing records without transaction links.", error);
      return {};
    }
  }

  async getVehicleHistory(vin) {
    const [records, events] = await Promise.all([this.getVehicleRecords(vin), this.getVehicleEvents(vin)]);
    return { ...records, events };
  }

  async getVehiclesByOwner(address) {
    return [...(await this.#reader.getVehiclesByOwner(address))];
  }

  async getVehicles(vins) {
    return Promise.all(vins.map((vin) => this.getVehicle(vin)));
  }

  async getAllVehicles() {
    return this.getVehicles([...(await this.#reader.getAllVins())]);
  }

  async getPendingTransfers() {
    const vins = [...(await this.#reader.getPendingTransferVins())];
    const requests = await Promise.all(vins.map((vin) => this.#reader.getTransferRequest(vin)));
    return vins.map((vin, i) => ({ vin, ...toTransferRequest(requests[i]) }));
  }

  /** Role keys (from constants/roles) held by an address. */
  async getRoles(address) {
    const flags = await Promise.all(ROLES.map((role) => this.#reader.hasRole(role.hash, address)));
    return ROLES.filter((_, i) => flags[i]).map((role) => role.key);
  }

  async getRoleMembers(roleHash) {
    return [...(await this.#reader.getRoleMembers(roleHash))];
  }

  /** Organisation display name, cached per address for the session. */
  async getEntityName(address) {
    const key = address.toLowerCase();
    if (!this.#nameCache.has(key)) this.#nameCache.set(key, this.#reader.getEntityName(address));
    return this.#nameCache.get(key);
  }

  clearNameCache() {
    this.#nameCache.clear();
  }

  async canViewPrivateDocuments(vin, viewer) {
    return this.#reader.canViewPrivateDocuments(normalizeVin(vin), viewer);
  }

  async getDocumentAccessExpiry(vin, viewer) {
    return Number(await this.#reader.getDocumentAccessExpiry(normalizeVin(vin), viewer));
  }

  /** Gated by msg.sender, so it must be called from the connected wallet. */
  async getPrivateDocuments(vin) {
    const docs = await this.#requireWriter().getPrivateDocuments(normalizeVin(vin));
    return docs.map(toPrivateDocument);
  }

  // ------------------------------------------------------------------ writes (return a TransactionResponse)

  grantRole = (roleHash, account) => this.#requireWriter().grantRole(roleHash, account);
  revokeRole = (roleHash, account) => this.#requireWriter().revokeRole(roleHash, account);
  setEntityName = (account, name) => this.#requireWriter().setEntityName(account, name);

  registerVehicle = (form) => this.#requireWriter().registerVehicle(toVehicleSpec(form));
  manufactureVehicle = (form) => this.#requireWriter().manufactureVehicle(toVehicleSpec({ ...form, registrationNumber: "" }));
  assignRegistrationNumber = (vin, regNo) => this.#requireWriter().assignRegistrationNumber(vin, normalizeRegNumber(regNo));
  setStolenStatus = (vin, stolen) => this.#requireWriter().setStolenStatus(vin, stolen);

  initiateTransfer = (vin, to) => this.#requireWriter().initiateTransfer(vin, to);
  acceptTransfer = (vin) => this.#requireWriter().acceptTransfer(vin);
  approveTransfer = (vin) => this.#requireWriter().approveTransfer(vin);
  cancelTransfer = (vin) => this.#requireWriter().cancelTransfer(vin);

  addServiceRecord = (vin, r) =>
    this.#requireWriter().addServiceRecord(vin, r.odometer, r.serviceType, r.description, r.cost, r.invoiceCID || "");
  addAccidentRecord = (vin, r) =>
    this.#requireWriter().addAccidentRecord(vin, r.description, r.severity, r.claimAmount, r.reportCID || "");
  addInsurancePolicy = (vin, p) =>
    this.#requireWriter().addInsurancePolicy(vin, p.policyNumber, p.validFrom, p.validUntil, p.policyCID || "");

  addLoan = (vin, amount, documentCID) => this.#requireWriter().addLoan(vin, amount, documentCID || "");
  clearLoan = (vin) => this.#requireWriter().clearLoan(vin);

  addPrivateDocument = (vin, label, cid) => this.#requireWriter().addPrivateDocument(vin, label, cid);
  grantDocumentAccess = (vin, viewer, seconds) => this.#requireWriter().grantDocumentAccess(vin, viewer, seconds);
  revokeDocumentAccess = (vin, viewer) => this.#requireWriter().revokeDocumentAccess(vin, viewer);

  /** Events with no matching struct need the block time; the rest take it from their record. */
  async #toPlainLog(name, log) {
    const needsTime = EVENT_ONLY.has(name);
    const timestamp = needsTime ? (await log.getBlock()).timestamp : null;
    return { txHash: log.transactionHash, blockNumber: log.blockNumber, args: log.args, timestamp };
  }

  #requireWriter() {
    if (!this.#writer) throw new Error("Connect your wallet first.");
    return this.#writer;
  }
}
