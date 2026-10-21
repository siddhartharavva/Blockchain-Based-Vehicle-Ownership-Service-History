import { importer } from "ipfs-unixfs-importer";
import { MemoryBlockstore } from "blockstore-core/memory";
import { CID } from "multiformats/cid";

/**
 * Computes an IPFS CID for some bytes with the same settings as Kubo / Pinata
 * (the classic "unixfs-v0-2015" profile: 256 KiB chunks, balanced DAG, 174 links per node).
 * CIDv1 uses raw leaves (Pinata's default with cidVersion 1); CIDv0 ("Qm…") uses dag-pb leaves.
 */
export async function computeCid(bytes, version = 1) {
  const options = { profile: "unixfs-v0-2015", cidVersion: version, rawLeaves: version === 1 };
  let root = null;
  for await (const entry of importer([{ content: bytes }], new MemoryBlockstore(), options)) {
    root = entry.cid;
  }
  return root.toString();
}

/** True when the bytes hash to the given CID, i.e. the file is exactly what was recorded on-chain. */
export async function matchesCid(cidString, bytes) {
  const expected = CID.parse(cidString);
  const computed = CID.parse(await computeCid(bytes, expected.version));
  return computed.equals(expected);
}
