import { useWallet } from "../context/WalletContext";

/** Renders children once any wallet is connected. */
export function RequireWallet({ children, message = "Connect your wallet to see your vehicles." }) {
  const { account, connect } = useWallet();
  if (account) return children;
  return (
    <div className="card">
      <p>{message}</p>
      <button onClick={connect}>Connect wallet</button>
    </div>
  );
}
