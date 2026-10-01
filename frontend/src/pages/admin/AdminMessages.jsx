import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiMessageCircle, FiRefreshCw, FiSearch, FiSend, FiX } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import {
  adminSendMessage,
  fetchConversation,
  fetchConversations,
  setConversationStatus,
} from '../../services/chat';

const LIST_MS = 10000;
const THREAD_MS = 8000;
const MAX_LEN = 2000;

const stamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${time}`;
};

/**
 * Admin support inbox: conversation list (search + status) beside the active
 * thread. Both sides poll only while the tab is visible, so an idle admin
 * tab never generates traffic.
 */
export default function AdminMessages() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const listRef = useRef(null);
  const aliveRef = useRef(true);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchConversations({ search: query, status, page: 1, limit: 30 });
      if (!aliveRef.current) return;
      setRows(data?.rows || []);
      setTotal(Number(data?.total) || 0);
      setUnread(Number(data?.unread) || 0);
      setError('');
    } catch (err) {
      if (aliveRef.current && err.status !== 401) setError(err.message || 'Could not load conversations.');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [query, status]);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await fetchConversation(id);
      if (!aliveRef.current) return;
      setThread(data?.conversation || null);
      setMessages(data?.messages || []);
    } catch (err) {
      if (aliveRef.current && err.status !== 401) toast.error(err.message || 'Could not load the conversation.');
    }
  }, []);

  // Debounced search box.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // List polling (paused while the tab is hidden).
  useEffect(() => {
    aliveRef.current = true;
    loadList();
    let timer = null;
    const schedule = () => {
      timer = window.setTimeout(async () => {
        if (!document.hidden) await loadList();
        schedule();
      }, LIST_MS);
    };
    schedule();
    const onVisible = () => {
      if (!document.hidden) loadList();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      aliveRef.current = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadList]);

  // Thread polling for the open conversation only.
  useEffect(() => {
    if (!selectedId) return undefined;
    aliveRef.current = true;
    loadThread(selectedId);
    let timer = null;
    const schedule = () => {
      timer = window.setTimeout(async () => {
        if (!document.hidden) await loadThread(selectedId);
        schedule();
      }, THREAD_MS);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [selectedId, loadThread]);

  // Keep the latest line in view.
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const open = (row) => {
    setSelectedId(row.id);
    setMobileThread(true);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, unread_admin: 0 } : r)));
    setUnread((prev) => Math.max(0, prev - (Number(row.unread_admin) || 0)));
  };

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending || !selectedId) return;
    setSending(true);
    const temp = { id: `tmp-${Date.now()}`, message: body, sender_role: 'admin', created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);
    setText('');
    try {
      const result = await adminSendMessage(selectedId, body);
      if (result?.data?.message) {
        setMessages((prev) => [...prev.filter((m) => m.id !== temp.id), result.data.message]);
      }
      await loadThread(selectedId);
      loadList();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      toast.error(err.message);
    } finally {
      if (aliveRef.current) setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!thread || busy) return;
    setBusy(true);
    try {
      const next = thread.status === 'closed' ? 'open' : 'closed';
      const result = await setConversationStatus(thread.id, next);
      toast.success(result?.message || `Conversation ${next}`);
      await loadThread(thread.id);
      loadList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  };

  const selected = rows.find((row) => row.id === selectedId) || thread;
  const closed = thread?.status === 'closed';

  return (
    <div className="admin-page admin-messages">
      <Helmet>
        <title>Messages - EShopping admin</title>
      </Helmet>

      <div className="admin-page__head">
        <div>
          <h1>Customer messages</h1>
          <p className="muted">
            {unread > 0 ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'Every conversation is up to date'}
          </p>
        </div>
        <Button
          variant="ghost"
          icon={FiRefreshCw}
          onClick={() => {
            loadList();
            if (selectedId) loadThread(selectedId);
          }}
        >
          Refresh
        </Button>
      </div>

      <div className={`admin-chat ${mobileThread ? 'is-thread' : ''}`}>
        <aside className="admin-chat__list">
          <div className="admin-filters admin-chat__filters">
            <label className="admin-chat__search">
              <FiSearch size={15} />
              <input
                type="search"
                value={searchInput}
                placeholder="Search name or mobile"
                aria-label="Search conversations"
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </label>
            <select value={status} aria-label="Filter by status" onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loading && rows.length === 0 && <p className="muted admin-chat__note">Loading conversations…</p>}
          {!loading && error && <p className="admin-chat__note is-error">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="admin-chat__note">No conversations match this filter.</p>
          )}

          <ul className="admin-chat__rows">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`admin-chat__row ${row.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => open(row)}
                >
                  <span className="admin-chat__row-head">
                    <strong>{row.customer_name || 'Customer'}</strong>
                    {Number(row.unread_admin) > 0 && <span className="admin-chat__dot" aria-label="Unread" />}
                  </span>
                  <span className="admin-chat__preview">{row.last_message || 'No messages yet'}</span>
                  <span className="admin-chat__meta">
                    {row.customer_mobile} · {stamp(row.last_message_at || row.created_at)} ·{' '}
                    <em data-status={row.status}>{row.status}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {total > rows.length && (
            <p className="muted admin-chat__note">Showing {rows.length} of {total} conversations.</p>
          )}
        </aside>

        <section className="admin-chat__thread" aria-label="Conversation">
          <button type="button" className="admin-chat__back" onClick={() => setMobileThread(false)}>
            <FiChevronLeft size={16} /> All conversations
          </button>

          {!selected ? (
            <div className="state admin-chat__placeholder">
              <FiMessageCircle size={26} />
              <p>Pick a conversation to read and reply.</p>
            </div>
          ) : (
            <>
              <header className="admin-chat__head">
                <div>
                  <h2>{selected.customer_name || 'Customer'}</h2>
                  <p className="muted">
                    {selected.customer_mobile}
                    {selected.customer_email ? ` · ${selected.customer_email}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={closed ? undefined : FiX}
                  onClick={toggleStatus}
                  loading={busy}
                >
                  {busy ? 'Saving…' : closed ? 'Reopen' : 'Close'}
                </Button>
              </header>

              <div className="chat__list admin-chat__messages" ref={listRef}>
                {messages.length === 0 ? (
                  <div className="chat__empty">
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_role === 'admin';
                    return (
                      <div key={msg.id} className={`chat-msg ${mine ? 'chat-msg--me' : 'chat-msg--them'}`}>
                        <p>{msg.message}</p>
                        <span>
                          {mine ? 'You (support)' : msg.sender_name || 'Customer'} · {stamp(msg.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {closed ? (
                <p className="chat__notice">Conversation closed. Reopen it to reply again.</p>
              ) : (
                <form className="chat__form" onSubmit={send}>
                  <input
                    type="text"
                    value={text}
                    maxLength={MAX_LEN}
                    placeholder="Reply to the customer…"
                    aria-label="Reply"
                    onChange={(e) => setText(e.target.value)}
                    autoComplete="off"
                  />
                  <Button type="submit" variant="primary" icon={FiSend} disabled={sending || !text.trim()}>
                    Send
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
