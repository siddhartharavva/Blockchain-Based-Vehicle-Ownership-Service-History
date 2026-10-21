import { isAddress } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireWallet } from "../components/RequireWallet";
import { VehicleCard } from "../components/VehicleCard";
import { AddressLabel } from "../components/AddressLabel";
import { Field } from "../components/Field";
import { FileUpload } from "../components/FileUpload";
import { TxStatus } from "../components/TxStatus";
import { sameAddress } from "../utils/format";

const DAY = 24 * 60 * 60;

export function MyVehicles() {
  return (
    <RequireWallet>
      <MyVehiclesPage />
    </RequireWallet>
  );
}

function MyVehiclesPage() {
  const { service, account } = useWallet();
  const data = useAsync(async () => {
    const [vins, pending] = await Promise.all([service.getVehiclesByOwner(account), service.getPendingTransfers()]);
    return {
      vehicles: await service.getVehicles(vins),
      incoming: pending.filter((t) => sameAddress(t.to, account)),
      outgoing: pending.filter((t) => sameAddress(t.from, account)),
    };
  }, [service, account]);

  if (data.loading && !data.data) return <p className="muted">Loading your vehicles…</p>;
  if (data.error) return <div className="notice notice-error">{data.error}</div>;
  const { vehicles, incoming, outgoing } = data.data;

  return (
    <div className="stack">
      <h1>My vehicles</h1>
      <IncomingTransfers transfers={incoming} onChange={data.reload} />
      {vehicles.length === 0 && <p className="muted">No vehicles are registered to this wallet.</p>}
      <div className="stack">
        {vehicles.map((vehicle) => (
          <OwnedVehicle
            key={vehicle.vin}
            vehicle={vehicle}
            outgoing={outgoing.find((t) => t.vin === vehicle.vin)}
            onChange={data.reload}
          />
        ))}
      </div>
    </div>
  );
}

function IncomingTransfers({ transfers, onChange }) {
  const { service } = useWallet();
  const tx = useTransaction();
  if (transfers.length === 0) return null;
  return (
    <section className="card highlight">
      <h2>🔔 Incoming transfer requests</h2>
      <ul className="plain">
        {transfers.map((t) => (
          <li key={t.vin} className="row spread">
            <span>
              <code>{t.vin}</code> from <AddressLabel address={t.from} />
            </span>
            {t.buyerAccepted ? (
              <span className="badge badge-ok">Accepted, waiting for RTO approval</span>
            ) : (
              <button disabled={tx.busy} onClick={() => tx.run("Accept transfer", () => service.acceptTransfer(t.vin), onChange)}>
                Accept
              </button>
            )}
            <button className="danger small" disabled={tx.busy} onClick={() => tx.run("Decline transfer", () => service.cancelTransfer(t.vin), onChange)}>
              Decline
            </button>
          </li>
        ))}
      </ul>
      <TxStatus status={tx.status} />
    </section>
  );
}

function OwnedVehicle({ vehicle, outgoing, onChange }) {
  return (
    <div className="owned">
      <VehicleCard vehicle={vehicle} />
      <div className="two-col">
        <TransferPanel vehicle={vehicle} outgoing={outgoing} onChange={onChange} />
        <DocumentSharingPanel vin={vehicle.vin} />
      </div>
    </div>
  );
}

function TransferPanel({ vehicle, outgoing, onChange }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const form = useForm({ buyer: "" });

  if (outgoing) {
    return (
      <div className="card">
        <h3>Transfer in progress</h3>
        <p>
          To <AddressLabel address={outgoing.to} />:{" "}
          {outgoing.buyerAccepted ? "buyer accepted, waiting for RTO approval." : "waiting for the buyer to accept."}
        </p>
        <button className="danger" disabled={tx.busy} onClick={() => tx.run("Cancel transfer", () => service.cancelTransfer(vehicle.vin), onChange)}>
          Cancel transfer
        </button>
        <TxStatus status={tx.status} />
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    tx.run("Start transfer", () => service.initiateTransfer(vehicle.vin, form.values.buyer), () => {
      form.reset();
      return onChange();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <h3>Sell / transfer</h3>
      {vehicle.isStolen && <p className="field-error">Flagged as stolen: transfers are blocked.</p>}
      <Field label="Buyer wallet address" placeholder="0x…" {...form.bind("buyer")} required />
      <button type="submit" disabled={tx.busy || !isAddress(form.values.buyer)}>
        Start transfer
      </button>
      <TxStatus status={tx.status} />
    </form>
  );
}

function DocumentSharingPanel({ vin }) {
  const { service } = useWallet();
  const tx = useTransaction();
  const doc = useForm({ label: "", cid: "" });
  const share = useForm({ viewer: "", days: "7" });

  const addDocument = (e) => {
    e.preventDefault();
    tx.run("Add private document", () => service.addPrivateDocument(vin, doc.values.label, doc.values.cid), doc.reset);
  };
  const grant = (e) => {
    e.preventDefault();
    tx.run("Grant access", () => service.grantDocumentAccess(vin, share.values.viewer, Number(share.values.days) * DAY));
  };
  const revoke = () => tx.run("Revoke access", () => service.revokeDocumentAccess(vin, share.values.viewer));

  return (
    <div className="card form">
      <h3>Private documents</h3>
      <form onSubmit={addDocument} className="stack">
        <Field label="Document name" placeholder="e.g. Insurance copy" {...doc.bind("label")} required />
        <FileUpload label="File" cid={doc.values.cid} onUploaded={(cid) => doc.set("cid", cid)} />
        <button type="submit" disabled={tx.busy || !doc.values.cid}>
          Add document
        </button>
      </form>
      <form onSubmit={grant} className="stack">
        <h4>Share with a buyer for a limited time</h4>
        <div className="grid">
          <Field label="Viewer wallet" placeholder="0x…" {...share.bind("viewer")} required />
          <Field label="Days" type="number" min="1" {...share.bind("days")} required />
        </div>
        <div className="row">
          <button type="submit" disabled={tx.busy || !isAddress(share.values.viewer)}>
            Grant access
          </button>
          <button type="button" className="danger" disabled={tx.busy || !isAddress(share.values.viewer)} onClick={revoke}>
            Revoke
          </button>
        </div>
      </form>
      <TxStatus status={tx.status} />
    </div>
  );
}
