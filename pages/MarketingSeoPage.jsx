import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowUpRight, BarChart3, CalendarDays, Check, CircleAlert, Clock3, FileText,
    Globe2, Megaphone, Pencil, Plus, Search, Sparkles, Target, X,
} from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { PageHeading, SectionCard } from './shared';
import { MarketingSocialPanel } from './MarketingSocialPanel';

const channels = [
    ['instagram', 'Instagram'],
    ['facebook', 'Facebook'],
    ['email', 'Email'],
    ['search', 'Search'],
    ['content', 'Content'],
    ['other', 'Other'],
];
const goals = [
    ['awareness', 'Brand awareness'],
    ['traffic', 'Website traffic'],
    ['engagement', 'Engagement'],
    ['sales', 'Sales'],
    ['retention', 'Customer retention'],
];
const statuses = [
    ['draft', 'Draft'],
    ['scheduled', 'Planned'],
    ['active', 'In progress'],
    ['completed', 'Completed'],
];

const emptyCampaign = {
    name: '',
    channel: 'instagram',
    goal: 'awareness',
    status: 'draft',
    audience: '',
    budget: '',
    startsOn: '',
    endsOn: '',
    notes: '',
};
const inputClass = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] text-slate-800 outline-none focus:border-[#bd6740] focus:ring-2 focus:ring-[#bd6740]/10';
const labelClass = 'mb-1.5 block text-[10px] font-bold text-slate-600';
const budgetCurrency = (value) => `Rs. ${new Intl.NumberFormat('en-NP', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;

const productImages = (product) => {
    const images = Array.isArray(product.images)
        ? product.images
        : typeof product.images === 'string' ? product.images.split(',') : [];
    const image = Array.isArray(product.image) ? product.image[0] : product.image;
    return [image, ...images].some((value) => typeof value === 'string' && value.trim());
};

const catalogSeoReadiness = (product) => {
    const name = String(product.name || '').trim();
    const description = String(product.description || '').trim();
    const category = Array.isArray(product.category)
        ? product.category.filter(Boolean).join(', ')
        : String(product.category || '').trim();
    const tags = [product.tags, product.custom_tags]
        .flatMap((value) => Array.isArray(value) ? value : String(value || '').split(','))
        .some((value) => String(value).trim());
    const hasImage = productImages(product);
    const score = (name ? 25 : 0) +
        (description ? (description.length >= 80 ? 25 : 12) : 0) +
        (hasImage ? 20 : 0) +
        (category ? 15 : 0) +
        (tags ? 15 : 0);
    const issues = [];
    if (!name) issues.push('Add a descriptive product name');
    if (!description) issues.push('Add a product description');
    else if (description.length < 80) issues.push('Expand the short description');
    if (!hasImage) issues.push('Add a product image');
    if (!category) issues.push('Assign a product category');
    if (!tags) issues.push('Add product search tags');
    return { ...product, score, issues };
};

const dateLabel = (value) => {
    if (!value) return 'No date set';
    const parsed = new Date(`${value}T12:00:00+05:45`);
    return Number.isNaN(parsed.getTime())
        ? 'No date set'
        : parsed.toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kathmandu' });
};

const campaignDraft = (campaign) => ({
    name: campaign.name || '',
    channel: campaign.channel || 'instagram',
    goal: campaign.goal || 'awareness',
    status: campaign.status || 'draft',
    audience: campaign.audience || '',
    budget: campaign.budget ?? '',
    startsOn: campaign.starts_on || '',
    endsOn: campaign.ends_on || '',
    notes: campaign.notes || '',
});

const statusStyle = {
    draft: 'bg-stone-100 text-stone-700',
    scheduled: 'bg-blue-50 text-blue-700',
    active: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-violet-50 text-violet-700',
};

export const MarketingSeoPage = ({ products = [], token, onReviewProducts }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignsLoading, setCampaignsLoading] = useState(true);
    const [campaignsError, setCampaignsError] = useState('');
    const [draft, setDraft] = useState(null);
    const [editingId, setEditingId] = useState('');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        let current = true;
        aiDashboardService.getMarketingCampaigns(token)
            .then(({ campaigns: savedCampaigns = [] }) => {
                if (current) setCampaigns(savedCampaigns);
            })
            .catch((error) => {
                if (current) setCampaignsError(error.message || 'Unable to load marketing campaigns.');
            })
            .finally(() => {
                if (current) setCampaignsLoading(false);
            });
        return () => { current = false; };
    }, [token]);

    const auditedProducts = useMemo(() => products.map(catalogSeoReadiness), [products]);
    const seoSummary = useMemo(() => {
        const score = auditedProducts.length
            ? Math.round(auditedProducts.reduce((total, product) => total + product.score, 0) / auditedProducts.length)
            : 0;
        const needsWork = auditedProducts.filter((product) => product.issues.length);
        const gaps = needsWork.reduce((total, product) => total + product.issues.length, 0);
        return { score, needsWork, gaps, ready: auditedProducts.length - needsWork.length };
    }, [auditedProducts]);
    const filteredCampaigns = useMemo(() => {
        const query = search.trim().toLowerCase();
        return campaigns.filter((campaign) => !query ||
            String(campaign.name || '').toLowerCase().includes(query) ||
            String(campaign.channel || '').toLowerCase().includes(query) ||
            String(campaign.goal || '').toLowerCase().includes(query));
    }, [campaigns, search]);
    const plannedBudget = campaigns
        .filter((campaign) => campaign.status !== 'completed')
        .reduce((total, campaign) => total + (Number(campaign.budget) || 0), 0);

    const openCreate = () => {
        setEditingId('');
        setDraft({ ...emptyCampaign });
        setFormError('');
        setCampaignsError('');
    };
    const openEdit = (campaign) => {
        setEditingId(campaign.id);
        setDraft(campaignDraft(campaign));
        setFormError('');
        setCampaignsError('');
    };
    const closeDraft = () => {
        if (!saving) {
            setDraft(null);
            setEditingId('');
        }
    };
    const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const saveCampaign = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError('');
        const payload = {
            ...draft,
            budget: draft.budget === '' ? null : Number(draft.budget),
            startsOn: draft.startsOn || null,
            endsOn: draft.endsOn || null,
        };
        try {
            const response = editingId
                ? await aiDashboardService.updateMarketingCampaign(editingId, payload, token)
                : await aiDashboardService.createMarketingCampaign(payload, token);
            setCampaigns((current) => editingId
                ? current.map((campaign) => campaign.id === editingId ? response.campaign : campaign)
                : [response.campaign, ...current]);
            setDraft(null);
            setEditingId('');
        } catch (error) {
            setFormError(error.message || 'Unable to save this campaign.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeading
                title="Marketing & SEO"
                description="Improve product discovery and organize campaigns that bring more people to Mithila art."
                action={<button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#68201a] px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-[#4f1714]"><Plus size={13} />Plan a campaign</button>}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Catalog SEO readiness</p>
                    <div className="mt-2 flex items-end justify-between gap-3">
                        <strong className="text-2xl font-extrabold text-slate-800">{seoSummary.score}<span className="text-sm text-slate-400">/100</span></strong>
                        <Globe2 size={18} className="mb-1 text-[#b45534]" />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#b45534]" style={{ width: `${seoSummary.score}%` }} /></div>
                    <p className="mt-2 text-[9px] text-slate-500">Readiness based on product listing completeness, not search ranking data.</p>
                </SectionCard>
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Products checked</p>
                    <strong className="mt-2 block text-2xl font-extrabold text-slate-800">{auditedProducts.length}</strong>
                    <p className="mt-2 text-[9px] text-slate-500">{seoSummary.ready} complete · {seoSummary.needsWork.length} need attention</p>
                </SectionCard>
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Campaign plans</p>
                    <strong className="mt-2 block text-2xl font-extrabold text-slate-800">{campaigns.length}</strong>
                    <p className="mt-2 text-[9px] text-slate-500">Draft, planned, in progress, or completed</p>
                </SectionCard>
                <SectionCard>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Planned budget total</p>
                    <strong className="mt-2 block truncate text-2xl font-extrabold text-slate-800">{budgetCurrency(plannedBudget)}</strong>
                    <p className="mt-2 text-[9px] text-slate-500">Planning only; no ad spend is triggered here.</p>
                </SectionCard>
            </div>

            <div className="mt-3">
                <MarketingSocialPanel token={token} products={products} />
            </div>
            <SectionCard className="mt-3">
                <div className="flex items-start gap-2">
                    <Target size={14} className="mt-0.5 shrink-0 text-[#c45a2e]" />
                    <div>
                        <h2 className="text-[10px] font-extrabold text-slate-800">Paid ad campaigns</h2>
                        <p className="mt-1 text-[9px] leading-4 text-slate-500">Campaign plans above do not create ads or spend money. Launching paid ads requires separate Meta and TikTok Marketing API permissions, advertiser-account setup, currency-aware budgets, and a confirmed daily spend cap. Ad launch is not enabled here yet.</p>
                    </div>
                </div>
            </SectionCard>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)]">
                <SectionCard>
                    <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                            <h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Sparkles size={15} className="text-[#c45a2e]" />Catalog SEO checklist</h2>
                            <p className="mt-1 text-[9px] leading-4 text-slate-500">Make listings easier to discover by completing the product details already used by your store.</p>
                        </div>
                        <button type="button" onClick={onReviewProducts} className="shrink-0 text-[9px] font-bold text-[#a74427] hover:underline">Review products <ArrowUpRight size={11} className="inline" /></button>
                    </div>
                    {products.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-stone-200 px-4 py-7 text-center">
                            <FileText size={18} className="mx-auto text-stone-400" />
                            <p className="mt-2 text-[10px] font-semibold text-slate-700">No catalog items to audit yet</p>
                            <button type="button" onClick={onReviewProducts} className="mt-2 text-[9px] font-bold text-[#a74427] hover:underline">Open product catalog</button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {seoSummary.needsWork.slice(0, 5).map((product) => (
                                <div key={product.id} className="rounded-lg border border-stone-100 bg-white p-2.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-[10px] font-bold text-slate-800">{product.name || 'Unnamed product'}</p>
                                            <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-500">{product.issues.slice(0, 2).join(' · ')}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">{product.score}%</span>
                                    </div>
                                </div>
                            ))}
                            {!seoSummary.needsWork.length && <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-4 text-center"><Check size={17} className="mx-auto text-emerald-700" /><p className="mt-1 text-[10px] font-semibold text-emerald-800">All checked listings meet the current completeness checklist.</p></div>}
                            {seoSummary.needsWork.length > 5 && <p className="text-center text-[9px] text-slate-500">And {seoSummary.needsWork.length - 5} more listings could be improved.</p>}
                        </div>
                    )}
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-stone-50 p-2.5 text-[9px] leading-4 text-slate-500"><CircleAlert size={13} className="mt-0.5 shrink-0 text-[#bd6740]" />Checks product name, description, image, category, and search tags. Add publishing metadata and Search Console metrics when the storefront integration is available.</div>
                </SectionCard>

                <SectionCard>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Megaphone size={15} className="text-[#c45a2e]" />Campaign planner</h2>
                            <p className="mt-1 text-[9px] text-slate-500">Keep ideas, audiences, channels, dates, and budgets organized in one place.</p>
                        </div>
                        <label className="flex items-center gap-1.5 rounded-md border border-stone-200 px-2 py-1.5"><Search size={12} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-32 bg-transparent text-[9px] outline-none" placeholder="Find a campaign" /></label>
                    </div>
                    {campaignsError && <p role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{campaignsError}</p>}
                    {campaignsLoading ? (
                        <p className="py-10 text-center text-[10px] text-slate-500">Loading saved campaign plans…</p>
                    ) : filteredCampaigns.length ? (
                        <div className="space-y-2">
                            {filteredCampaigns.map((campaign) => (
                                <article key={campaign.id} className="rounded-lg border border-stone-100 bg-white p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-[11px] font-extrabold text-slate-800">{campaign.name}</h3>
                                            <p className="mt-1 text-[9px] capitalize text-slate-500">{campaign.channel} <span className="px-1 text-stone-300">·</span> {String(campaign.goal || '').replace('-', ' ')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2 py-1 text-[8px] font-bold ${statusStyle[campaign.status] || statusStyle.draft}`}>{statuses.find(([value]) => value === campaign.status)?.[1] || campaign.status}</span>
                                            <button type="button" onClick={() => openEdit(campaign)} aria-label={`Edit ${campaign.name}`} className="rounded-md border border-stone-200 p-1.5 text-slate-500 hover:bg-stone-50"><Pencil size={12} /></button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-500">
                                        <span className="inline-flex items-center gap-1"><Target size={11} />{goals.find(([value]) => value === campaign.goal)?.[1] || campaign.goal}</span>
                                        <span className="inline-flex items-center gap-1"><CalendarDays size={11} />{dateLabel(campaign.starts_on)}{campaign.ends_on ? ` – ${dateLabel(campaign.ends_on)}` : ''}</span>
                                        {campaign.budget !== null && campaign.budget !== undefined && <span className="inline-flex items-center gap-1"><BarChart3 size={11} />{budgetCurrency(campaign.budget)}</span>}
                                    </div>
                                    {campaign.audience && <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-slate-500">Audience: {campaign.audience}</p>}
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-stone-200 px-4 py-9 text-center">
                            <Megaphone size={20} className="mx-auto text-stone-400" />
                            <p className="mt-2 text-[10px] font-semibold text-slate-700">{search ? 'No campaign plans match this search.' : 'No campaigns planned yet'}</p>
                            {!search && <button type="button" onClick={openCreate} className="mt-2 text-[9px] font-bold text-[#a74427] hover:underline">Create your first plan</button>}
                        </div>
                    )}
                </SectionCard>
            </div>

            <SectionCard className="mt-3">
                <h2 className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-slate-800"><Clock3 size={14} className="text-[#c45a2e]" />Built for measured growth</h2>
                <p className="max-w-5xl text-[9px] leading-5 text-slate-500">This first release creates a reliable workflow for improving catalog quality and planning campaigns. Future integrations can attach consented traffic, search, email, and sales outcomes to these plans without exposing provider credentials in the browser or changing the current admin access boundary.</p>
            </SectionCard>

            {draft && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDraft(); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="campaign-form-title" className="my-4 w-full max-w-xl rounded-xl border border-stone-200 bg-[#fffdfa] p-4 shadow-2xl sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 id="campaign-form-title" className="text-sm font-extrabold text-slate-800">{editingId ? 'Edit campaign plan' : 'Plan a campaign'}</h2>
                            <p className="mt-1 text-[9px] text-slate-500">Planning only. Saving will not send messages or launch ads.</p>
                        </div>
                        <button type="button" onClick={closeDraft} aria-label="Close campaign form" className="rounded-md p-1.5 text-slate-500 hover:bg-stone-100"><X size={15} /></button>
                    </div>
                    <form onSubmit={saveCampaign} className="space-y-3">
                        {formError && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{formError}</p>}
                        <label className="block"><span className={labelClass}>Campaign name</span><input required minLength={2} maxLength={120} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className={inputClass} placeholder="e.g. Mithila art for festive gifting" /></label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label><span className={labelClass}>Channel</span><select value={draft.channel} onChange={(event) => updateDraft('channel', event.target.value)} className={inputClass}>{channels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label><span className={labelClass}>Goal</span><select value={draft.goal} onChange={(event) => updateDraft('goal', event.target.value)} className={inputClass}>{goals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <label><span className={labelClass}>Plan status</span><select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} className={inputClass}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label><span className={labelClass}>Start date</span><input type="date" value={draft.startsOn} onChange={(event) => updateDraft('startsOn', event.target.value)} className={inputClass} /></label>
                            <label><span className={labelClass}>End date</span><input type="date" min={draft.startsOn || undefined} value={draft.endsOn} onChange={(event) => updateDraft('endsOn', event.target.value)} className={inputClass} /></label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label><span className={labelClass}>Budget (Rs.)</span><input type="number" min="0" step="0.01" value={draft.budget} onChange={(event) => updateDraft('budget', event.target.value)} className={inputClass} placeholder="Optional" /></label>
                            <label><span className={labelClass}>Audience</span><input maxLength={500} value={draft.audience} onChange={(event) => updateDraft('audience', event.target.value)} className={inputClass} placeholder="Who should this reach?" /></label>
                        </div>
                        <label className="block"><span className={labelClass}>Campaign notes</span><textarea maxLength={4000} rows={3} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} className={`${inputClass} resize-y`} placeholder="Message, offer, content idea, or next action" /></label>
                        <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
                            <button type="button" onClick={closeDraft} disabled={saving} className="rounded-lg border border-stone-200 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-stone-50 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={saving} className="rounded-lg bg-[#68201a] px-4 py-2 text-[10px] font-bold text-white hover:bg-[#4f1714] disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save plan'}</button>
                        </div>
                    </form>
                </section>
            </div>}
        </div>
    );
};
