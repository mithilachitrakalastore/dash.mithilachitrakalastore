import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, BellRing, CheckCircle2, Clock3, LoaderCircle, Mail, Pause, Pencil, Plus, RefreshCw,
    Workflow, X,
} from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { dateTime, PageHeading, SectionCard } from './shared';

const emptyDraft = { name: '', threshold: '5', recipientEmail: '', status: 'draft' };
const inputClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] text-slate-800 outline-none focus:border-[#bd6740] focus:ring-2 focus:ring-[#bd6740]/10';
const labelClass = 'mb-1.5 block text-[10px] font-bold text-slate-600';
const statusClass = {
    draft: 'bg-stone-100 text-stone-700',
    active: 'bg-emerald-100 text-emerald-800',
    paused: 'bg-amber-100 text-amber-800',
    succeeded: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-rose-100 text-rose-800',
    running: 'bg-blue-100 text-blue-800',
};

const ruleDraft = (rule) => ({
    name: rule.name || '',
    threshold: String(rule.trigger_config?.threshold ?? 5),
    recipientEmail: rule.action_config?.recipientEmail || '',
    status: rule.status || 'draft',
});

export const AutomationsPage = ({ token }) => {
    const [rules, setRules] = useState([]);
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');
    const [draft, setDraft] = useState(null);
    const [editingId, setEditingId] = useState('');
    const [saving, setSaving] = useState(false);
    const [workingId, setWorkingId] = useState('');

    const loadAutomations = useCallback(async () => {
        setLoadError('');
        try {
            const result = await aiDashboardService.getAutomations(token);
            setRules(result.rules || []);
            setRuns(result.runs || []);
        } catch (error) {
            setLoadError(error.message || 'Unable to load automations.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadAutomations(); }, [loadAutomations]);

    const rulesById = useMemo(() => new Map(rules.map((rule) => [rule.id, rule])), [rules]);
    const activeCount = rules.filter((rule) => rule.status === 'active').length;
    const failedRuns = runs.filter((run) => run.status === 'failed').length;

    const openCreate = () => {
        setEditingId('');
        setDraft({ ...emptyDraft });
        setFormError('');
        setSuccess('');
    };
    const openEdit = (rule) => {
        setEditingId(rule.id);
        setDraft(ruleDraft(rule));
        setFormError('');
        setSuccess('');
    };
    const closeForm = () => {
        if (!saving) {
            setDraft(null);
            setEditingId('');
        }
    };
    const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

    const saveRule = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError('');
        setSuccess('');
        try {
            const payload = {
                ...draft,
                threshold: Number(draft.threshold),
            };
            const response = editingId
                ? await aiDashboardService.updateAutomation(editingId, payload, token)
                : await aiDashboardService.createAutomation(payload, token);
            setRules((current) => editingId
                ? current.map((rule) => rule.id === editingId ? response.rule : rule)
                : [response.rule, ...current]);
            setDraft(null);
            setEditingId('');
            setSuccess('Automation saved.');
        } catch (error) {
            setFormError(error.message || 'Unable to save this automation.');
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (rule) => {
        const status = rule.status === 'active' ? 'paused' : 'active';
        setWorkingId(rule.id);
        setLoadError('');
        setSuccess('');
        try {
            const { rule: updatedRule } = await aiDashboardService.updateAutomation(rule.id, { status }, token);
            setRules((current) => current.map((item) => item.id === rule.id ? updatedRule : item));
            setSuccess(status === 'active' ? `"${rule.name}" is active.` : `"${rule.name}" is paused.`);
        } catch (error) {
            setLoadError(error.message || 'Unable to update automation status.');
        } finally {
            setWorkingId('');
        }
    };

    return (
        <div>
            <PageHeading
                title="Automations"
                description="Protect product availability with timely low-stock alerts for your team."
                action={<button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#68201a] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-[#4f1714]"><Plus size={13} />New automation</button>}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Active automations</p>
                    <strong className="mt-2 block text-2xl font-extrabold text-slate-800">{activeCount}</strong>
                    <p className="mt-1 text-[9px] text-slate-500">Rules enabled for store events</p>
                </SectionCard>
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Recent runs</p>
                    <strong className="mt-2 block text-2xl font-extrabold text-slate-800">{runs.length}</strong>
                    <p className="mt-1 text-[9px] text-slate-500">Latest 100 executions</p>
                </SectionCard>
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Delivery failures</p>
                    <strong className={`mt-2 block text-2xl font-extrabold ${failedRuns ? 'text-rose-700' : 'text-slate-800'}`}>{failedRuns}</strong>
                    <p className="mt-1 text-[9px] text-slate-500">Failures in the recent execution history</p>
                </SectionCard>
            </div>

            {loadError && <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{loadError}</p>}
            {success && <p role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800">{success}</p>}

            {draft && <SectionCard className="mt-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                        <h2 className="text-[12px] font-extrabold text-slate-800">{editingId ? 'Edit automation' : 'Create low-stock alert'}</h2>
                        <p className="mt-1 text-[9px] text-slate-500">Email the store team when a product enters or is created within the low-stock limit.</p>
                    </div>
                    <button type="button" onClick={closeForm} className="rounded p-1 text-slate-500 hover:bg-stone-100" aria-label="Close automation form"><X size={15} /></button>
                </div>
                <form onSubmit={saveRule}>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label><span className={labelClass}>Automation name</span><input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className={inputClass} placeholder="Low stock · handmade paintings" /></label>
                        <label><span className={labelClass}>Alert at or below (units)</span><input required type="number" min="0" max="100000" step="1" value={draft.threshold} onChange={(event) => updateDraft('threshold', event.target.value)} className={inputClass} /></label>
                        <label><span className={labelClass}>Notification email</span><input required type="email" maxLength={320} value={draft.recipientEmail} onChange={(event) => updateDraft('recipientEmail', event.target.value)} className={inputClass} placeholder="team@example.com" /></label>
                        <label><span className={labelClass}>Initial state</span><select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} className={inputClass}><option value="draft">Draft · do not send</option><option value="active">Active · send alerts</option><option value="paused">Paused</option></select></label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="max-w-2xl text-[9px] leading-4 text-slate-500">Alerts are triggered by stock changes through this dashboard; newly created products already below the limit also alert. New rules start as drafts unless activated here. Resend must be configured on the server to activate email delivery.</p>
                        <div className="flex gap-2"><button type="button" onClick={closeForm} disabled={saving} className="rounded-md border border-stone-200 px-3 py-2 text-[9px] font-bold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-[#68201a] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-60">{saving && <LoaderCircle size={12} className="animate-spin" />}{editingId ? 'Save changes' : 'Save automation'}</button></div>
                    </div>
                    {formError && <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{formError}</p>}
                </form>
            </SectionCard>}

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <SectionCard>
                    <div className="mb-3 flex items-start justify-between gap-2">
                        <div><h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Workflow size={15} className="text-[#c45a2e]" />Your automations</h2><p className="mt-1 text-[9px] text-slate-500">Rules are private to administrators and run on matching inventory changes.</p></div>
                        <button type="button" onClick={loadAutomations} className="rounded p-1.5 text-slate-500 hover:bg-stone-100" aria-label="Refresh automations"><RefreshCw size={13} /></button>
                    </div>
                    {loading ? <p className="flex items-center justify-center gap-2 py-10 text-[10px] text-slate-500"><LoaderCircle size={14} className="animate-spin" />Loading automations…</p>
                        : !rules.length ? <div className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center"><BellRing size={18} className="mx-auto text-stone-400" /><p className="mt-2 text-[10px] font-semibold text-slate-700">No automations yet</p><p className="mt-1 text-[9px] text-slate-500">Create a low-stock alert so your team can restock before items sell out.</p></div>
                            : <div className="space-y-2">{rules.map((rule) => <article key={rule.id} className="rounded-lg border border-stone-100 bg-white p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[10px] font-bold text-slate-800">{rule.name}</h3><span className={`rounded-full px-2 py-0.5 text-[8px] font-bold capitalize ${statusClass[rule.status] || statusClass.draft}`}>{rule.status}</span></div><p className="mt-1 text-[9px] text-slate-500">Low stock at ≤ {rule.trigger_config?.threshold} units · email {rule.action_config?.recipientEmail}</p></div>
                                    <div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEdit(rule)} className="rounded-md border border-stone-200 p-1.5 text-slate-500 hover:bg-stone-50" aria-label={`Edit ${rule.name}`}><Pencil size={12} /></button><button type="button" onClick={() => changeStatus(rule)} disabled={workingId === rule.id} className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1.5 text-[8px] font-bold text-slate-600 hover:bg-stone-50 disabled:opacity-50" aria-label={`${rule.status === 'active' ? 'Pause' : 'Activate'} ${rule.name}`}>{workingId === rule.id ? <LoaderCircle size={11} className="animate-spin" /> : rule.status === 'active' ? <Pause size={11} /> : <CheckCircle2 size={11} />}{rule.status === 'active' ? 'Pause' : 'Activate'}</button></div>
                                </div>
                            </article>)}</div>}
                </SectionCard>

                <SectionCard>
                    <div className="mb-3"><h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Clock3 size={15} className="text-[#c45a2e]" />Execution history</h2><p className="mt-1 text-[9px] text-slate-500">Most recent inventory-triggered email attempts.</p></div>
                    {loading ? <p className="py-10 text-center text-[10px] text-slate-500">Loading execution history…</p>
                        : !runs.length ? <div className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center"><Mail size={18} className="mx-auto text-stone-400" /><p className="mt-2 text-[10px] font-semibold text-slate-700">No runs recorded</p><p className="mt-1 text-[9px] text-slate-500">History appears after a product crosses an active threshold.</p></div>
                            : <div className="max-h-[420px] space-y-2 overflow-y-auto">{runs.map((run) => {
                                const rule = rulesById.get(run.rule_id);
                                return <article key={run.id} className="rounded-lg border border-stone-100 bg-white p-2.5">
                                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-bold text-slate-800">{rule?.name || 'Automation'}</p><p className="mt-1 truncate text-[9px] text-slate-500">{run.event_context?.productName || 'Inventory event'} · {run.event_context?.stock ?? '—'} units</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold capitalize ${statusClass[run.status] || statusClass.running}`}>{run.status}</span></div>
                                    <p className="mt-1 flex items-center gap-1 text-[8px] text-slate-400"><Clock3 size={10} />{dateTime(run.triggered_at)}</p>
                                    {run.error_message && <p className="mt-2 flex items-start gap-1.5 rounded bg-rose-50 p-2 text-[8px] leading-4 text-rose-800"><AlertTriangle size={11} className="mt-0.5 shrink-0" />{run.error_message}</p>}
                                </article>;
                            })}</div>}
                </SectionCard>
            </div>
        </div>
    );
};
