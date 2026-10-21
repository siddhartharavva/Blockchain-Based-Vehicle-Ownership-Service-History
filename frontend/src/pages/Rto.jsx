import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireRole } from "../components/RequireRole";
import { VehicleForm } from "../components/VehicleForm";
import { VehiclePicker } from "../components/VehiclePicker";
import { AddressLabel } from "../components/AddressLabel";
import { Field } from "../components/Field";
import { TxStatus } from "../components/TxStatus";
import { Link } from "react-router-dom";

export function Rto() {
  return (
    <RequireRole role="RTO">
      <RtoDashboard />
    </RequireRole>
  );
}

function RtoDashboard() {
  const { service } = useWallet();
  const pending = useAsync(() => service.getPendingTransfers(), [service]);
  const vehicles = useAsync(() => service.getAllVehicles(), [service]);
  const reloadAll = () => Promise.all([pending.reload(), vehicles.reload()]);
  const unplated = (vehicles.data || []).filter((v) => !v.registrationNumber);

  return (
    <div className="stack">
      <h1>RTO dashboard</h1>
      <VehicleForm
        title="Register a vehicle"
        submitLabel="Register vehicle"
        withRegistrationNumber
        submit={service.registerVehicle}
        onDone={reloadAll}
      />
      <PendingTransfers transfers={pending.data || []} loading={pending.loading} onChange={reloadAll} />
      <AssignPlates vehicles={unplated} onChange={reloadAll} />
      <section>
        <h2>Stolen / blacklist flag</h2>
        <VehiclePicker>{(vehicle, reload) => <StolenToggle vehicle={vehicle} onChange={reload} />}</VehiclePicker>
      </section>
    </div>
  );
}

function PendingTransfers({ transfers, loading, onChange }) {
  const { service } = useWallet();
  const tx = useTransaction();
  return (
    <section className="card">
      <h2>Pending transfers</h2>
      {loading && <p className="muted">Loading…</p>}
      {!loading && transfers.length === 0 && <p className="muted">No pending transfers.</p>}
      <table className="table">
        <tbody>
          {transfers.map((t) => (
            <tr key={t.vin}>
              <td>
                <Link to={`/vehicle/${t.vin}`}>
                  <code>{t.vin}</code>
                </Link>
              </td>
              <td>
                <AddressLabel address={t.from} /> → <AddressLabel address={t.to} />
              </td>
              <td>{t.buyerAccepted ? <span className="badge badge-ok">Buyer accepted</span> : <span className="badge badge-warn">Waiting for buyer</span>}</td>
              <td>
                <button disabled={!t.buyerAccepted || tx.busy} onClick={() => tx.run(`Approve ${t.vin}`, () => service.approveTransfer(t.vin), onChange)}>
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TxStatus status={tx.status} />
    </section>
  );
}

function AssignPlates({ vehicles, onChange }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const form = useForm({ vin: "", plate: "" });
  const vin = form.values.vin || vehicles[0]?.vin;
  const submit = (e) => {
    e.preventDefault();
    tx.run("Assign number plate", () => service.assignRegistrationNumber(vin, form.values.plate), () => {
      form.reset();
      return onChange();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Assign number plates (dealer-created vehicles)</h2>
      {vehicles.length === 0 ? (
        <p className="muted">Every vehicle has a number plate.</p>
      ) : (
        <>
          <div className="grid">
            <Field label="Vehicle" as="select" options={vehicles.map((v) => v.vin)} name="vin" value={vin} onChange={(e) => form.set("vin", e.target.value)} />
            <Field label="Registration number" {...form.bind("plate")} required />
          </div>
          <button type="submit" disabled={tx.busy}>
            Assign
          </button>
        </>
      )}
      <TxStatus status={tx.status} />
    </form>
  );
}

function StolenToggle({ vehicle, onChange }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const next = !vehicle.isStolen;
  return (
    <div className="card">
      <p>
        Currently: <strong>{vehicle.isStolen ? "flagged as stolen" : "not flagged"}</strong>. Transfers are blocked while flagged.
      </p>
      <button
        className={next ? "danger" : ""}
        disabled={tx.busy}
        onClick={() => tx.run(next ? "Flag as stolen" : "Clear stolen flag", () => service.setStolenStatus(vehicle.vin, next), onChange)}
      >
        {next ? "Mark as stolen" : "Clear stolen flag"}
      </button>
      <TxStatus status={tx.status} />
    </div>
  );
}
