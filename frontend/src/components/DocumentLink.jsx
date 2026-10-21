import { useState } from "react";
import { storage, verifyDocument } from "../services/storage";

/**
 * Opens an IPFS document and lets anyone check that the file still hashes to the CID
 * stored on-chain (the "verification badge" for documents).
 */
export function DocumentLink({ cid, label = "Document" }) {
  const [check, setCheck] = useState({ state: "idle", message: "" });
  if (!cid) return null;

  const open = async () => {
    try {
      window.open(await storage.openUrl(cid), "_blank", "noopener");
    } catch (e) {
      setCheck({ state: "error", message: e.message });
    }
  };

  const verify = async () => {
    setCheck({ state: "checking", message: "Checking…" });
    try {
      const ok = await verifyDocument(cid);
      setCheck(ok ? { state: "ok", message: "File matches on-chain hash" } : { state: "bad", message: "File does NOT match" });
    } catch (e) {
      setCheck({ state: "error", message: e.message });
    }
  };

  return (
    <span className="doc-link">
      <button type="button" className="link" onClick={open}>
        📄 {label}
      </button>
      <button type="button" className="link small" onClick={verify} disabled={check.state === "checking"}>
        verify hash
      </button>
      {check.state !== "idle" && <span className={`badge badge-${check.state}`}>{check.message}</span>}
      <code className="cid" title={cid}>
        {cid.slice(0, 10)}…
      </code>
    </span>
  );
}
