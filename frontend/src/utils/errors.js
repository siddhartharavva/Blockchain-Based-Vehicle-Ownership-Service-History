import { Interface } from "ethers";
import { REGISTRY_ABI } from "../config";

const registryInterface = new Interface(REGISTRY_ABI);

/** Human messages for each custom error in the contracts. */
const MESSAGES = {
  AccessControlUnauthorizedAccount: "Your wallet does not have the role needed for this action.",
  InvalidVinLength: "VIN must be exactly 17 characters.",
  VehicleAlreadyExists: "A vehicle with this VIN is already registered.",
  VehicleNotFound: "No vehicle is registered with this VIN.",
  RegistrationNumberTaken: "This registration number is already used by another vehicle.",
  RegistrationNumberRequired: "A registration number is required.",
  RegistrationNumberAlreadyAssigned: "This vehicle already has a registration number (or a dealer cannot set one).",
  OdometerRollback: "Odometer cannot be lower than the previous reading (rollback detected).",
  VehicleIsStolen: "This vehicle is flagged as stolen, so it cannot be transferred.",
  NotVehicleOwner: "Only the current owner can do this.",
  InvalidBuyer: "Enter a valid buyer address that is not your own.",
  TransferAlreadyPending: "A transfer is already pending for this vehicle.",
  NoPendingTransfer: "There is no pending transfer for this vehicle.",
  NotBuyer: "Only the buyer named in the transfer can accept it.",
  BuyerHasNotAccepted: "The buyer has not accepted this transfer yet.",
  NotTransferParty: "Only the seller or the buyer can cancel this transfer.",
  InvalidPolicyPeriod: "Policy end date must be after the start date.",
  ActiveLoanExists: "This vehicle has an active loan, so it cannot be transferred or given another loan.",
  NoActiveLoan: "This vehicle has no active loan.",
  NotLender: "Only the bank that recorded the loan can clear it.",
  InvalidDuration: "Access duration must be greater than zero.",
  AccessDenied: "You do not have access to these private documents.",
  ZeroAddress: "The zero address is not allowed.",
};

/** Finds revert data anywhere in the nested error objects ethers / MetaMask produce. */
function findRevertData(error) {
  const queue = [error];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (typeof current.data === "string" && current.data.startsWith("0x") && current.data.length >= 10) {
      return current.data;
    }
    queue.push(current.error, current.info, current.data, current.cause);
  }
  return null;
}

/** Turns any wallet / contract error into one readable sentence. */
export function friendlyError(error) {
  if (!error) return "";
  if (error.code === "ACTION_REJECTED" || error.code === 4001) return "You rejected the request in MetaMask.";

  let name = error.revert?.name;
  if (!name) {
    const data = findRevertData(error);
    if (data) {
      try {
        name = registryInterface.parseError(data)?.name;
      } catch {
        name = null;
      }
    }
  }
  if (name && MESSAGES[name]) return MESSAGES[name];
  if (name) return `Transaction reverted: ${name}`;
  return error.shortMessage || error.reason || error.message || "Something went wrong.";
}
