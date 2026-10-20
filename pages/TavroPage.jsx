import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookOpenCheck, Copy, FileSearch, LoaderCircle, Mail, MessageSquareText, Plus,
    Search, Send, ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { PageHeading, SectionCard } from './shared';

const tabs = [
    ['chat', 'Tavro Chat', MessageSquareText],
    ['customers', 'Customers', Users],
    ['email', 'Email Studio', Mail],
    ['research', 'Marketing Research', FileSearch],
    ['usage', 'Usage & Skills', BookOpenCheck],
];

const fieldClass = 'mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none focus:border-[#c45a2e]';
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-500';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-bold text-white hover:bg-[#883e24] disabled:cursor-not-allowed disabled:opacity-40';
const dateToday = new Date().toISOString().slice(0, 10);

export const TavroPage = ({ token, enabled, providerConfigured }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [conversations, setConversations] = useState([]);
    const [conversationId, setConversationId] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [customers, setCustomers] = useState([]);
    const [customerQuery, setCustomerQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [selectedDraftId, setSelectedDraftId] = useState('');
    const [draftEditor, setDraftEditor] = useState(null);
    const [draftDirty, setDraftDirty] = useState(false);
    const [emailPurpose, setEmailPurpose] = useState('support');
    const [emailTone, setEmailTone] = useState('warm');
    const [consentEvidence, setConsentEvidence] = useState('');
    const [consentDate, setConsentDate] = useState(dateToday);
    const [researchQuery, setResearchQuery] = useState('');
    const [researchResult, setResearchResult] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadInitial = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [conversationResult, draftResult, usageResult] = await Promise.all([
                aiDashboardService.getTavroConversations(token),
                aiDashboardService.getTavroEmailDrafts(token),
                aiDashboardService.getTavroUsage(token),
            ]);
            setConversations(conversationResult.conversations || []);
            setDrafts(draftResult.drafts || []);
            setUsage(usageResult.usage || null);
        } catch (loadError) {
            setError(loadError.message || 'Tavro could not load. Apply the Tavro database schema and retry.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadInitial(); }, [loadInitial]);

    const refreshConversations = useCallback(async () => {
        const result = await aiDashboardService.getTavroConversations(token);
        setConversations(result.conversations || []);
    }, [token]);

    const refreshDrafts = useCallback(async (selectId = '') => {
        const result = await aiDashboardService.getTavroEmailDrafts(token);
        const nextDrafts = result.drafts || [];
        setDrafts(nextDrafts);
        const nextSelectedId = selectId || selectedDraftId;
        const selected = nextDrafts.find((draft) => draft.id === nextSelectedId);
        if (selected) {
            setSelectedDraftId(selected.id);
            setDraftEditor({
                recipient: selected.recipient,
                subject: selected.subject,
                body: selected.body,
                purpose: selected.purpose,
                status: selected.status,
                version: selected.version,
                customer_id: selected.customer_id,
            });
            setDraftDirty(false);
        }
        return nextDrafts;
    }, [selectedDraftId, token]);

    const openConversation = async (id) => {
        setBusy('conversation');
        setError('');
        try {
            const result = await aiDashboardService.getTavroMessages(id, token);
            setConversationId(id);
            setMessages(result.messages || []);
        } catch (loadError) {
            setError(loadError.message || 'Unable to load this conversation.');
        } finally {
            setBusy('');
        }
    };

    const createConversation = async () => {
        setBusy('conversation');
        setError('');
        try {
            const result = await aiDashboardService.createTavroConversation('New conversation', token);
            setConversationId(result.conversation.id);
            setMessages([]);
            await refreshConversations();
        } catch (createError) {
            setError(createError.message || 'Unable to create a conversation.');
        } finally {
            setBusy('');
        }
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        const text = chatInput.trim();
        if (!text || busy) return;
        setBusy('chat');
        setError('');
        try {
            let activeConversationId = conversationId;
            if (!activeConversationId) {
                const created = await aiDashboardService.createTavroConversation('New conversation', token);
                activeConversationId = created.conversation.id;
                setConversationId(activeConversationId);
            }
            const result = await aiDashboardService.sendTavroMessage(activeConversationId, text, token);
            setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
            setChatInput('');
            await Promise.all([refreshConversations(), loadInitial()]);
        } catch (sendError) {
            setError(sendError.message || 'Tavro could not answer. Your request may be saved in the conversation.');
        } finally {
            setBusy('');
        }
    };

    const searchCustomers = async (event) => {
        event?.preventDefault();
        setBusy('customers');
        setError('');
        try {
            const result = await aiDashboardService.searchTavroCustomers(customerQuery, token);
            setCustomers(result.customers || []);
            setSelectedCustomer(null);
        } catch (searchError) {
            setError(searchError.message || 'Unable to search customer records.');
        } finally {
            setBusy('');
        }
    };

    const loadCustomer = async (customer) => {
        setBusy('customer');
        setError('');
        try {
            const result = await aiDashboardService.getTavroCustomer(customer.id, token);
            setSelectedCustomer(result.customer);
        } catch (loadError) {
            setError(loadError.message || 'Unable to load customer history.');
        } finally {
            setBusy('');
        }
    };

    const generateDraft = async (event) => {
        event.preventDefault();
        if (!selectedCustomer) return;
        setBusy('generate-draft');
        setError('');
        setNotice('');
        try {
            const result = await aiDashboardService.generateTavroEmailDraft({
                customerId: selectedCustomer.id,
                purpose: emailPurpose,
                tone: emailTone,
            }, token);
            setDraftEditor({
                recipient: result.draft.recipient,
                subject: result.draft.subject,
                body: result.draft.body,
                purpose: result.draft.purpose,
                status: result.draft.status,
                version: result.draft.version,
                customer_id: result.draft.customer_id,
            });
            setDraftDirty(false);
            setSelectedDraftId(result.draft.id);
            setSelectedCustomer(result.customerContext);
            setActiveTab('email');
            setNotice('Draft generated and saved. Review every detail before approval.');
            await refreshDrafts(result.draft.id);
        } catch (generateError) {
            setError(generateError.message || 'Unable to generate this draft.');
        } finally {
            setBusy('');
        }
    };

    const selectDraft = async (draftId) => {
        setSelectedDraftId(draftId);
        const draft = drafts.find((item) => item.id === draftId);
        if (!draft) return;
        setDraftEditor({
            recipient: draft.recipient,
            subject: draft.subject,
            body: draft.body,
            purpose: draft.purpose,
            status: draft.status,
            version: draft.version,
            customer_id: draft.customer_id,
        });
        setDraftDirty(false);
    };

    const updateDraftEditor = (field, value) => {
        setDraftEditor((current) => current ? { ...current, [field]: value } : current);
        setDraftDirty(true);
    };

    const saveDraft = async () => {
        if (!selectedDraftId || !draftEditor) return;
        setBusy('save-draft');
        setError('');
        setNotice('');
        try {
            const result = await aiDashboardService.updateTavroEmailDraft(selectedDraftId, {
                recipient: draftEditor.recipient,
                subject: draftEditor.subject,
                body: draftEditor.body,
                purpose: draftEditor.purpose,
            }, token);
            setDraftEditor((current) => ({ ...current, status: result.draft.status, version: result.draft.version }));
            setDraftDirty(false);
            setNotice('Changes saved. Any previous approval has been invalidated.');
            await refreshDrafts(selectedDraftId);
        } catch (saveError) {
            setError(saveError.message || 'Unable to save this draft.');
        } finally {
            setBusy('');
        }
    };

    const approveDraft = async () => {
        if (!selectedDraftId || !draftEditor) return;
        setBusy('approve-draft');
        setError('');
        setNotice('');
        try {
            await aiDashboardService.approveTavroEmailDraft(selectedDraftId, token);
            setNotice('Exact recipient, subject, and body approved. Sending remains a separate action.');
            await refreshDrafts(selectedDraftId);
        } catch (approveError) {
            setError(approveError.message || 'Unable to approve this draft.');
        } finally {
            setBusy('');
        }
    };

    const sendDraft = async () => {
        if (!selectedDraftId || !draftEditor) return;
        const confirmed = window.confirm(
            `Send the approved email now?\n\nTo: ${draftEditor.recipient}\nSubject: ${draftEditor.subject}\n\n${draftEditor.body}`,
        );
        if (!confirmed) return;
        setBusy('send-draft');
        setError('');
        setNotice('');
        try {
            await aiDashboardService.sendTavroEmailDraft(selectedDraftId, token);
            setNotice('Email submitted to Resend. Delivery events are not currently synchronized.');
            await refreshDrafts(selectedDraftId);
        } catch (sendError) {
            setError(sendError.message || 'Unable to send this approved email.');
            await refreshDrafts(selectedDraftId);
        } finally {
            setBusy('');
        }
    };

    const saveMarketingPermission = async (event) => {
        event.preventDefault();
        if (!selectedCustomer || !consentEvidence.trim()) return;
        setBusy('permission');
        setError('');
        setNotice('');
        try {
            await aiDashboardService.saveTavroMarketingPermission(selectedCustomer.id, {
                consentStatus: 'granted',
                consentRecordedAt: new Date(`${consentDate}T12:00:00`).toISOString(),
                evidence: consentEvidence,
            }, token);
            setNotice('Marketing consent recorded. Only record consent when you have verified the customer’s explicit opt-in evidence.');
            setConsentEvidence('');
        } catch (permissionError) {
            setError(permissionError.message || 'Unable to save marketing permission.');
        } finally {
            setBusy('');
        }
    };

    const suppressCustomer = async () => {
        const email = selectedCustomer?.id === draftEditor?.customer_id
            ? selectedCustomer.email
            : draftEditor?.recipient;
        if (!email) return;
        setBusy('suppression');
        setError('');
        setNotice('');
        try {
            await aiDashboardService.suppressTavroEmail({ email, reason: 'administrator_request' }, token);
            setNotice(`${email} is now suppressed from Tavro marketing emails.`);
        } catch (suppressError) {
            setError(suppressError.message || 'Unable to suppress this address.');
        } finally {
            setBusy('');
        }
    };

    const runResearch = async (event) => {
        event.preventDefault();
        const query = researchQuery.trim();
        if (!query) return;
        setBusy('research');
        setError('');
        setResearchResult(null);
        try {
            const result = await aiDashboardService.researchTavro(query, token);
            setResearchResult(result);
        } catch (researchError) {
            setError(researchError.message || 'Unable to complete this research request.');
        } finally {
            setBusy('');
        }
    };

    const selectedConversation = useMemo(
        () => conversations.find((item) => item.id === conversationId),
        [conversationId, conversations],
    );

    const content = () => {
        if (activeTab === 'chat') {
            return (
                <div className="grid gap-4 xl:grid-cols-[minmax(210px,.72fr)_minmax(0,1.7fr)]">
                    <SectionCard className="min-h-[460px]">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-xs font-extrabold">Conversations</h2>
                            <button type="button" onClick={createConversation} disabled={Boolean(busy)} className="rounded border border-stone-200 p-2 text-[#a94e2b] disabled:opacity-40" aria-label="New conversation"><Plus size={14} /></button>
                        </div>
                        <div className="mt-3 space-y-1">
                            {conversations.map((conversation) => (
                                <button key={conversation.id} type="button" onClick={() => openConversation(conversation.id)} className={`w-full rounded-md px-2.5 py-2 text-left text-[10px] ${conversation.id === conversationId ? 'bg-orange-50 text-[#8a3b2e]' : 'hover:bg-stone-50'}`}>
                                    <span className="block truncate font-semibold">{conversation.title}</span>
                                    <span className="mt-1 block text-[9px] text-slate-400">{new Date(conversation.updated_at).toLocaleString()}</span>
                                </button>
                            ))}
                            {!conversations.length && <p className="py-5 text-[10px] text-slate-500">Your saved conversations will appear here.</p>}
                        </div>
                    </SectionCard>
                    <SectionCard className="flex min-h-[460px] flex-col">
                        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                            <Sparkles size={15} className="text-[#c45a2e]" />
                            <div><h2 className="text-xs font-extrabold">{selectedConversation?.title || 'Business development workspace'}</h2><p className="mt-1 text-[9px] text-slate-500">Advice and strategy only. Customer records are searched separately; email sending always requires approval.</p></div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto py-4">
                            {!messages.length && <p className="rounded-md bg-orange-50 p-3 text-[10px] leading-5 text-slate-600">Ask about product positioning, business strategy, or professional writing. Tavro does not invent store facts, execute actions, or send email from chat.</p>}
                            {messages.map((message) => (
                                <article key={message.id} className={`rounded-lg p-3 text-[11px] leading-6 ${message.role === 'assistant' ? 'bg-stone-50 text-slate-700' : 'ml-auto max-w-[90%] bg-[#a94e2b] text-white'}`}>
                                    <div className="mb-1 flex items-center justify-between gap-3 text-[9px] font-bold uppercase opacity-70">
                                        <span>{message.role === 'assistant' ? 'Tavro' : 'You'}</span>
                                        {message.role === 'assistant' && <button type="button" onClick={() => navigator.clipboard.writeText(message.content).then(() => setNotice('Response copied.')).catch(() => setError('Unable to access clipboard.'))} aria-label="Copy Tavro response"><Copy size={12} /></button>}
                                    </div>
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                </article>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="border-t border-stone-100 pt-3">
                            <label className={labelClass} htmlFor="tavro-chat-input">Message Tavro</label>
                            <textarea id="tavro-chat-input" rows={3} maxLength={3000} value={chatInput} onChange={(event) => setChatInput(event.target.value)} className={fieldClass} placeholder="Ask for a strategy, product positioning idea, or writing help." />
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-[9px] text-slate-400">Up to 3,000 characters · no autonomous actions</span>
                                <button className={buttonClass} type="submit" disabled={!enabled || !providerConfigured || Boolean(busy) || !chatInput.trim()}>{busy === 'chat' ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}Ask Tavro</button>
                            </div>
                        </form>
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === 'customers') {
            return (
                <div className="grid gap-4 xl:grid-cols-[minmax(260px,.85fr)_minmax(0,1.4fr)]">
                    <SectionCard>
                        <h2 className="text-xs font-extrabold">Search authorized customer records</h2>
                        <form onSubmit={searchCustomers} className="mt-3 flex gap-2">
                            <label className="sr-only" htmlFor="tavro-customer-search">Customer name, email, or identifier</label>
                            <input id="tavro-customer-search" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} maxLength={100} className={`${fieldClass} mt-0`} placeholder="Name, email, or ID" />
                            <button type="submit" disabled={Boolean(busy) || customerQuery.trim().length < 2} className={buttonClass} aria-label="Search customers">{busy === 'customers' ? <LoaderCircle size={13} className="animate-spin" /> : <Search size={13} />}</button>
                        </form>
                        <div className="mt-4 space-y-1">
                            {customers.map((customer) => (
                                <button key={customer.id} type="button" onClick={() => loadCustomer(customer)} className={`w-full rounded-md border px-3 py-2 text-left ${selectedCustomer?.id === customer.id ? 'border-orange-200 bg-orange-50' : 'border-transparent hover:bg-stone-50'}`}>
                                    <span className="block text-[10px] font-bold">{customer.name}</span>
                                    <span className="mt-1 block truncate text-[9px] text-slate-500">{customer.email || 'No email on record'}</span>
                                </button>
                            ))}
                            {!customers.length && <p className="py-5 text-[10px] text-slate-500">Search by at least two characters. Only customer accounts are returned.</p>}
                        </div>
                    </SectionCard>
                    <SectionCard>
                        {!selectedCustomer ? <p className="text-[10px] text-slate-500">Select a customer to view their recorded order and support history.</p> : (
                            <div>
                                <h2 className="text-sm font-extrabold">{selectedCustomer.name}</h2>
                                <p className="mt-1 text-[10px] text-slate-500">{selectedCustomer.email || 'No email on record'} · Account status: {selectedCustomer.status}</p>
                                <p className="mt-2 break-all text-[9px] text-slate-400">Customer ID: {selectedCustomer.id}</p>
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div><h3 className="text-[10px] font-bold">Recent orders</h3>{selectedCustomer.orders.length ? selectedCustomer.orders.map((order) => <div key={order.id} className="mt-2 rounded border border-stone-100 p-2 text-[9px]"><p>#{order.id} · {order.status}</p><p className="mt-1 text-slate-500">{order.products.length ? order.products.join(', ') : 'No product names recorded'}</p></div>) : <p className="mt-2 text-[9px] text-slate-500">No orders found.</p>}</div>
                                    <div><h3 className="text-[10px] font-bold">Support history</h3>{selectedCustomer.supportTickets.length ? selectedCustomer.supportTickets.map((ticket) => <div key={ticket.id} className="mt-2 rounded border border-stone-100 p-2 text-[9px]"><p className="font-semibold">{ticket.subject}</p><p className="mt-1 text-slate-500">{ticket.category} · {ticket.status}</p></div>) : <p className="mt-2 text-[9px] text-slate-500">No support tickets found.</p>}</div>
                                </div>
                                <button type="button" onClick={() => { setActiveTab('email'); setEmailPurpose('support'); }} className={`${buttonClass} mt-5`}><Mail size={13} />Draft customer email</button>
                            </div>
                        )}
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === 'email') {
            const currentDraft = drafts.find((draft) => draft.id === selectedDraftId);
            return (
                <div className="grid gap-4 xl:grid-cols-[minmax(210px,.7fr)_minmax(0,1.7fr)]">
                    <SectionCard>
                        <h2 className="text-xs font-extrabold">Create a personalized draft</h2>
                        <p className="mt-2 text-[9px] leading-5 text-slate-500">Choose a customer in Customer Intelligence first. Gemini receives only their name and selected order/support summaries, not their email, address, or payment details.</p>
                        <form onSubmit={generateDraft} className="mt-4 space-y-3">
                            <p className="rounded bg-stone-50 p-2 text-[9px]">{selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.email || 'No email'}` : 'No customer selected. Use Customer Intelligence to select a record.'}</p>
                            <label className={labelClass}>Purpose
                                <select value={emailPurpose} onChange={(event) => setEmailPurpose(event.target.value)} className={fieldClass}>
                                    <option value="support">Customer support</option>
                                    <option value="order_update">Order update</option>
                                    <option value="marketing">Marketing</option>
                                </select>
                            </label>
                            <label className={labelClass}>Tone
                                <select value={emailTone} onChange={(event) => setEmailTone(event.target.value)} className={fieldClass}>
                                    <option value="warm">Warm</option>
                                    <option value="professional">Professional</option>
                                    <option value="concise">Concise</option>
                                    <option value="friendly">Friendly</option>
                                </select>
                            </label>
                            <button type="submit" disabled={!selectedCustomer?.email || !enabled || !providerConfigured || Boolean(busy)} className={`${buttonClass} w-full`}>{busy === 'generate-draft' ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}Generate draft</button>
                        </form>
                        <div className="mt-6 border-t border-stone-100 pt-4">
                            <h3 className="text-[10px] font-bold">Saved drafts</h3>
                            <div className="mt-2 space-y-1">{drafts.map((draft) => <button key={draft.id} type="button" onClick={() => selectDraft(draft.id)} className={`w-full rounded px-2 py-2 text-left text-[9px] ${selectedDraftId === draft.id ? 'bg-orange-50 text-[#8a3b2e]' : 'hover:bg-stone-50'}`}><span className="block truncate font-semibold">{draft.subject}</span><span className="mt-1 block">{draft.status} · {draft.recipient}</span></button>)}{!drafts.length && <p className="text-[9px] text-slate-500">No saved drafts.</p>}</div>
                        </div>
                    </SectionCard>
                    <SectionCard>
                        <div className="flex items-center gap-2 border-b border-stone-100 pb-3"><Mail size={14} className="text-[#c45a2e]" /><h2 className="text-xs font-extrabold">Review and approval</h2></div>
                        {!draftEditor ? <p className="py-5 text-[10px] text-slate-500">Generate or select a saved draft to edit and review it.</p> : (
                            <div className="mt-4 space-y-3">
                                <label className={labelClass}>Recipient
                                    <input type="email" maxLength={320} value={draftEditor.recipient} onChange={(event) => updateDraftEditor('recipient', event.target.value)} className={fieldClass} />
                                </label>
                                <label className={labelClass}>Purpose
                                    <select value={draftEditor.purpose} onChange={(event) => updateDraftEditor('purpose', event.target.value)} className={fieldClass}><option value="support">Customer support</option><option value="order_update">Order update</option><option value="marketing">Marketing</option></select>
                                </label>
                                <label className={labelClass}>Subject
                                    <input maxLength={998} value={draftEditor.subject} onChange={(event) => updateDraftEditor('subject', event.target.value)} className={fieldClass} />
                                </label>
                                <label className={labelClass}>Message
                                    <textarea rows={9} maxLength={8000} value={draftEditor.body} onChange={(event) => updateDraftEditor('body', event.target.value)} className={fieldClass} />
                                </label>
                                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[9px] leading-5 text-amber-900">
                                    <strong>Approval preview</strong><br />To: {draftEditor.recipient || 'Not set'}<br />Subject: {draftEditor.subject || 'Not set'}<br /><span className="whitespace-pre-wrap">{draftEditor.body || 'Message body is empty.'}</span>
                                </div>
                                {draftEditor.purpose === 'marketing' && selectedCustomer?.id === draftEditor.customer_id && (
                                    <form onSubmit={saveMarketingPermission} className="rounded border border-stone-200 p-3">
                                        <p className="text-[9px] leading-5 text-slate-600">Marketing sends require recorded opt-in and no suppression. Record consent only when you have verified explicit consent evidence; customer history is not consent.</p>
                                        <label className={`${labelClass} mt-2`}>Consent date
                                            <input type="date" max={dateToday} value={consentDate} onChange={(event) => setConsentDate(event.target.value)} className={fieldClass} />
                                        </label>
                                        <label className={`${labelClass} mt-2`}>Evidence source
                                            <input required maxLength={300} value={consentEvidence} onChange={(event) => setConsentEvidence(event.target.value)} className={fieldClass} placeholder="Where the explicit opt-in was recorded" />
                                        </label>
                                        <button type="submit" disabled={busy === 'permission' || !consentEvidence.trim()} className="mt-2 rounded border border-stone-200 px-3 py-2 text-[9px] font-bold disabled:opacity-40">Record verified permission</button>
                                    </form>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={saveDraft} disabled={!selectedDraftId || Boolean(busy) || ['sending', 'sent', 'cancelled'].includes(draftEditor.status)} className={buttonClass}>Save changes</button>
                                    <button type="button" onClick={approveDraft} disabled={!selectedDraftId || draftDirty || Boolean(busy) || !['draft', 'failed'].includes(draftEditor.status)} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800 disabled:opacity-40"><ShieldCheck size={13} className="mr-1 inline" />Approve exact content</button>
                                    <button type="button" onClick={sendDraft} disabled={!selectedDraftId || draftDirty || Boolean(busy) || draftEditor.status !== 'approved'} className={buttonClass}>{busy === 'send-draft' ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}Send approved email</button>
                                    <button type="button" onClick={suppressCustomer} disabled={Boolean(busy) || !draftEditor.recipient} className="rounded-md border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-700">Suppress address</button>
                                    <span className="text-[9px] text-slate-500">Status: {draftEditor.status}</span>
                                </div>
                                {draftDirty && <p role="status" className="text-[9px] text-amber-800">Unsaved changes invalidate approval. Save before approving or sending.</p>}
                                {currentDraft?.provider_message_id && <p className="text-[9px] text-slate-500">Resend message ID: {currentDraft.provider_message_id}</p>}
                            </div>
                        )}
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === 'research') {
            return (
                <SectionCard className="max-w-5xl">
                    <h2 className="text-xs font-extrabold">Public marketing research</h2>
                    <p className="mt-2 text-[9px] leading-5 text-slate-500">Tavro uses Gemini Google Search grounding where the configured model supports it. Review current claims and citations before relying on them.</p>
                    <form onSubmit={runResearch} className="mt-4">
                        <label className={labelClass} htmlFor="tavro-research-query">Research question</label>
                        <textarea id="tavro-research-query" rows={3} maxLength={800} value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} className={fieldClass} placeholder="For example: What public seasonal gift trends are relevant to handcrafted Mithila art?" />
                        <div className="mt-2 flex justify-end"><button type="submit" disabled={!enabled || !providerConfigured || Boolean(busy) || researchQuery.trim().length < 3} className={buttonClass}>{busy === 'research' ? <LoaderCircle size={13} className="animate-spin" /> : <Search size={13} />}Research</button></div>
                    </form>
                    {researchResult && <div className="mt-5 rounded-lg border border-stone-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-[10px] font-bold">Research report</h3><span className="text-[9px] text-slate-500">{researchResult.liveResearchAvailable ? 'Live sources returned' : 'No live source URLs returned'}</span></div><p className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-slate-700">{researchResult.answer}</p>{researchResult.notice && <p className="mt-3 rounded bg-amber-50 p-2 text-[9px] text-amber-900">{researchResult.notice}</p>}{researchResult.sources?.length > 0 && <div className="mt-4 border-t border-stone-100 pt-3"><h4 className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Sources</h4><ul className="mt-2 space-y-2">{researchResult.sources.map((source) => <li key={source.url} className="text-[9px]"><a className="font-semibold text-[#a94e2b] underline" href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a><span className="ml-2 text-slate-500">{source.publisher} · retrieved {new Date(source.retrievedAt).toLocaleString()}</span>{source.excerpt && <p className="mt-1 text-slate-600">{source.excerpt}</p>}</li>)}</ul></div>}</div>}
                </SectionCard>
            );
        }

        return (
            <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard>
                    <h2 className="text-xs font-extrabold">AI budget and usage</h2>
                    {!usage ? <p className="mt-3 text-[10px] text-slate-500">Usage data is unavailable.</p> : <div className="mt-4 space-y-3 text-[10px]"><p>AI operations: <strong>{usage.enabled ? 'enabled' : 'paused'}</strong></p><p>Daily budget: <strong>{usage.daily_requests} / {usage.daily_request_limit}</strong> · resets {usage.daily_date}</p><p>Monthly budget: <strong>{usage.monthly_requests} / {usage.monthly_request_limit}</strong> · period {usage.monthly_month}</p><p className="text-[9px] text-slate-500">The budget is shared with existing dashboard AI features. Gemini free-tier limits can change independently.</p></div>}
                </SectionCard>
                <SectionCard>
                    <h2 className="text-xs font-extrabold">Available Tavro skills and boundaries</h2>
                    <ul className="mt-3 space-y-3 text-[9px] leading-5 text-slate-600"><li><strong className="block text-slate-800">Business assistance</strong>Strategy and writing suggestions; chat cannot take actions.</li><li><strong className="block text-slate-800">Customer research</strong>Structured lookup of store users, orders, and support-ticket summaries.</li><li><strong className="block text-slate-800">Email drafting</strong>Individual drafts only; exact-content approval and an explicit send confirmation are required.</li><li><strong className="block text-slate-800">Marketing research</strong>Google Search grounding with provider-returned source URLs where available.</li><li><strong className="block text-slate-800">Inbox replies</strong>Unavailable until mailbox access and OAuth permissions are configured; no disconnected inbox is presented as working.</li></ul>
                </SectionCard>
            </div>
        );
    };

    return (
        <div>
            <PageHeading title="Tavro" description="Private AI business-development workspace for Mithila Chitrakala Store." />
            <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
                {tabs.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-2 rounded px-3 py-2 text-[9px] font-bold ${activeTab === id ? 'bg-[#a94e2b] text-white' : 'text-slate-600 hover:bg-stone-50'}`}><Icon size={13} />{label}</button>)}
            </div>
            {error && <p role="alert" className="mb-3 rounded border border-rose-200 bg-rose-50 p-3 text-[10px] text-rose-800">{error}</p>}
            {notice && <p role="status" className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800">{notice}</p>}
            {loading ? <SectionCard><p className="text-[10px] text-slate-500"><LoaderCircle size={13} className="mr-2 inline animate-spin" />Loading Tavro workspace…</p></SectionCard> : content()}
            {!enabled && <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">AI operations are paused in dashboard settings.</p>}
            {enabled && !providerConfigured && <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">Gemini is not configured on the server. Customer search and saved drafts remain available.</p>}
        </div>
    );
};
