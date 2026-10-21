import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";

/** Organisation name for an address ("" when none). Cached inside RegistryService. */
export function useEntityName(address) {
  const { service } = useWallet();
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;
    setName("");
    if (address && service) {
      service.getEntityName(address).then((n) => active && setName(n)).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [address, service]);

  return name;
}
