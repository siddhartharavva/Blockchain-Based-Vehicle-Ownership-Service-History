/** Stolen / loan / pending-transfer badges shown on cards and the verify page. */
export function StatusBadges({ vehicle, hasActiveLoan = false, transferPending = false }) {
  return (
    <span className="badges">
      {vehicle.isStolen ? <span className="badge badge-bad">Stolen</span> : <span className="badge badge-ok">Not stolen</span>}
      {hasActiveLoan && <span className="badge badge-warn">Active loan</span>}
      {transferPending && <span className="badge badge-info">Transfer pending</span>}
      {!vehicle.registrationNumber && <span className="badge badge-warn">No number plate yet</span>}
    </span>
  );
}
