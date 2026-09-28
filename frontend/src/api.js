async function req(path, options = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

const post = (path, body) => req(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  health: () => req("/health"),
  dashboard: () => req("/dashboard"),
  customers: () => req("/customers"),
  customer: (id) => req(`/customers/${id}`),
  createCustomer: (data) => post("/customers", data),
  resolveIssue: (cid, iid) => post(`/customers/${cid}/issues/${iid}/resolve`, {}),
  chat: (customer_id, message, use_memory) => post("/chat", { customer_id, message, use_memory }),
  retain: (customer_id, content) => post("/memory/retain", { customer_id, content }),
  recall: (customer_id, query) => post("/memory/recall", { customer_id, query }),
  memories: (id) => req(`/memory/${id}`),
  compare: (customer_id, message) => post("/demo/compare", { customer_id, message }),
};
