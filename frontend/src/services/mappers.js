/**
 * Convert ethers v6 `Result` structs into plain objects with JS-friendly types.
 * Each on-chain struct has exactly one mapper here.
 */
const num = (value) => Number(value);

export const toVehicle = (v) => ({
  vin: v.vin,
  registrationNumber: v.registrationNumber,
  make: v.make,
  model: v.model,
  year: num(v.year),
  color: v.color,
  engineNumber: v.engineNumber,
  currentOwner: v.currentOwner,
  lastOdometer: num(v.lastOdometer),
  documentCID: v.documentCID,
  isStolen: v.isStolen,
  registeredAt: num(v.registeredAt),
});

export const toOwnership = (r) => ({ owner: r.owner, fromTimestamp: num(r.fromTimestamp), toTimestamp: num(r.toTimestamp) });

export const toService = (r) => ({
  timestamp: num(r.timestamp),
  odometer: num(r.odometer),
  serviceType: r.serviceType,
  description: r.description,
  cost: num(r.cost),
  invoiceCID: r.invoiceCID,
  serviceCenter: r.serviceCenter,
});

export const toAccident = (r) => ({
  timestamp: num(r.timestamp),
  description: r.description,
  severity: r.severity,
  claimAmount: num(r.claimAmount),
  reportCID: r.reportCID,
  insurer: r.insurer,
});

export const toPolicy = (r) => ({
  timestamp: num(r.timestamp),
  policyNumber: r.policyNumber,
  validFrom: num(r.validFrom),
  validUntil: num(r.validUntil),
  policyCID: r.policyCID,
  insurer: r.insurer,
});

export const toLoan = (r) => ({
  lender: r.lender,
  amount: num(r.amount),
  documentCID: r.documentCID,
  startedAt: num(r.startedAt),
  clearedAt: num(r.clearedAt),
  active: r.active,
});

export const toTransferRequest = (r) => ({ from: r.from, to: r.to, buyerAccepted: r.buyerAccepted, active: r.active });

export const toPrivateDocument = (r) => ({ timestamp: num(r.timestamp), label: r.label, cid: r.cid, addedBy: r.addedBy });

/** Plain object -> VehicleSpec tuple expected by registerVehicle / manufactureVehicle. */
export const toVehicleSpec = (form) => ({
  vin: form.vin,
  registrationNumber: form.registrationNumber || "",
  make: form.make,
  model: form.model,
  year: Number(form.year),
  color: form.color,
  engineNumber: form.engineNumber,
  owner: form.owner,
  documentCID: form.documentCID || "",
});
