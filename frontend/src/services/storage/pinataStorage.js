/**
 * Storage provider backed by Pinata (real IPFS pinning). Needs VITE_PINATA_JWT.
 * Implements the same { name, isPersistentIpfs, upload, fetchBytes, openUrl } shape as browserStorage.
 */
export function createPinataStorage({ jwt, gateway }) {
  const gatewayUrl = (cid) => `${gateway.replace(/\/?$/, "/")}${cid}`;

  return {
    name: "IPFS (Pinata)",
    isPersistentIpfs: true,

    async upload(file) {
      const body = new FormData();
      body.append("file", file);
      body.append("pinataMetadata", JSON.stringify({ name: file.name }));
      body.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body,
      });
      if (!response.ok) throw new Error(`Pinata upload failed (${response.status}): ${await response.text()}`);
      return (await response.json()).IpfsHash;
    },

    async fetchBytes(cid) {
      const response = await fetch(gatewayUrl(cid));
      if (!response.ok) throw new Error(`Could not fetch ${cid} from the IPFS gateway (${response.status}).`);
      return new Uint8Array(await response.arrayBuffer());
    },

    async openUrl(cid) {
      return gatewayUrl(cid);
    },
  };
}
