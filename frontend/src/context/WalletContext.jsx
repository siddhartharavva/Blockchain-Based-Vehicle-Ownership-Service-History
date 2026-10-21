import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider, JsonRpcProvider, toQuantity } from "ethers";
import { CHAIN, RPC_URL, DEPLOYMENT } from "../config";
import { RegistryService } from "../services/registryService";

const WalletContext = createContext(null);

// One read-only provider for the whole app: reading history never needs a wallet.
const readProvider = new JsonRpcProvider(RPC_URL, CHAIN.id, { staticNetwork: true });
const readOnlyService = DEPLOYMENT ? new RegistryService(readProvider) : null;

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [walletChainId, setWalletChainId] = useState(null);
  const [signer, setSigner] = useState(null);
  // Roles are stored with the account they belong to, so a background refresh never
  // unmounts the page (only the first load for an account counts as "loading").
  const [roleState, setRoleState] = useState({ account: null, roles: [] });
  const [error, setError] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);
  const wrongNetwork = Boolean(account) && walletChainId !== null && walletChainId !== CHAIN.id;

  const service = useMemo(() => {
    if (!readOnlyService) return null;
    return signer && !wrongNetwork ? readOnlyService.withSigner(signer) : readOnlyService;
  }, [signer, wrongNetwork]);

  const syncWallet = useCallback(async () => {
    if (!hasMetaMask) return;
    const browserProvider = new BrowserProvider(window.ethereum);
    const [accounts, network] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      browserProvider.getNetwork(),
    ]);
    setWalletChainId(Number(network.chainId));
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      return;
    }
    setAccount(accounts[0]);
    setSigner(await browserProvider.getSigner(accounts[0]));
  }, [hasMetaMask]);

  const connect = useCallback(async () => {
    setError(null);
    if (!hasMetaMask) {
      setError("MetaMask is not installed. Install it from metamask.io to sign transactions.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await syncWallet();
    } catch (e) {
      setError(e.code === 4001 ? "Connection request was rejected." : e.message);
    }
  }, [hasMetaMask, syncWallet]);

  const switchNetwork = useCallback(async () => {
    const chainId = toQuantity(CHAIN.id);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    } catch (e) {
      if (e.code !== 4902) throw e; // 4902 = chain not added to MetaMask yet
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: CHAIN.name,
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    }
  }, []);

  // Restore an existing connection and follow account / network changes.
  useEffect(() => {
    if (!hasMetaMask) return undefined;
    syncWallet().catch((e) => setError(e.message));
    const onChange = () => syncWallet().catch((e) => setError(e.message));
    window.ethereum.on("accountsChanged", onChange);
    window.ethereum.on("chainChanged", onChange);
    return () => {
      window.ethereum.removeListener("accountsChanged", onChange);
      window.ethereum.removeListener("chainChanged", onChange);
    };
  }, [hasMetaMask, syncWallet]);

  const refreshRoles = useCallback(async () => {
    if (!account || !readOnlyService) {
      setRoleState({ account: null, roles: [] });
      return;
    }
    try {
      setRoleState({ account, roles: await readOnlyService.getRoles(account) });
    } catch (e) {
      setError(`Could not read roles: ${e.shortMessage || e.message}`);
    }
  }, [account]);

  useEffect(() => {
    refreshRoles();
  }, [refreshRoles]);

  const roles = roleState.account === account ? roleState.roles : [];
  const rolesLoading = Boolean(account) && roleState.account !== account;

  const value = {
    account,
    roles,
    rolesLoading,
    hasRole: (key) => roles.includes(key),
    refreshRoles,
    service,
    isDeployed: Boolean(readOnlyService),
    hasMetaMask,
    wrongNetwork,
    connect,
    switchNetwork,
    error,
    clearError: () => setError(null),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside <WalletProvider>");
  return context;
}
