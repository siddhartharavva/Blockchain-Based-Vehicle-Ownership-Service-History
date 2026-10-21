import { NavLink } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTransferNotifications } from "../hooks/useTransferNotifications";
import { ROLES } from "../constants/roles";
import { CHAIN } from "../config";
import { shortAddress } from "../utils/format";

/** Top navigation: only shows the dashboards the connected wallet's roles allow. */
export function Navbar() {
  const { account, hasRole, connect, wrongNetwork, switchNetwork } = useWallet();
  const { incoming, latestAlert, dismissAlert } = useTransferNotifications();

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="brand">
          🚗 VehicleChain
        </NavLink>
        <div className="nav-links">
          <NavLink to="/" end>
            Verify
          </NavLink>
          {account && (
            <NavLink to="/my-vehicles">
              My Vehicles
              {incoming.length > 0 && <span className="count">{incoming.length}</span>}
            </NavLink>
          )}
          {ROLES.filter((role) => hasRole(role.key)).map((role) => (
            <NavLink key={role.key} to={role.route}>
              {role.nav}
            </NavLink>
          ))}
        </div>
        <div className="wallet">
          {wrongNetwork && (
            <button className="warn" onClick={switchNetwork}>
              Switch to {CHAIN.name}
            </button>
          )}
          {account ? (
            <code title={account}>{shortAddress(account)}</code>
          ) : (
            <button onClick={connect}>Connect wallet</button>
          )}
        </div>
      </nav>
      {latestAlert && (
        <div className="notice notice-info banner">
          🔔 {latestAlert}. Open <NavLink to="/my-vehicles">My Vehicles</NavLink> to accept it.
          <button className="link" onClick={dismissAlert}>
            dismiss
          </button>
        </div>
      )}
    </>
  );
}
