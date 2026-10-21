/** Display formatting helpers: dates, addresses, rupees, kilometres. */

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(unixSeconds, withTime = true) {
  const seconds = Number(unixSeconds);
  if (!seconds) return "—";
  const options = withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  return new Date(seconds * 1000).toLocaleString("en-IN", options);
}

export function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export function formatKm(km) {
  return `${Number(km).toLocaleString("en-IN")} km`;
}

/** "2024-05-01" (from an <input type="date">) -> unix seconds. */
export function dateInputToUnix(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export function sameAddress(a, b) {
  return Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
}
