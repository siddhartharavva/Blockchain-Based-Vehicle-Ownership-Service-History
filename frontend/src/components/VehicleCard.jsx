import { Link } from "react-router-dom";
import { AddressLabel } from "./AddressLabel";
import { formatKm } from "../utils/format";

/** Compact vehicle summary with a link to its public history page. */
export function VehicleCard({ vehicle, children }) {
  return (
    <article className="card vehicle-card">
      <header>
        <h3>
          {vehicle.make} {vehicle.model} <span className="muted">({vehicle.year})</span>
        </h3>
        {vehicle.isStolen && <span className="badge badge-bad">Stolen</span>}
      </header>
      <dl className="facts">
        <dt>VIN</dt>
        <dd>
          <code>{vehicle.vin}</code>
        </dd>
        <dt>Plate</dt>
        <dd>{vehicle.registrationNumber || <span className="muted">not assigned</span>}</dd>
        <dt>Odometer</dt>
        <dd>{formatKm(vehicle.lastOdometer)}</dd>
        <dt>Owner</dt>
        <dd>
          <AddressLabel address={vehicle.currentOwner} />
        </dd>
      </dl>
      <footer className="row">
        <Link to={`/vehicle/${vehicle.vin}`}>View full history →</Link>
        {children}
      </footer>
    </article>
  );
}
