import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle, ArrowDownLeft, ArrowUpRight, Check, ChevronDown, CircleHelp,
    Clock3, LoaderCircle, Plus, RefreshCw, Search, Send, UserRound,
} from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { PageHeading, SectionCard } from './shared';

const STATUS_FILTERS = ['all', 'open', 'pending', 'resolved', 'closed'];
const fieldClass = 'mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none focus:border-[#c45a2e]';
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-500';

const initialDraft = () => ({
    customerName: '',
    customerEmail: '',
    subject: '',
    description: '',
    category: 'general',
    priority: 'normal',
    orderReference: '',
    assignedTo: '',
});

const formatDate = (value) => new Date(value).toLocaleString('en-NP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kathmandu',
});

const statusStyle = {
    open: 'bg-sky-50 text-sky-700',
    pending: 'bg-amber-50 text-amber-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-stone-100 text-stone-600',
};

const priorityStyle = {
    low: 'text-slate-500',
    normal: 'text-slate-600',
    high: 'text-orange-700',
    urgent: 'text-rose-700',
};

export const CustomerSupportPage = ({ token, isAdmin }) => {
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({ open: 0, pending: 0, resolved: 0 });
    const [agents, setAgents] = useState([]);
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextBefore, setNextBefore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [moreLoading, setMoreLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [draft, setDraft] = useState(initialDraft);
    const [messageBody, setMessageBody] = useState('');
    const [messageType, setMessageType] = useState('reply');

    const loadTickets = useCallback(async ({ append = false, cursor = null } = {}) => {
        if (append) setMoreLoading(true);
        else setLoading(true);
        setError('');
        try {
            const result = await aiDashboardService.getSupportTickets(token, {
                status,
                limit: '50',
                ...(cursor ? { before: cursor.date, beforeId: cursor.id } : {}),
            });
            setTickets((previous) => append ? [...previous, ...(result.tickets || [])] : (result.tickets || []));
            setCounts(result.counts || { open: 0, pending: 0, resolved: 0 });
            setAgents(result.agents || []);
            setHasMore(Boolean(result.hasMore));
            setNextBefore(result.nextBefore || null);
            if (!append) {
                setSelectedId((previous) => {
                    if (!result.tickets?.length) return '';
                    return result.tickets.some((ticket) => ticket.id === previous) ? previous : result.tickets[0].id;
                });
            }
            return result;
        } catch (loadError) {
            setError(loadError.message || 'Unable to load the support inbox.');
            throw loadError;
        } finally {
            if (append) setMoreLoading(false);
            else setLoading(false);
        }
    }, [status, token]);

    const loadTicket = useCallback(async (ticketId) => {
        if (!ticketId) {
            setSelected(null);
            setMessages([]);
            return null;
        }
        setDetailLoading(true);
        try {
            const result = await aiDashboardService.getSupportTicket(ticketId, token);
            setSelected(result.ticket);
            setMessages(result.messages || []);
            return result;
        } catch (loadError) {
            setError(loadError.message || 'Unable to load this support conversation.');
            throw loadError;
        } finally {
            setDetailLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadTickets().catch(() => {});
    }, [loadTickets]);

    useEffect(() => {
        let current = true;
        if (!selectedId) {
            setSelected(null);
            setMessages([]);
            return undefined;
        }
        setDetailLoading(true);
        aiDashboardService.getSupportTicket(selectedId, token)
            .then((result) => {
                if (current) {
                    setSelected(result.ticket);
                    setMessages(result.messages || []);
                }
            })
            .catch((loadError) => {
                if (current) setError(loadError.message || 'Unable to load this support conversation.');
            })
            .finally(() => {
                if (current) setDetailLoading(false);
            });
        return () => { current = false; };
    }, [selectedId, token]);

    const visibleTickets = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return tickets;
        return tickets.filter((ticket) => [
            ticket.id,
            ticket.customer_name,
            ticket.customer_email,
            ticket.subject,
            ticket.order_reference,
            ticket.last_message_preview,
        ].some((value) => String(value || '').toLowerCase().includes(query)));
    }, [search, tickets]);

    const refresh = async () => {
        setNotice('');
        await loadTickets();
        if (selectedId) await loadTicket(selectedId);
    };

    const createTicket = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await aiDashboardService.createSupportTicket({
                ...draft,
                assignedTo: isAdmin ? (draft.assignedTo || null) : undefined,
            }, token);
            setShowNewTicket(false);
            setDraft(initialDraft());
            setStatus('all');
            setNotice('Support ticket created.');
            const inbox = await aiDashboardService.getSupportTickets(token, { status: 'all', limit: '50' });
            setTickets(inbox.tickets || []);
            setCounts(inbox.counts || { open: 0, pending: 0, resolved: 0 });
            setAgents(inbox.agents || []);
            setHasMore(Boolean(inbox.hasMore));
            setNextBefore(inbox.nextBefore || null);
            setSelectedId(result.ticket.id);
        } catch (actionError) {
            setError(actionError.message || 'Unable to create the support ticket.');
        } finally {
            setSaving(false);
        }
    };

    const updateTicket = async (changes) => {
        if (!selected) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await aiDashboardService.updateSupportTicket(selected.id, changes, token);
            setSelected(result.ticket);
            await loadTickets();
            setNotice('Ticket updated.');
        } catch (actionError) {
            setError(actionError.message || 'Unable to update the ticket.');
        } finally {
            setSaving(false);
        }
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!selected || !messageBody.trim()) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            await aiDashboardService.addSupportMessage(selected.id, {
                body: messageBody.trim(),
                messageType,
            }, token);
            setMessageBody('');
            await loadTicket(selected.id);
            await loadTickets();
            setNotice(messageType === 'reply' ? 'Customer reply sent.' : 'Internal note added.');
        } catch (actionError) {
            setError(actionError.message || 'Unable to save the support message.');
            await loadTicket(selected.id).catch(() => {});
            await loadTickets().catch(() => {});
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeading
                title="Customer Support"
                description="Organize customer requests, assign ownership, and keep every resolution in one place."
                action={
                    <div className="flex gap-2">
                        <button type="button" onClick={() => refresh().catch(() => {})} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-stone-50 disabled:opacity-50">
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <button type="button" onClick={() => { setShowNewTicket((value) => !value); setError(''); }} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#8f3f22]">
                            <Plus size={13} /> New ticket
                        </button>
                    </div>
                }
            />

            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                    ['Open', counts.open, 'text-sky-700'],
                    ['Waiting on customer', counts.pending, 'text-amber-700'],
                    ['Resolved', counts.resolved, 'text-emerald-700'],
                    ['Inbox scope', isAdmin ? 'All cases' : 'Assigned to you', 'text-slate-700'],
                ].map(([label, value, color]) => (
                    <SectionCard key={label} className="p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p>
                    </SectionCard>
                ))}
            </div>

            {error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-800"><AlertCircle size={13} className="mt-0.5 shrink-0" />{error}</div>}
            {notice && <div role="status" className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] text-emerald-800"><Check size={13} />{notice}</div>}

            {showNewTicket && (
                <SectionCard className="mb-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3">
                        <CircleHelp size={15} className="text-[#c45a2e]" />
                        <h2 className="text-[12px] font-extrabold text-slate-800">Create a support ticket</h2>
                    </div>
                    <form onSubmit={createTicket} className="grid gap-3 md:grid-cols-2">
                        <label className={labelClass}>Customer name
                            <input required maxLength={160} value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} className={fieldClass} />
                        </label>
                        <label className={labelClass}>Customer email
                            <input required type="email" maxLength={320} value={draft.customerEmail} onChange={(event) => setDraft({ ...draft, customerEmail: event.target.value })} className={fieldClass} />
                        </label>
                        <label className={`${labelClass} md:col-span-2`}>Subject
                            <input required maxLength={240} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={fieldClass} />
                        </label>
                        <label className={labelClass}>Category
                            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={fieldClass}>
                                <option value="general">General</option><option value="orders">Orders</option><option value="shipping">Shipping</option><option value="returns">Returns</option><option value="product">Product question</option>
                            </select>
                        </label>
                        <label className={labelClass}>Priority
                            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} className={fieldClass}>
                                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                            </select>
                        </label>
                        <label className={labelClass}>Order reference <span className="font-normal normal-case tracking-normal">(optional)</span>
                            <input maxLength={120} value={draft.orderReference} onChange={(event) => setDraft({ ...draft, orderReference: event.target.value })} className={fieldClass} />
                        </label>
                        {isAdmin && <label className={labelClass}>Assign to
                            <select value={draft.assignedTo} onChange={(event) => setDraft({ ...draft, assignedTo: event.target.value })} className={fieldClass}>
                                <option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.username} · {agent.role}</option>)}
                            </select>
                        </label>}
                        <label className={`${labelClass} md:col-span-2`}>Initial case details
                            <textarea required maxLength={8000} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={fieldClass} placeholder="Summarize the request and any action already taken." />
                        </label>
                        <div className="flex justify-end gap-2 md:col-span-2">
                            <button type="button" onClick={() => setShowNewTicket(false)} className="rounded-md border border-stone-200 px-3 py-2 text-[10px] font-bold text-slate-600">Cancel</button>
                            <button disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                                {saving && <LoaderCircle size={12} className="animate-spin" />} Create ticket
                            </button>
                        </div>
                    </form>
                </SectionCard>
            )}

            <div className="grid min-h-[540px] gap-3 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.7fr)]">
                <SectionCard className="flex min-h-[540px] flex-col p-0">
                    <div className="border-b border-stone-100 p-3">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loaded tickets" className="w-full rounded-md border border-stone-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-[#c45a2e]" />
                        </div>
                        <div className="mt-2 flex gap-1 overflow-x-auto">
                            {STATUS_FILTERS.map((filter) => (
                                <button key={filter} type="button" onClick={() => setStatus(filter)} className={`rounded px-2 py-1.5 text-[9px] font-bold capitalize ${status === filter ? 'bg-orange-50 text-[#a94e2b]' : 'text-slate-500 hover:bg-stone-50'}`}>{filter}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 divide-y divide-stone-100 overflow-y-auto">
                        {loading ? <div className="grid h-40 place-items-center text-[10px] text-slate-500"><LoaderCircle size={15} className="animate-spin" /></div>
                            : visibleTickets.length ? visibleTickets.map((ticket) => (
                                <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`w-full border-l-2 p-3 text-left transition hover:bg-orange-50/50 ${selectedId === ticket.id ? 'border-[#c45a2e] bg-orange-50/50' : 'border-transparent'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-[10px] font-bold text-slate-800">{ticket.subject}</p>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold capitalize ${statusStyle[ticket.status]}`}>{ticket.status}</span>
                                    </div>
                                    <p className="mt-1 truncate text-[9px] text-slate-600">{ticket.customer_name} · {ticket.customer_email}</p>
                                    <p className="mt-1 line-clamp-2 text-[9px] text-slate-500">{ticket.last_message_preview}</p>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className={`text-[8px] font-bold uppercase ${priorityStyle[ticket.priority]}`}>{ticket.priority}</span>
                                        <span className="text-[8px] text-slate-400">{formatDate(ticket.last_message_at)}</span>
                                    </div>
                                </button>
                            )) : <div className="px-4 py-12 text-center text-[10px] text-slate-500">{search ? 'No loaded tickets match that search.' : 'No tickets in this view yet.'}</div>}
                    </div>
                    {hasMore && nextBefore && <button type="button" disabled={moreLoading} onClick={() => loadTickets({ append: true, cursor: nextBefore }).catch(() => {})} className="m-3 inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 py-2 text-[9px] font-bold text-slate-600 disabled:opacity-50">
                        {moreLoading ? <LoaderCircle size={12} className="animate-spin" /> : <ChevronDown size={12} />} Load more
                    </button>}
                </SectionCard>

                <SectionCard className="flex min-h-[540px] flex-col p-0">
                    {!selectedId ? (
                        <div className="grid flex-1 place-items-center p-8 text-center">
                            <div><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-[#b84f2c]"><CircleHelp size={18} /></span><p className="mt-3 text-[11px] font-bold text-slate-700">Choose a ticket to view the conversation</p><p className="mt-1 text-[9px] text-slate-500">Create a ticket when a customer gets in touch.</p></div>
                        </div>
                    ) : detailLoading && !selected ? <div className="grid flex-1 place-items-center text-[10px] text-slate-500"><LoaderCircle size={15} className="animate-spin" /></div>
                        : selected && <>
                            <div className="border-b border-stone-100 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-[9px] text-slate-400">#{selected.id.slice(0, 8).toUpperCase()}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold capitalize ${statusStyle[selected.status]}`}>{selected.status}</span>
                                            <span className={`text-[8px] font-extrabold uppercase ${priorityStyle[selected.priority]}`}>{selected.priority}</span>
                                        </div>
                                        <h2 className="mt-2 break-words text-[14px] font-extrabold text-slate-800">{selected.subject}</h2>
                                        <p className="mt-1 text-[9px] text-slate-500">{selected.customer_name} · <a className="text-[#a94e2b] hover:underline" href={`mailto:${selected.customer_email}`}>{selected.customer_email}</a></p>
                                        {selected.order_reference && <p className="mt-1 text-[9px] text-slate-500">Order reference: {selected.order_reference}</p>}
                                    </div>
                                    <div className="grid min-w-[145px] gap-2 sm:grid-cols-2">
                                        <label className={labelClass}>Status
                                            <select disabled={saving} value={selected.status} onChange={(event) => updateTicket({ status: event.target.value })} className={`${fieldClass} py-2`}>
                                                <option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                                            </select>
                                        </label>
                                        <label className={labelClass}>Priority
                                            <select disabled={saving} value={selected.priority} onChange={(event) => updateTicket({ priority: event.target.value })} className={`${fieldClass} py-2`}>
                                                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                                            </select>
                                        </label>
                                        {isAdmin && <label className={`${labelClass} sm:col-span-2`}>Assigned to
                                            <select disabled={saving} value={selected.assigned_to || ''} onChange={(event) => updateTicket({ assignedTo: event.target.value || null })} className={`${fieldClass} py-2`}>
                                                <option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.username} · {agent.role}</option>)}
                                            </select>
                                        </label>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto bg-[#fcfaf6] p-4">
                                <article className="max-w-[92%] rounded-lg border border-stone-200 bg-white p-3">
                                    <div className="mb-1 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-500"><UserRound size={11} /> Initial case details <span className="font-normal normal-case">{formatDate(selected.created_at)}</span></div>
                                    <p className="whitespace-pre-wrap break-words text-[10px] leading-5 text-slate-700">{selected.description}</p>
                                </article>
                                {messages.map((message) => (
                                    <article key={message.id} className={`ml-auto max-w-[92%] rounded-lg border p-3 ${message.message_type === 'note' ? 'border-amber-200 bg-amber-50' : 'border-orange-100 bg-orange-50/70'}`}>
                                        <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                                            {message.message_type === 'note' ? <><Clock3 size={11} /> Internal note</> : <><ArrowUpRight size={11} /> Customer reply</>}
                                            <span className="font-semibold normal-case tracking-normal">{message.author_name} · {formatDate(message.created_at)}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap break-words text-[10px] leading-5 text-slate-700">{message.body}</p>
                                        {message.message_type === 'reply' && <p className={`mt-2 text-[8px] font-bold ${message.delivery_status === 'sent' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.delivery_status === 'sent' ? 'Email sent to customer' : message.delivery_status === 'failed' ? `Email failed: ${message.delivery_error || 'Delivery error'}` : 'Email delivery pending'}</p>}
                                    </article>
                                ))}
                                {detailLoading && <p className="text-center text-[9px] text-slate-400">Refreshing conversation…</p>}
                            </div>

                            <form onSubmit={sendMessage} className="border-t border-stone-100 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex rounded-md bg-stone-100 p-0.5">
                                        <button type="button" onClick={() => setMessageType('reply')} className={`inline-flex items-center gap-1 rounded px-2 py-1.5 text-[8px] font-bold ${messageType === 'reply' ? 'bg-white text-[#a94e2b] shadow-sm' : 'text-slate-500'}`}><ArrowUpRight size={10} /> Reply</button>
                                        <button type="button" onClick={() => setMessageType('note')} className={`inline-flex items-center gap-1 rounded px-2 py-1.5 text-[8px] font-bold ${messageType === 'note' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500'}`}><ArrowDownLeft size={10} /> Internal note</button>
                                    </div>
                                    <span className="text-[8px] text-slate-400">{messageType === 'reply' ? `Email to ${selected.customer_email}` : 'Visible only to staff'}</span>
                                </div>
                                <textarea required maxLength={8000} rows={3} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder={messageType === 'reply' ? 'Write a helpful reply to the customer…' : 'Add a private note for your team…'} className="w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] leading-5 outline-none focus:border-[#c45a2e]" />
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[8px] text-slate-400">Replies are sent using the configured support email address.</span>
                                    <button disabled={saving || !messageBody.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50">
                                        {saving ? <LoaderCircle size={11} className="animate-spin" /> : <Send size={11} />} {messageType === 'reply' ? 'Send reply' : 'Add note'}
                                    </button>
                                </div>
                            </form>
                        </>}
                </SectionCard>
            </div>
        </div>
    );
};
