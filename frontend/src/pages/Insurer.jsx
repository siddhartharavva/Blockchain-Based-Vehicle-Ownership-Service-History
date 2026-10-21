import { useWallet } from "../context/WalletContext";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireRole } from "../components/RequireRole";
import { VehiclePicker } from "../components/VehiclePicker";
import { Field } from "../components/Field";
import { FileUpload } from "../components/FileUpload";
import { TxStatus } from "../components/TxStatus";
import { ACCIDENT_SEVERITIES } from "../constants/options";
import { dateInputToUnix } from "../utils/format";

export function Insurer() {
  return (
    <RequireRole role="INSURER">
      <div className="stack">
        <h1>Insurer dashboard</h1>
        <VehiclePicker>
          {(vehicle, reload) => (
            <div className="two-col">
              <AccidentForm vin={vehicle.vin} onDone={reload} />
              <PolicyForm vin={vehicle.vin} onDone={reload} />
            </div>
          )}
        </VehiclePicker>
      </div>
    </RequireRole>
  );
}

function AccidentForm({ vin, onDone }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const form = useForm({ description: "", severity: ACCIDENT_SEVERITIES[0], claimAmount: "", reportCID: "" });
  const submit = (e) => {
    e.preventDefault();
    const record = { ...form.values, claimAmount: Number(form.values.claimAmount || 0) };
    tx.run("Add accident record", () => service.addAccidentRecord(vin, record), () => {
      form.reset();
      return onDone();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Accident / claim</h2>
      <Field label="Severity" as="select" options={ACCIDENT_SEVERITIES} {...form.bind("severity")} />
      <Field label="Claim amount (₹)" type="number" min="0" {...form.bind("claimAmount")} />
      <Field label="Description" as="textarea" rows={2} {...form.bind("description")} required />
      <FileUpload label="Claim report" cid={form.values.reportCID} onUploaded={(cid) => form.set("reportCID", cid)} />
      <button type="submit" disabled={tx.busy}>
        Add accident record
      </button>
      <TxStatus status={tx.status} />
    </form>
  );
}

function PolicyForm({ vin, onDone }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const form = useForm({ policyNumber: "", validFrom: "", validUntil: "", policyCID: "" });
  const submit = (e) => {
    e.preventDefault();
    const policy = {
      ...form.values,
      validFrom: dateInputToUnix(form.values.validFrom),
      validUntil: dateInputToUnix(form.values.validUntil),
    };
    tx.run("Add insurance policy", () => service.addInsurancePolicy(vin, policy), () => {
      form.reset();
      return onDone();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h2>Insurance policy</h2>
      <Field label="Policy number" {...form.bind("policyNumber")} required />
      <Field label="Valid from" type="date" {...form.bind("validFrom")} required />
      <Field label="Valid until" type="date" {...form.bind("validUntil")} required />
      <FileUpload label="Policy document" cid={form.values.policyCID} onUploaded={(cid) => form.set("policyCID", cid)} />
      <button type="submit" disabled={tx.busy}>
        Add policy
      </button>
      <TxStatus status={tx.status} />
    </form>
  );
}
