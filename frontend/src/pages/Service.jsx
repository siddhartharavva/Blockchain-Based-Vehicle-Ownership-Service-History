import { useWallet } from "../context/WalletContext";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireRole } from "../components/RequireRole";
import { VehiclePicker } from "../components/VehiclePicker";
import { Field } from "../components/Field";
import { FileUpload } from "../components/FileUpload";
import { TxStatus } from "../components/TxStatus";
import { SERVICE_TYPES } from "../constants/options";
import { formatKm } from "../utils/format";

export function Service() {
  return (
    <RequireRole role="SERVICE_CENTER">
      <div className="stack">
        <h1>Service centre dashboard</h1>
        <VehiclePicker>{(vehicle, reload) => <ServiceRecordForm vehicle={vehicle} onDone={reload} />}</VehiclePicker>
      </div>
    </RequireRole>
  );
}

function ServiceRecordForm({ vehicle, onDone }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const form = useForm({ odometer: "", serviceType: SERVICE_TYPES[0], description: "", cost: "", invoiceCID: "" });
  const odometer = Number(form.values.odometer);
  const rollback = form.values.odometer !== "" && odometer < vehicle.lastOdometer;

  const submit = (e) => {
    e.preventDefault();
    const record = { ...form.values, odometer, cost: Number(form.values.cost || 0) };
    tx.run("Add service record", () => service.addServiceRecord(vehicle.vin, record), () => {
      form.reset();
      return onDone();
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Add service record</h2>
      <p className="muted">Last recorded odometer: {formatKm(vehicle.lastOdometer)}. Corrections are added as a new "Correction" record.</p>
      <div className="grid">
        <Field label="Odometer (km)" type="number" min="0" {...form.bind("odometer")} required>
          {rollback && <span className="field-error">Lower than the last reading; the contract will reject it.</span>}
        </Field>
        <Field label="Service type" as="select" options={SERVICE_TYPES} {...form.bind("serviceType")} />
        <Field label="Cost (₹)" type="number" min="0" {...form.bind("cost")} />
        <Field label="Description" as="textarea" rows={2} {...form.bind("description")} />
      </div>
      <FileUpload label="Invoice" cid={form.values.invoiceCID} onUploaded={(cid) => form.set("invoiceCID", cid)} />
      <button type="submit" disabled={tx.busy}>
        Add record
      </button>
      <TxStatus status={tx.status} />
    </form>
  );
}
