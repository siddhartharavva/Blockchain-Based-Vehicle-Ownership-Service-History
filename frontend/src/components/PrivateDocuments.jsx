import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { DocumentLink } from "./DocumentLink";
import { formatDate, sameAddress } from "../utils/format";

/**
 * Owner's private documents, shown only to the owner, the RTO, or a viewer the owner
 * granted time-limited access to. Hidden for everyone else.
 */
export function PrivateDocuments({ vin, owner }) {
  const { account, service } = useWallet();
  const { data } = useAsync(
    async () => {
      if (!(await service.canViewPrivateDocuments(vin, account))) return null;
      const [docs, expiry] = await Promise.all([service.getPrivateDocuments(vin), service.getDocumentAccessExpiry(vin, account)]);
      return { docs, expiry };
    },
    [service, vin, account],
    { enabled: Boolean(account && service?.canWrite) }
  );

  if (!data) return null;
  const isOwner = sameAddress(owner, account);
  return (
    <section className="card">
      <h2>Private documents</h2>
      {!isOwner && data.expiry > 0 && <p className="muted">Your access expires {formatDate(data.expiry)}.</p>}
      {data.docs.length === 0 ? (
        <p className="muted">No private documents added.</p>
      ) : (
        <ul className="plain">
          {data.docs.map((d) => (
            <li key={d.cid + d.timestamp}>
              <strong>{d.label}</strong> <span className="muted">{formatDate(d.timestamp, false)}</span>{" "}
              <DocumentLink cid={d.cid} label="Open" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
