import { Field } from "./Field";
import { FileUpload } from "./FileUpload";
import { TxStatus } from "./TxStatus";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { isValidVin, normalizeRegNumber, normalizeVin } from "../utils/vin";
import { isAddress } from "ethers";

const EMPTY = { vin: "", registrationNumber: "", make: "", model: "", year: "", color: "", engineNumber: "", owner: "", documentCID: "" };

/**
 * Vehicle details form shared by the RTO (with number plate) and the dealer (without).
 * `submit(form)` is the RegistryService method to call.
 */
export function VehicleForm({ title, submitLabel, withRegistrationNumber, submit, onDone }) {
  const form = useForm(EMPTY);
  const tx = useTransaction();
  const { values } = form;
  const thisYear = new Date().getFullYear();

  const problems = [
    !isValidVin(values.vin) && "VIN must be 17 characters",
    withRegistrationNumber && !values.registrationNumber.trim() && "Registration number is required",
    !isAddress(values.owner) && "Owner must be a valid wallet address",
    !(Number(values.year) >= 1900 && Number(values.year) <= thisYear + 1) && "Enter a valid year",
  ].filter(Boolean);

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...values,
      vin: normalizeVin(values.vin),
      registrationNumber: withRegistrationNumber ? normalizeRegNumber(values.registrationNumber) : "",
    };
    tx.run(`Register ${payload.vin}`, () => submit(payload), () => {
      form.reset();
      onDone?.(payload.vin);
    });
  };

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <div className="grid">
        <Field label="VIN (17 characters)" {...form.bind("vin")} maxLength={17} required />
        {withRegistrationNumber && <Field label="Registration number" {...form.bind("registrationNumber")} required />}
        <Field label="Make" {...form.bind("make")} required />
        <Field label="Model" {...form.bind("model")} required />
        <Field label="Year" type="number" {...form.bind("year")} required />
        <Field label="Colour" {...form.bind("color")} required />
        <Field label="Engine number" {...form.bind("engineNumber")} required />
        <Field label="Owner wallet address" {...form.bind("owner")} placeholder="0x…" required />
      </div>
      <FileUpload label="Registration document (RC)" cid={values.documentCID} onUploaded={(cid) => form.set("documentCID", cid)} />
      {problems.length > 0 && values.vin && <p className="field-hint">{problems.join(" · ")}</p>}
      <button type="submit" disabled={tx.busy || problems.length > 0}>
        {submitLabel}
      </button>
      <TxStatus status={tx.status} />
    </form>
  );
}
