import { PINATA_GATEWAY, PINATA_JWT } from "../../config";
import { createPinataStorage } from "./pinataStorage";
import { createBrowserStorage } from "./browserStorage";
import { matchesCid } from "./cid";

/**
 * The app depends on this one storage object, never on Pinata or IndexedDB directly
 * (dependency inversion): swap providers by configuration only.
 */
export const storage = PINATA_JWT
  ? createPinataStorage({ jwt: PINATA_JWT, gateway: PINATA_GATEWAY })
  : createBrowserStorage();

/** Downloads the document and checks it still hashes to the CID stored on-chain. */
export async function verifyDocument(cid) {
  const bytes = await storage.fetchBytes(cid);
  return matchesCid(cid, bytes);
}
