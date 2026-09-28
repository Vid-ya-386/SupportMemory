import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const fmt = (ts) => new Date(ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function Card({ title, action, children }) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="card-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const Empty = ({ children }) => <div className="empty">{children}</div>;

/* ---------------- Memory list (shared) ---------------- */
function MemoryList({ items, showReason }) {
  if (!items || items.length === 0) return <Empty>No memories found yet.</Empty>;
  return (
    <ul className="memory-list">
      {items.map((m, i) => (
        <li key={m.id || i} className="memory">
          <div className="memory-type">{m.type}</div>
          <div className="memory-text">{m.text}</div>
          {showReason && m.reason && <div className="memory-reason"><strong>Why relevant:</strong> {m.reason}</div>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Memory panel (used in chat + memory view) ---------------- */
function MemoryPanel({ data }) {
  return (
    <div className="panel">
      <Card title="Retrieved from Hindsight">
        {!data && <Empty>Send a message. Recalled memories will appear here.</Empty>}
        {data && !data.memory_used && <Empty>Memory was switched off for this message.</Empty>}
        {data && data.memory_used && <MemoryList items={data.retrieved} showReason />}
      </Card>
      <Card title="Newly stored memory">
        {!data?.stored && <Empty>Nothing stored yet.</Empty>}
        {data?.stored && (
          <div className="stored">
            <div className="memory-type">retained</div>
            <div className="memory-text">{data.stored.content}</div>
            <div className="muted small">Tag: {data.stored.tag}</div>
          </div>
        )}
        {data?.store_error && <div className="banner error">Retain failed: {data.store_error}</div>}
      </Card>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
export function Dashboard({ customers, openCustomer, refresh }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ company: "", contact: "", email: "" });

  useEffect(() => {
    api.dashboard().then(setD).catch((e) => setErr(e.message));
  }, [customers]);

  async function add(e) {
    e.preventDefault();
    if (!form.company.trim()) return;
    try {
      const c = await api.createCustomer(form);
      setForm({ company: "", contact: "", email: "" });
      await refresh();
      openCustomer(c.id);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">A support workspace where every customer conversation is remembered by Hindsight.</p>
      {err && <div className="banner error">{err}</div>}

      <div className="stats">
        {d && [["Customers", d.stats.customers], ["Conversations", d.stats.conversations],
               ["Memory events", d.stats.memory_events], ["Open issues", d.stats.open_issues]].map(([k, v]) => (
          <div className="stat" key={k}><div className="stat-value">{v}</div><div className="muted">{k}</div></div>
        ))}
      </div>

      <div className="grid-2">
        <Card title="Customers">
          <ul className="rows">
            {customers.map((c) => (
              <li key={c.id} className="row clickable" onClick={() => openCustomer(c.id)}>
                <div>
                  <div className="strong">{c.company}</div>
                  <div className="muted small">{c.contact} {c.plan && `· ${c.plan}`}</div>
                </div>
                <span className="pill">{c.open_issues} open</span>
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={add}>
            <input placeholder="New customer company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input placeholder="Contact name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <button className="btn" type="submit">Add</button>
          </form>
        </Card>

        <Card title="Open support issues">
          {d && d.open_issues.length === 0 && <Empty>No open issues.</Empty>}
          <ul className="rows">
            {d?.open_issues.map((i) => (
              <li key={i.id} className="row clickable" onClick={() => openCustomer(i.customer_id)}>
                <div>
                  <div className="strong">{i.title}</div>
                  <div className="muted small">{i.company}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent conversations">
          {d && d.recent.length === 0 && <Empty>No conversations yet. Open Support Chat to start.</Empty>}
          <ul className="rows">
            {d?.recent.map((r, i) => (
              <li key={i} className="row clickable" onClick={() => openCustomer(r.customer_id, "chat")}>
                <div>
                  <div className="strong">{r.company}</div>
                  <div className="muted small clamp">{r.content}</div>
                </div>
                <div className="muted small">{fmt(r.ts)}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Memory activity (live Hindsight calls)">
          {d && d.activity.length === 0 && <Empty>No Hindsight activity yet.</Empty>}
          <ul className="rows">
            {d?.activity.map((a, i) => (
              <li key={i} className="row">
                <div>
                  <span className={"tag " + a.kind}>{a.kind}</span>
                  <span className="small"> {a.company}</span>
                  <div className="muted small clamp">{a.detail}</div>
                </div>
                <div className="muted small">{fmt(a.ts)}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Customer view ---------------- */
export function CustomerView({ customer, refresh, setView }) {
  const [mem, setMem] = useState(null);
  const [err, setErr] = useState("");

  const loadMemories = () => {
    setMem(null);
    api.memories(customer.id).then((r) => setMem(r.results)).catch((e) => setErr(e.message));
  };
  useEffect(loadMemories, [customer.id]);

  async function resolve(issue) {
    try {
      await api.resolveIssue(customer.id, issue.id);
      await refresh();
      loadMemories();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="page">
      <h1>{customer.company}</h1>
      <p className="muted">{customer.contact} · {customer.email}</p>
      {err && <div className="banner error">{err}</div>}
      <div className="grid-2">
        <Card title="Customer details">
          <dl className="details">
            <dt>Plan</dt><dd>{customer.plan}</dd>
            <dt>Environment</dt><dd>{customer.environment || "Unknown"}</dd>
            <dt>Customer since</dt><dd>{fmt(customer.created_at)}</dd>
          </dl>
          <button className="btn" onClick={() => setView("chat")}>Open support chat</button>
        </Card>

        <Card title="Issues">
          {customer.issues.length === 0 && <Empty>No issues yet.</Empty>}
          <ul className="rows">
            {customer.issues.map((i) => (
              <li key={i.id} className="row">
                <div>
                  <div className="strong">{i.title}</div>
                  <div className="muted small">Opened {fmt(i.opened_at)}</div>
                </div>
                {i.status === "open"
                  ? <button className="btn ghost" onClick={() => resolve(i)}>Mark resolved</button>
                  : <span className="pill">resolved</span>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Previous conversations">
          {customer.messages.length === 0 && <Empty>No conversations yet.</Empty>}
          <ul className="rows">
            {customer.messages.filter((m) => m.role === "user").map((m, i) => (
              <li key={i} className="row">
                <div className="clamp">{m.content}</div>
                <div className="muted small">{fmt(m.ts)}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Relevant memories in Hindsight" action={<button className="btn ghost" onClick={loadMemories}>Refresh</button>}>
          {mem === null ? <Empty>Loading from Hindsight...</Empty> : <MemoryList items={mem} />}
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Chat ---------------- */
export function ChatView({ customer, refresh, lastMemory, setLastMemory }) {
  const [text, setText] = useState("");
  const [useMemory, setUseMemory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [customer.messages.length, busy]);

  async function send(override) {
    const msg = (override ?? text).trim();
    if (!msg || busy) return;
    setBusy(true);
    setErr("");
    setText("");
    try {
      const res = await api.chat(customer.id, msg, useMemory);
      setLastMemory(res);
      await refresh();
    } catch (e) {
      setErr(e.message);
      setText(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Support Chat</h1>
      <p className="muted">Talking as {customer.contact || customer.company}, {customer.company}.</p>
      <div className="chat-layout">
        <section className="card chat">
          <div className="chat-toolbar">
            <label className="switch">
              <input type="checkbox" checked={useMemory} onChange={(e) => setUseMemory(e.target.checked)} />
              <span>Hindsight memory {useMemory ? "on" : "off"}</span>
            </label>
          </div>
          <div className="messages">
            {customer.messages.length === 0 && (
              <Empty>
                No messages yet. Try the demo message below.
              </Empty>
            )}
            {customer.messages.map((m, i) => (
              <div key={i} className={"msg " + m.role}>
                <div className="bubble">{m.content}</div>
                {m.role === "assistant" && (
                  <div className={"memory-badge " + (m.memory_used && m.memory_count > 0 ? "on" : "")}>
                    {!m.memory_used && "Memory off"}
                    {m.memory_used && m.memory_count > 0 && `Recalled ${m.memory_count} memories from Hindsight`}
                    {m.memory_used && m.memory_count === 0 && "No prior memory found. Stored this conversation."}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="muted small">{useMemory ? "Recalling memories and writing a reply..." : "Writing a reply..."}</div>}
            <div ref={endRef} />
          </div>
          {err && <div className="banner error">{err}</div>}
          <div className="demo-row">
            <button className="btn ghost" onClick={() => setText("I can't upgrade my account to Pro. My Stripe payment keeps failing.")}>Demo message 1</button>
            <button className="btn ghost" onClick={() => setText("I'm having another problem with billing.")}>Demo message 2</button>
          </div>
          <div className="composer">
            <textarea
              rows={2}
              placeholder="Type the customer's message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="btn" disabled={busy || !text.trim()} onClick={() => send()}>Send</button>
          </div>
        </section>
        <MemoryPanel data={lastMemory} />
      </div>
    </div>
  );
}

/* ---------------- Memory view ---------------- */
export function MemoryView({ customer, lastMemory }) {
  const [all, setAll] = useState(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    setAll(null);
    api.memories(customer.id).then((r) => setAll(r.results)).catch((e) => setErr(e.message));
  };
  useEffect(load, [customer.id]);

  async function retain() {
    if (!note.trim()) return;
    try {
      await api.retain(customer.id, note);
      setMsg("Stored in Hindsight. It may take a few seconds to appear.");
      setNote("");
    } catch (e) { setErr(e.message); }
  }

  async function recall() {
    if (!query.trim()) return;
    try {
      setFound((await api.recall(customer.id, query)).results);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="page">
      <h1>Memory</h1>
      <p className="muted">Everything Hindsight remembers about {customer.company}.</p>
      {err && <div className="banner error">{err}</div>}
      <div className="grid-2">
        <div className="stack">
          <Card title="Retain a note">
            <div className="inline-form">
              <input placeholder="e.g. Prefers email over phone" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn" onClick={retain}>Retain</button>
            </div>
            {msg && <div className="muted small">{msg}</div>}
          </Card>
          <Card title="Recall test">
            <div className="inline-form">
              <input placeholder="e.g. payment problems" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="btn" onClick={recall}>Recall</button>
            </div>
            {found && <MemoryList items={found} />}
          </Card>
          <Card title="All memories" action={<button className="btn ghost" onClick={load}>Refresh</button>}>
            {all === null ? <Empty>Loading from Hindsight...</Empty> : <MemoryList items={all} />}
          </Card>
        </div>
        <MemoryPanel data={lastMemory} />
      </div>
    </div>
  );
}

/* ---------------- Before / After ---------------- */
export function CompareView({ customer }) {
  const [message, setMessage] = useState("I'm having another problem with billing.");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      setRes(await api.compare(customer.id, message));
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="page">
      <h1>Before / After</h1>
      <p className="muted">
        The same message and the same AI model, once without Hindsight and once with it. Run the first demo message in Support Chat first
        so there is something to remember.
      </p>
      <Card>
        <div className="inline-form">
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn" onClick={run} disabled={busy}>{busy ? "Running..." : "Compare"}</button>
        </div>
        {err && <div className="banner error">{err}</div>}
      </Card>
      {res && (
        <div className="grid-2">
          <section className="card compare off">
            <div className="compare-label">Memory OFF</div>
            <p className="reply">{res.without_memory.reply}</p>
          </section>
          <section className="card compare on">
            <div className="compare-label">Memory ON, {res.with_memory.memories.length} memories recalled</div>
            <p className="reply">{res.with_memory.reply}</p>
            <MemoryList items={res.with_memory.memories} showReason />
          </section>
        </div>
      )}
    </div>
  );
}
