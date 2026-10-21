import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { friendlyError } from "../utils/errors";

/** Search by VIN or number plate; calls onFound(vin). Used on Home and every dashboard. */
export function VinSearch({ onFound, buttonLabel = "Search", placeholder = "VIN or registration number" }) {
  const { service } = useWallet();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    try {
      const vin = await service.resolveVin(query);
      if (vin) onFound(vin);
      else setError("No vehicle found for that VIN or registration number.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="search" onSubmit={submit}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label="Search" />
      <button type="submit" disabled={busy || !service}>
        {busy ? "Searching…" : buttonLabel}
      </button>
      {error && <p className="field-error">{error}</p>}
    </form>
  );
}
