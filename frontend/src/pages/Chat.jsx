import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { FiMessageCircle, FiSend } from 'react-icons/fi';
import { announceUnread, fetchMyConversation, sendChatMessage } from '../services/chat';

/** How often the open conversation refreshes while the tab is visible. */
const POLL_MS = 8000;
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
 * Customer support inbox: one conversation per customer (the backend
 * guarantees that with a unique key on user_id). It polls only while the tab
 * is visible, so leaving the page open in the background costs nothing.
 */
export default function Chat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const stickRef = useRef(true);
  const aliveRef = useRef(true);

  const apply = useCallback((data) => {
    if (!data) return;
    if (data.conversation) setConversation(data.conversation);
    if (Array.isArray(data.messages)) setMessages(data.messages);
    announceUnread(0);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await fetchMyConversation());
      if (aliveRef.current) setError('');
    } catch (err) {
      if (aliveRef.current && err.status !== 401) setError(err.message || 'We could not load your messages.');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [apply]);

  // Initial load + visibility-aware polling.
  useEffect(() => {
    aliveRef.current = true;
    load();

    let timer = null;
    const schedule = () => {
      timer = window.setTimeout(tick, POLL_MS);
    };
    const tick = async () => {
      if (document.hidden) {
        schedule();
        return;
      }
      await load();
      schedule();
    };
    schedule();

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      aliveRef.current = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Keep the newest line in view unless the reader scrolled back in time.
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    if (stickRef.current) node.scrollTop = node.scrollHeight;
    const onScroll = () => {
      stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    };
    node.addEventListener('scroll', onScroll);
    return () => node.removeEventListener('scroll', onScroll);
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (conversation?.status === 'closed') {
      toast.error('This conversation has been closed.');
      return;
    }
    setSending(true);
    stickRef.current = true;
    const temp = {
      id: `tmp-${Date.now()}`,
      message: body,
      sender_role: 'customer',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    setText('');
    try {
      const result = await sendChatMessage(body);
      if (result?.data?.message) {
        setMessages((prev) => [...prev.filter((m) => m.id !== temp.id), result.data.message]);
      }
      await load();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      toast.error(err.message);
    } finally {
      if (aliveRef.current) setSending(false);
    }
  };

  const closed = conversation?.status === 'closed';

  return (
    <div className="container page chat-page">
      <Helmet>
        <title>Support chat - {import.meta.env.VITE_STORE_NAME || 'EShopping'}</title>
      </Helmet>

      <div className="page__head">
        <h1>Support chat</h1>
        <p className="muted">Ask us anything about an order, a product or a delivery.</p>
      </div>

      {loading && (
        <div className="state" role="status">
          <p>Loading your conversation…</p>
        </div>
      )}

      {!loading && error && !messages.length && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && (
        <section className="chat" aria-label="Support conversation">
          <header className="chat__head">
            <span className="chat__avatar" aria-hidden="true">
              <FiMessageCircle size={17} />
            </span>
            <div>
              <h2>EShopping support</h2>
              <p className="muted">
                {closed ? 'Conversation closed' : 'We usually reply within a few minutes'}
              </p>
            </div>
            <span className={`chat__status ${closed ? 'is-closed' : 'is-open'}`}>
              {closed ? 'Closed' : 'Open'}
            </span>
          </header>

          <div className="chat__list" ref={listRef}>
            {messages.length === 0 ? (
              <div className="chat__empty">
                <p>No messages yet. Say hello and our team will pick it up here.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const mine = msg.sender_role === 'customer';
                return (
                  <div key={msg.id} className={`chat-msg ${mine ? 'chat-msg--me' : 'chat-msg--them'}`}>
                    <p>{msg.message}</p>
                    <span>
                      {mine ? 'You' : msg.sender_name || 'Support'} · {stamp(msg.created_at)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {closed ? (
            <p className="chat__notice">
              This conversation is closed. Contact us from the contact page to start a new one.
            </p>
          ) : (
            <form className="chat__form" onSubmit={send}>
              <input
                type="text"
                value={text}
                maxLength={MAX_LEN}
                placeholder="Type your message…"
                aria-label="Message"
                onChange={(e) => setText(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn btn--primary" disabled={sending || !text.trim()}>
                <FiSend size={15} /> Send
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
