import { useEntityName } from "../hooks/useEntityName";
import { useWallet } from "../context/WalletContext";
import { sameAddress, shortAddress } from "../utils/format";

/** Organisation name (if the admin set one) plus a short address; full address on hover. */
export function AddressLabel({ address }) {
  const { account } = useWallet();
  const name = useEntityName(address);
  if (!address) return <span className="muted">unknown</span>;
  return (
    <span className="address" title={address}>
      {name && <strong>{name} </strong>}
      <code>{shortAddress(address)}</code>
      {sameAddress(address, account) && <span className="tag">you</span>}
    </span>
  );
}
