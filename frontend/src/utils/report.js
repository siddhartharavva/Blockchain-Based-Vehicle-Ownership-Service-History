import { formatDate, formatKm } from "./format";

/**
 * Builds a downloadable PDF history report for buyers.
 * `nameOf(address)` returns a display label (organisation name or short address).
 */
export async function downloadHistoryReport({ vehicle, owners, timeline, nameOf, pageUrl }) {
  const { jsPDF } = await import("jspdf"); // loaded only when a report is requested
  const doc = new jsPDF();
  const margin = 14;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 18;

  const line = (text, size = 10, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    for (const part of doc.splitTextToSize(text, width)) {
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(part, margin, y);
      y += size * 0.5;
    }
    y += 1.5;
  };

  line("Vehicle History Report", 18, "bold");
  line(`Generated ${new Date().toLocaleString("en-IN")} from the blockchain registry`, 9);
  y += 3;

  line(`${vehicle.make} ${vehicle.model} (${vehicle.year})`, 13, "bold");
  line(`VIN: ${vehicle.vin}`);
  line(`Registration number: ${vehicle.registrationNumber || "not assigned yet"}`);
  line(`Colour: ${vehicle.color}   Engine no.: ${vehicle.engineNumber}`);
  line(`Last recorded odometer: ${formatKm(vehicle.lastOdometer)}`);
  line(`Status: ${vehicle.isStolen ? "FLAGGED AS STOLEN" : "Not flagged"}`);
  line(`Current owner: ${vehicle.currentOwner}`);
  y += 3;

  line(`Owners (${owners.length})`, 12, "bold");
  owners.forEach((o, i) =>
    line(`${i + 1}. ${o.owner}  from ${formatDate(o.fromTimestamp, false)}  to ${o.toTimestamp ? formatDate(o.toTimestamp, false) : "present"}`)
  );
  y += 3;

  line(`Timeline (${timeline.length} events)`, 12, "bold");
  timeline.forEach((item) => {
    line(`${formatDate(item.timestamp)}  ${item.title}`, 10, "bold");
    if (item.details) line(item.details);
    if (item.actor) line(`Recorded by: ${nameOf(item.actor)}`, 9);
    if (item.txHash) line(`Tx: ${item.txHash}`, 8);
    if (item.cid) line(`${item.cidLabel || "Document"} CID: ${item.cid}`, 8);
  });

  y += 4;
  line(`Verify online: ${pageUrl}`, 9);
  line("Records are append-only on the blockchain; none of them can be edited or deleted.", 9);

  doc.save(`vehicle-history-${vehicle.vin}.pdf`);
}
