import { CHAIN } from "../config";

/** Shows the state of the last transaction from useTransaction(). */
export function TxStatus({ status }) {
  if (status.state === "idle") return null;
  const link = status.hash && CHAIN.explorer ? `${CHAIN.explorer}/tx/${status.hash}` : null;
  return (
    <div className={`notice notice-${status.state}`} role="status">
      {status.state === "pending" || status.state === "signing" ? <span className="spinner" /> : null}
      <span>{status.message}</span>
      {status.hash && (
        <code className="hash" title={status.hash}>
          {link ? (
            <a href={link} target="_blank" rel="noreferrer">
              {status.hash.slice(0, 12)}…
            </a>
          ) : (
            `${status.hash.slice(0, 12)}…`
          )}
        </code>
      )}
    </div>
  );
}
