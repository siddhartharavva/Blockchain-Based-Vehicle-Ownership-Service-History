import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useWallet } from "./context/WalletContext";
import { Home } from "./pages/Home";
import { Verify } from "./pages/Verify";
import { Admin } from "./pages/Admin";
import { Rto } from "./pages/Rto";
import { Dealer } from "./pages/Dealer";
import { Service } from "./pages/Service";
import { Insurer } from "./pages/Insurer";
import { Bank } from "./pages/Bank";
import { MyVehicles } from "./pages/MyVehicles";

export default function App() {
  const { error, clearError } = useWallet();
  return (
    <>
      <Navbar />
      <main className="container">
        {error && (
          <div className="notice notice-error">
            {error}{" "}
            <button className="link" onClick={clearError}>
              dismiss
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vehicle/:vin" element={<Verify />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/rto" element={<Rto />} />
          <Route path="/dealer" element={<Dealer />} />
          <Route path="/service" element={<Service />} />
          <Route path="/insurer" element={<Insurer />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/my-vehicles" element={<MyVehicles />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="footer muted">Records are append-only: nobody, not even the admin, can edit or delete them.</footer>
    </>
  );
}
