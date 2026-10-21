import { formatKm, formatRupees, formatDate } from "./format";

/**
 * Merges every record type into one chronological list for the timeline and the PDF report.
 * Records are matched to their events by position: history is append-only, so the n-th
 * ServiceRecordAdded event belongs to the n-th service record, and so on.
 */
export function buildTimeline({ vehicle, owners, services, accidents, policies, loans, events = {} }) {
  const ev = (name, index) => events[name]?.[index] ?? null;
  const items = [];
  const push = (item, log) => items.push({ ...item, txHash: log?.txHash ?? null, blockNumber: log?.blockNumber ?? 0 });

  owners.forEach((record, i) => {
    if (i === 0) {
      const log = ev("VehicleRegistered", 0);
      push(
        {
          kind: "registration",
          timestamp: record.fromTimestamp,
          title: "Vehicle registered",
          details: `${vehicle.make} ${vehicle.model} (${vehicle.year}) registered to the first owner.`,
          actor: log?.args?.rto ?? null,
          subject: record.owner,
          cid: vehicle.documentCID,
          cidLabel: "Registration document",
        },
        log
      );
      return;
    }
    const log = ev("OwnershipTransferred", i - 1);
    push(
      {
        kind: "transfer",
        timestamp: record.fromTimestamp,
        title: "Ownership transferred",
        details: "Seller initiated, buyer accepted, RTO approved.",
        actor: null,
        from: owners[i - 1].owner,
        subject: record.owner,
      },
      log
    );
  });

  (events.RegistrationNumberAssigned || []).forEach((log) =>
    push(
      {
        kind: "registration",
        timestamp: log.timestamp,
        title: "Registration number assigned",
        details: `Number plate ${log.args.registrationNumber} assigned.`,
        actor: log.args.rto,
      },
      log
    )
  );

  services.forEach((record, i) =>
    push(
      {
        kind: "service",
        timestamp: record.timestamp,
        title: record.serviceType,
        details: [formatKm(record.odometer), record.cost ? formatRupees(record.cost) : null, record.description]
          .filter(Boolean)
          .join(" · "),
        actor: record.serviceCenter,
        cid: record.invoiceCID,
        cidLabel: "Invoice",
      },
      ev("ServiceRecordAdded", i)
    )
  );

  accidents.forEach((record, i) =>
    push(
      {
        kind: "accident",
        timestamp: record.timestamp,
        title: `Accident: ${record.severity}`,
        details: [record.description, record.claimAmount ? `Claim ${formatRupees(record.claimAmount)}` : null]
          .filter(Boolean)
          .join(" · "),
        actor: record.insurer,
        cid: record.reportCID,
        cidLabel: "Report",
      },
      ev("AccidentRecordAdded", i)
    )
  );

  policies.forEach((record, i) =>
    push(
      {
        kind: "insurance",
        timestamp: record.timestamp,
        title: `Insurance policy ${record.policyNumber}`,
        details: `Valid ${formatDate(record.validFrom, false)} to ${formatDate(record.validUntil, false)}`,
        actor: record.insurer,
        cid: record.policyCID,
        cidLabel: "Policy",
      },
      ev("InsurancePolicyAdded", i)
    )
  );

  let clearedIndex = 0;
  loans.forEach((record, i) => {
    push(
      {
        kind: "loan",
        timestamp: record.startedAt,
        title: "Loan / hypothecation recorded",
        details: `${formatRupees(record.amount)}${record.active ? " · active, transfers blocked" : ""}`,
        actor: record.lender,
        cid: record.documentCID,
        cidLabel: "Loan document",
      },
      ev("LoanAdded", i)
    );
    if (record.clearedAt) {
      push(
        { kind: "loan", timestamp: record.clearedAt, title: "Loan cleared", details: "Hypothecation removed.", actor: record.lender },
        ev("LoanCleared", clearedIndex++)
      );
    }
  });

  (events.StolenStatusChanged || []).forEach((log) =>
    push(
      {
        kind: "stolen",
        timestamp: log.timestamp,
        title: log.args.isStolen ? "Flagged as stolen" : "Stolen flag cleared",
        details: log.args.isStolen ? "Transfers are blocked while flagged." : "Vehicle can be transferred again.",
        actor: null,
      },
      log
    )
  );

  return items.sort((a, b) => a.timestamp - b.timestamp || a.blockNumber - b.blockNumber);
}
