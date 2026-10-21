import { useState } from "react";
import { storage } from "../services/storage";

/** Uploads a file to IPFS (or the local fallback) and reports the CID through onUploaded. */
export function FileUpload({ label = "Document", cid, onUploaded }) {
  const [state, setState] = useState({ busy: false, error: "" });

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setState({ busy: true, error: "" });
    try {
      onUploaded(await storage.upload(file));
      setState({ busy: false, error: "" });
    } catch (e) {
      setState({ busy: false, error: e.message });
    }
  };

  return (
    <div className="field">
      <span className="field-label">{label} (optional)</span>
      <input type="file" onChange={handleChange} disabled={state.busy} />
      <span className="field-hint">
        {state.busy ? "Uploading…" : cid ? `Stored with CID ${cid}` : `Stored on: ${storage.name}`}
      </span>
      {state.error && <span className="field-error">{state.error}</span>}
    </div>
  );
}
