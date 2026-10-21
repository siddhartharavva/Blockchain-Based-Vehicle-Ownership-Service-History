import { useNavigate } from "react-router-dom";
import { VinSearch } from "../components/VinSearch";
import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { VehicleCard } from "../components/VehicleCard";
import { CHAIN } from "../config";
import { storage } from "../services/storage";

export function Home() {
  const navigate = useNavigate();
  const { service, account, connect, isDeployed } = useWallet();
  const { data: vehicles } = useAsync(() => service.getAllVehicles(), [service], { enabled: Boolean(service) });

  return (
    <div className="stack">
      <section className="hero card">
        <h1>Verify any vehicle's history</h1>
        <p>
          Registration, every owner, every service with its odometer reading, accidents, insurance and loans, recorded on
          a blockchain by authorised RTOs, service centres, insurers and banks. Nothing can be edited or deleted. No wallet
          is needed to check a vehicle.
        </p>
        <VinSearch onFound={(vin) => navigate(`/vehicle/${vin}`)} buttonLabel="Verify" />
        {!account && (
          <p className="muted">
            Organisations and owners: <button className="link" onClick={connect}>connect MetaMask</button> to open your dashboard.
          </p>
        )}
        <p className="muted small">
          Network: {CHAIN.name} · Documents: {storage.name}
        </p>
      </section>

      {!isDeployed && (
        <div className="notice notice-error">
          No contract deployment found for chain {CHAIN.id}. Run <code>npx hardhat run scripts/deploy.js --network localhost</code>.
        </div>
      )}

      {vehicles?.length > 0 && (
        <section>
          <h2>Registered vehicles ({vehicles.length})</h2>
          <div className="cards">
            {vehicles.map((v) => (
              <VehicleCard key={v.vin} vehicle={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
