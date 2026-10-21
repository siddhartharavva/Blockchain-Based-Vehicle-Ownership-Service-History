import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireRole } from "../components/RequireRole";
import { VehiclePicker } from "../components/VehiclePicker";
import { Field } from "../components/Field";
import { FileUpload } from "../components/FileUpload";
import { TxStatus } from "../components/TxStatus";
import { AddressLabel } from "../components/AddressLabel";
import { formatDate, formatRupees, sameAddress } from "../utils/format";

export function Bank() {
  return (
    <RequireRole role="BANK">
      <div className="stack">
        <h1>Bank / loan dashboard</h1>
        <p className="muted">A vehicle with an active loan cannot be transferred until the bank clears it.</p>
        <VehiclePicker>{(vehicle) => <LoanPanel vin={vehicle.vin} />}</VehiclePicker>
      </div>
    </RequireRole>
  );
}

function LoanPanel({ vin }) {
  const { service, account } = useWallet();
  const tx = useTransaction();
  const form = useForm({ amount: "", documentCID: "" });
  const records = useAsync(() => service.getVehicleRecords(vin), [service, vin]);
  const loans = records.data?.loans || [];
  const active = loans.find((l) => l.active);

  const add = (e) => {
    e.preventDefault();
    tx.run("Record loan", () => service.addLoan(vin, Number(form.values.amount), form.values.documentCID), () => {
      form.reset();
      return records.reload();
    });
  };

  return (
    <div className="two-col">
      <section className="card">
        <h2>Loans on this vehicle</h2>
        {loans.length === 0 && <p className="muted">No loans recorded.</p>}
        <ul className="plain">
          {loans.map((l) => (
            <li key={l.startedAt}>
              {formatRupees(l.amount)} by <AddressLabel address={l.lender} /> on {formatDate(l.startedAt, false)}{" "}
              {l.active ? <span className="badge badge-warn">active</span> : <span className="badge badge-ok">cleared {formatDate(l.clearedAt, false)}</span>}
            </li>
          ))}
        </ul>
        {active && sameAddress(active.lender, account) && (
          <button disabled={tx.busy} onClick={() => tx.run("Clear loan", () => service.clearLoan(vin), records.reload)}>
            Clear loan (repaid)
          </button>
        )}
      </section>
      {!active && (
        <form className="card form" onSubmit={add}>
          <h2>Record a loan</h2>
          <Field label="Loan amount (₹)" type="number" min="1" {...form.bind("amount")} required />
          <FileUpload label="Loan agreement" cid={form.values.documentCID} onUploaded={(cid) => form.set("documentCID", cid)} />
          <button type="submit" disabled={tx.busy}>
            Record loan
          </button>
        </form>
      )}
      <TxStatus status={tx.status} />
    </div>
  );
}
