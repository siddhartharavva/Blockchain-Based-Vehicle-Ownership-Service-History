import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { RequireRole } from "../components/RequireRole";
import { VehicleForm } from "../components/VehicleForm";

export function Dealer() {
  return (
    <RequireRole role="MANUFACTURER">
      <DealerDashboard />
    </RequireRole>
  );
}

function DealerDashboard() {
  const { service } = useWallet();
  const navigate = useNavigate();
  return (
    <div className="stack">
      <h1>Manufacturer / dealer</h1>
      <p className="muted">Create the initial vehicle record. The RTO assigns the number plate afterwards.</p>
      <VehicleForm
        title="Create vehicle record"
        submitLabel="Create record"
        withRegistrationNumber={false}
        submit={service.manufactureVehicle}
        onDone={(vin) => navigate(`/vehicle/${vin}`)}
      />
    </div>
  );
}
