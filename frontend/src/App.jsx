import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Dashboard, CustomerView, ChatView, MemoryView, CompareView } from "./views";

const NAV = [
  ["dashboard", "Dashboard"],
  ["customer", "Customer"],
  ["chat", "Support Chat"],
  ["memory", "Memory"],
  ["compare", "Before / After"],
];

export default function App() {
  const [view, setView] = useState("dashboard");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("acme");
  const [customer, setCustomer] = useState(null);
  const [lastMemory, setLastMemory] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setCustomers(await api.customers());
      setCustomer(await api.customer(customerId));
    } catch (e) {
      setError(e.message);
    }
  }, [customerId]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setError("Cannot reach the backend on port 8000. Is it running?"));
  }, []);

  useEffect(() => {
    setLastMemory(null);
    refresh();
  }, [refresh]);

  const openCustomer = (id, target = "customer") => {
    setCustomerId(id);
    setView(target);
  };

  const props = { customer, customers, refresh, lastMemory, setLastMemory, setView, openCustomer };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <div className="brand-name">SupportMemory</div>
            <div className="brand-sub">Powered by Hindsight</div>
          </div>
        </div>
        <nav>
          {NAV.map(([key, label]) => (
            <button key={key} className={"nav-item" + (view === key ? " active" : "")} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="status-row"><span className={"dot " + (health?.hindsight_configured ? "ok" : "bad")} />Hindsight</div>
          <div className="status-row"><span className={"dot " + (health?.groq_configured ? "ok" : "bad")} />Groq</div>
          {health && <div className="muted small">Bank: {health.bank_id}</div>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="muted">Active customer</div>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company}</option>
            ))}
          </select>
        </header>
        {error && <div className="banner error">{error}</div>}
        {view === "dashboard" && <Dashboard {...props} />}
        {view === "customer" && customer && <CustomerView {...props} />}
        {view === "chat" && customer && <ChatView {...props} />}
        {view === "memory" && customer && <MemoryView {...props} />}
        {view === "compare" && customer && <CompareView {...props} />}
      </main>
    </div>
  );
}
