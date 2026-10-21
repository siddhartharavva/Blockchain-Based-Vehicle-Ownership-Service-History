import { AddressLabel } from "./AddressLabel";
import { DocumentLink } from "./DocumentLink";
import { CHAIN } from "../config";
import { formatDate } from "../utils/format";

const ICONS = { registration: "🪪", transfer: "🔁", service: "🔧", accident: "💥", insurance: "🛡️", loan: "🏦", stolen: "🚨" };

/** Chronological list of every record, each with who wrote it, its document and its transaction. */
export function Timeline({ items }) {
  if (items.length === 0) return <p className="muted">No records yet.</p>;
  return (
    <ol className="timeline">
      {items.map((item, i) => (
        <li key={`${item.kind}-${item.txHash || i}-${i}`} className={`timeline-item kind-${item.kind}`}>
          <span className="timeline-icon" aria-hidden>
            {ICONS[item.kind]}
          </span>
          <div className="timeline-body">
            <div className="row spread">
              <strong>{item.title}</strong>
              <time className="muted">{formatDate(item.timestamp)}</time>
            </div>
            {item.details && <p>{item.details}</p>}
            {item.from && (
              <p>
                From <AddressLabel address={item.from} /> to <AddressLabel address={item.subject} />
              </p>
            )}
            {!item.from && item.subject && (
              <p>
                Owner <AddressLabel address={item.subject} />
              </p>
            )}
            <div className="row small">
              {item.actor && (
                <span className="badge badge-info">
                  ✔ Recorded by <AddressLabel address={item.actor} />
                </span>
              )}
              {item.cid && <DocumentLink cid={item.cid} label={item.cidLabel} />}
              {item.txHash && <TxLink hash={item.txHash} />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TxLink({ hash }) {
  const text = `tx ${hash.slice(0, 10)}…`;
  return CHAIN.explorer ? (
    <a className="hash" href={`${CHAIN.explorer}/tx/${hash}`} target="_blank" rel="noreferrer" title={hash}>
      {text}
    </a>
  ) : (
    <code className="hash" title={hash}>
      {text}
    </code>
  );
}
