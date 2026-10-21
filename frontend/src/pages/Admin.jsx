import { isAddress } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useAsync } from "../hooks/useAsync";
import { useForm } from "../hooks/useForm";
import { useTransaction } from "../hooks/useTransaction";
import { RequireRole } from "../components/RequireRole";
import { Field } from "../components/Field";
import { TxStatus } from "../components/TxStatus";
import { AddressLabel } from "../components/AddressLabel";
import { GRANTABLE_ROLES, ROLES } from "../constants/roles";

export function Admin() {
  return (
    <RequireRole role="ADMIN">
      <AdminPanel />
    </RequireRole>
  );
}

function AdminPanel() {
  const { service, refreshRoles } = useWallet();
  const tx = useTransaction();
  const form = useForm({ role: GRANTABLE_ROLES[0].label, account: "", name: "" });
  const members = useAsync(
    () => Promise.all(ROLES.map(async (role) => ({ role, accounts: await service.getRoleMembers(role.hash) }))),
    [service]
  );

  const selectedRole = GRANTABLE_ROLES.find((r) => r.label === form.values.role);
  const validAccount = isAddress(form.values.account);

  const afterChange = async () => {
    service.clearNameCache();
    await Promise.all([members.reload(), refreshRoles()]);
  };

  const grant = async (event) => {
    event.preventDefault();
    const { account, name } = form.values;
    const receipt = await tx.run(`Grant ${selectedRole.nav}`, () => service.grantRole(selectedRole.hash, account));
    if (!receipt) return;
    if (name.trim()) await tx.run("Save organisation name", () => service.setEntityName(account, name.trim()));
    form.reset();
    await afterChange();
  };

  const revoke = (role, account) => tx.run(`Revoke ${role.nav}`, () => service.revokeRole(role.hash, account), afterChange);

  return (
    <div className="stack">
      <h1>Admin panel</h1>
      <form className="card form" onSubmit={grant}>
        <h2>Grant a role</h2>
        <div className="grid">
          <Field label="Role" as="select" options={GRANTABLE_ROLES.map((r) => r.label)} {...form.bind("role")} />
          <Field label="Wallet address" placeholder="0x…" {...form.bind("account")} required />
          <Field label="Organisation name (shown on records)" placeholder="e.g. Speedy Motors" {...form.bind("name")} />
        </div>
        <button type="submit" disabled={tx.busy || !validAccount}>
          Grant role
        </button>
        <TxStatus status={tx.status} />
      </form>

      <section className="card">
        <h2>Role holders</h2>
        {members.loading && <p className="muted">Loading…</p>}
        {members.data?.map(({ role, accounts }) => (
          <div key={role.key} className="role-group">
            <h3>{role.label}</h3>
            {accounts.length === 0 && <p className="muted">Nobody yet.</p>}
            <ul className="plain">
              {accounts.map((account) => (
                <li key={account} className="row spread">
                  <AddressLabel address={account} />
                  {role.key !== "ADMIN" && (
                    <button className="danger small" disabled={tx.busy} onClick={() => revoke(role, account)}>
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
