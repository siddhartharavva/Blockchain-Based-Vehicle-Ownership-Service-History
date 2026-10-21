import { id, ZeroHash } from "ethers";

/**
 * Every role the app knows about, with its on-chain hash, label and dashboard route.
 * The navbar, route guards and admin panel all read from this one list.
 */
export const ROLES = [
  { key: "ADMIN", hash: ZeroHash, label: "Admin", route: "/admin", nav: "Admin" },
  { key: "RTO", hash: id("RTO_ROLE"), label: "Registration Authority (RTO)", route: "/rto", nav: "RTO" },
  { key: "MANUFACTURER", hash: id("MANUFACTURER_ROLE"), label: "Manufacturer / Dealer", route: "/dealer", nav: "Dealer" },
  { key: "SERVICE_CENTER", hash: id("SERVICE_CENTER_ROLE"), label: "Service Centre", route: "/service", nav: "Service" },
  { key: "INSURER", hash: id("INSURER_ROLE"), label: "Insurance Company", route: "/insurer", nav: "Insurer" },
  { key: "BANK", hash: id("BANK_ROLE"), label: "Bank / Lender", route: "/bank", nav: "Bank" },
];

export const GRANTABLE_ROLES = ROLES.filter((role) => role.key !== "ADMIN");

export const roleByKey = (key) => ROLES.find((role) => role.key === key);
