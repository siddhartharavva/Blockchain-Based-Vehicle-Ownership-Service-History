import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { Timeline } from "../components/Timeline";
import { AddressLabel } from "../components/AddressLabel";
import { DocumentLink } from "../components/DocumentLink";
import { StatusBadges } from "../components/StatusBadges";
import { VehicleQRCode } from "../components/VehicleQRCode";
import { PrivateDocuments } from "../components/PrivateDocuments";
import { buildTimeline } from "../utils/timeline";
import { downloadHistoryReport } from "../utils/report";
import { formatDate, formatKm, shortAddress } from "../utils/format";
import { normalizeVin } from "../utils/vin";

export function Verify() {
  const vin = normalizeVin(useParams().vin);
  const { service } = useWallet();
  const { data: history, loading, error } = useAsync(() => service.getVehicleHistory(vin), [service, vin], {
    enabled: Boolean(service),
  });
  const timeline = useMemo(() => (history ? buildTimeline(history) : []), [history]);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (loading) return <p className="muted">Loading vehicle history from the blockchain…</p>;
  if (error) return <div className="notice notice-error">{error}</div>;
  if (!history) return null;

  const { vehicle, owners, services, accidents, policies, loans, transfer } = history;
  const activeLoan = loans.some((l) => l.active);
  const now = Date.now() / 1000;
  const currentPolicy = policies.find((p) => p.validFrom <= now && p.validUntil >= now);

  const downloadPdf = async () => {
    setPdfBusy(true);
    const addresses = [...new Set(timeline.map((t) => t.actor).filter(Boolean))];
    const names = Object.fromEntries(await Promise.all(addresses.map(async (a) => [a, await service.getEntityName(a)])));
    await downloadHistoryReport({
      vehicle,
      owners,
      timeline,
      nameOf: (a) => (names[a] ? `${names[a]} (${a})` : a),
      pageUrl: window.location.href,
    });
    setPdfBusy(false);
  };

  return (
    <div className="stack">
      {vehicle.isStolen && <div className="notice notice-error">🚨 This vehicle is flagged as STOLEN by the RTO.</div>}

      <section className="card verify-header">
        <div>
          <h1>
            {vehicle.make} {vehicle.model} <span className="muted">({vehicle.year})</span>
          </h1>
          <StatusBadges vehicle={vehicle} hasActiveLoan={activeLoan} transferPending={transfer.active} />
          <dl className="facts">
            <dt>VIN</dt>
            <dd>
              <code>{vehicle.vin}</code>
            </dd>
            <dt>Registration no.</dt>
            <dd>{vehicle.registrationNumber || "not assigned yet"}</dd>
            <dt>Colour</dt>
            <dd>{vehicle.color}</dd>
            <dt>Engine no.</dt>
            <dd>{vehicle.engineNumber}</dd>
            <dt>Odometer</dt>
            <dd>{formatKm(vehicle.lastOdometer)} (last recorded)</dd>
            <dt>Current owner</dt>
            <dd>
              <AddressLabel address={vehicle.currentOwner} />
            </dd>
            <dt>Registered</dt>
            <dd>{formatDate(vehicle.registeredAt)}</dd>
            <dt>Insurance</dt>
            <dd>
              {currentPolicy
                ? `Policy ${currentPolicy.policyNumber}, valid until ${formatDate(currentPolicy.validUntil, false)}`
                : "No active policy on record"}
            </dd>
            <dt>Title token</dt>
            <dd>
              ERC-721 at <code title={service.nftAddress}>{shortAddress(service.nftAddress)}</code>
            </dd>
          </dl>
          <div className="row">
            <DocumentLink cid={vehicle.documentCID} label="Registration document" />
            <button onClick={downloadPdf} disabled={pdfBusy}>
              {pdfBusy ? "Preparing…" : "⬇ Download PDF report"}
            </button>
          </div>
        </div>
        <VehicleQRCode vin={vehicle.vin} />
      </section>

      <section className="summary-row">
        <Stat label="Owners" value={owners.length} />
        <Stat label="Services" value={services.length} />
        <Stat label="Accidents" value={accidents.length} />
        <Stat label="Loans" value={loans.length} />
      </section>

      <section className="card">
        <h2>Ownership history</h2>
        <ol className="owners">
          {owners.map((o, i) => (
            <li key={`${o.owner}-${o.fromTimestamp}`}>
              <AddressLabel address={o.owner} />{" "}
              <span className="muted">
                {formatDate(o.fromTimestamp, false)} → {o.toTimestamp ? formatDate(o.toTimestamp, false) : "present"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Timeline</h2>
        <Timeline items={timeline} />
      </section>

      <PrivateDocuments vin={vehicle.vin} owner={vehicle.currentOwner} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <span className="stat-value">{value}</span>
      <span className="muted">{label}</span>
    </div>
  );
}
