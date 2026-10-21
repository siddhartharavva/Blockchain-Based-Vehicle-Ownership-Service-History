import { useCallback, useState } from "react";
import { friendlyError } from "../utils/errors";

/**
 * Sends a transaction and tracks its lifecycle for <TxStatus>:
 * idle -> waiting for signature -> pending (mined soon) -> confirmed | error.
 * Every form in the app submits through this hook.
 */
export function useTransaction() {
  const [status, setStatus] = useState({ state: "idle", message: "", hash: null });

  const run = useCallback(async (label, send, onConfirmed) => {
    setStatus({ state: "signing", message: `${label}: confirm in MetaMask…`, hash: null });
    try {
      const tx = await send();
      setStatus({ state: "pending", message: `${label}: transaction sent, waiting for confirmation…`, hash: tx.hash });
      const receipt = await tx.wait();
      setStatus({ state: "confirmed", message: `${label}: confirmed in block ${receipt.blockNumber}.`, hash: tx.hash });
      await onConfirmed?.(receipt);
      return receipt;
    } catch (error) {
      setStatus({ state: "error", message: friendlyError(error), hash: null });
      return null;
    }
  }, []);

  const reset = useCallback(() => setStatus({ state: "idle", message: "", hash: null }), []);
  const busy = status.state === "signing" || status.state === "pending";

  return { run, status, busy, reset };
}
