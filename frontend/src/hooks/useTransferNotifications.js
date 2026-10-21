import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { sameAddress } from "../utils/format";

/**
 * Incoming transfer requests for the connected wallet, kept live by listening for
 * TransferInitiated events addressed to it. Drives the navbar badge and the alert banner.
 */
export function useTransferNotifications() {
  const { account, service } = useWallet();
  const [incoming, setIncoming] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);

  const refresh = useCallback(async () => {
    if (!account || !service) {
      setIncoming([]);
      return;
    }
    try {
      const pending = await service.getPendingTransfers();
      setIncoming(pending.filter((t) => sameAddress(t.to, account) && !t.buyerAccepted));
    } catch {
      setIncoming([]);
    }
  }, [account, service]);

  useEffect(() => {
    refresh();
    if (!account || !service) return undefined;
    const contract = service.contract;
    const filter = contract.filters.TransferInitiated(null, null, account);
    const onEvent = (_vin, from) => {
      setLatestAlert(`New transfer request from ${from}`);
      refresh();
    };
    contract.on(filter, onEvent);
    return () => {
      contract.off(filter, onEvent);
    };
  }, [account, service, refresh]);

  return { incoming, latestAlert, dismissAlert: () => setLatestAlert(null), refresh };
}
