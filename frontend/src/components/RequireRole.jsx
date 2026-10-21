import { useWallet } from "../context/WalletContext";
import { roleByKey } from "../constants/roles";
import { RequireWallet } from "./RequireWallet";

/** Renders children only for wallets holding `role`; otherwise explains what is missing. */
export function RequireRole({ role, children }) {
  const { label } = roleByKey(role);
  return (
    <RequireWallet message={`Connect a wallet with the ${label} role to use this page.`}>
      <RoleCheck role={role} label={label}>
        {children}
      </RoleCheck>
    </RequireWallet>
  );
}

function RoleCheck({ role, label, children }) {
  const { hasRole, rolesLoading } = useWallet();
  if (rolesLoading) return <p className="muted">Checking your role…</p>;
  if (!hasRole(role)) {
    return (
      <div className="card">
        <p>
          Your wallet does not have the <strong>{label}</strong> role. Ask the admin to grant it.
        </p>
      </div>
    );
  }
  return children;
}
