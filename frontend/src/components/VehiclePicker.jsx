import { useState } from "react";
import { VinSearch } from "./VinSearch";
import { VehicleCard } from "./VehicleCard";
import { useAsync } from "../hooks/useAsync";
import { useWallet } from "../context/WalletContext";

/**
 * "Find a vehicle, then act on it" pattern shared by the service, insurer, bank and RTO pages.
 * `children(vehicle, reload)` renders the action form for the selected vehicle.
 */
export function VehiclePicker({ children }) {
  const { service } = useWallet();
  const [vin, setVin] = useState(null);
  const { data: vehicle, loading, error, reload } = useAsync(() => service.getVehicle(vin), [service, vin], {
    enabled: Boolean(vin && service),
  });

  return (
    <div className="stack">
      <div className="card">
        <h2>Find vehicle</h2>
        <VinSearch onFound={setVin} buttonLabel="Select" />
      </div>
      {vin && loading && <p className="muted">Loading vehicle…</p>}
      {error && <p className="field-error">{error}</p>}
      {vin && vehicle && (
        <>
          <VehicleCard vehicle={vehicle} />
          {children(vehicle, reload)}
        </>
      )}
    </div>
  );
}
