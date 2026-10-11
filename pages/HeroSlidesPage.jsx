import React, { useState } from 'react';
import { Image, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

const emptySlide = () => ({ id: null, cta_label: 'Explore Collection', cta_link: '/products', image: '', sort_order: 0, active: true });
const fieldClass = 'w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none focus:border-[#c45a2e]';
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-500';

export const HeroSlidesPage = ({ slides = [], onAction, loading }) => {
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const openSlide = (slide = null) => {
        setError('');
        setDraft(slide ? {
            id: slide.id,
            cta_label: slide.cta_label ?? slide.cta ?? 'Explore Collection',
            cta_link: slide.cta_link ?? slide.link ?? '/products',
            image: slide.image || '',
            sort_order: slide.sort_order ?? 0,
            active: slide.active ?? true,
        } : emptySlide());
    };

    const save = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await onAction('save-hero-slide', { slide: { ...draft, sort_order: Number(draft.sort_order) } });
            setDraft(null);
        } catch (saveError) {
            setError(saveError.message || 'Unable to save this hero slide.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (slide) => {
        if (!window.confirm('Delete this hero slide?')) return;
        setBusy(true);
        setError('');
        try {
            await onAction('delete-hero-slide', { slideId: slide.id });
            if (draft?.id === slide.id) setDraft(null);
        } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete this hero slide.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <PageHeading title="Homepage Hero Slides" description="Create and edit the image carousel shown on the store homepage." action={<button type="button" onClick={() => openSlide()} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#903f23]"><Plus size={12} />Add slide</button>} />
            {error && <div role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-800">{error}</div>}
            <SectionCard>
                {loading && slides.length === 0 ? <p className="py-8 text-center text-[10px] text-slate-500">Loading hero slides…</p>
                    : slides.length === 0 ? <div className="py-8 text-center"><Image size={22} className="mx-auto mb-2 text-stone-300" /><p className="text-[10px] text-slate-500">No hero slides configured yet.</p></div>
                        : <div className="grid gap-3 md:grid-cols-2">
                            {slides.map((slide) => (
                                <article key={slide.id} className="overflow-hidden rounded-md border border-stone-200 bg-white">
                                    <div className="relative h-36 bg-stone-100">
                                        {slide.image && <img src={slide.image} alt="" className="h-full w-full object-cover" />}
                                        <span className={`absolute right-2 top-2 rounded px-2 py-1 text-[8px] font-bold ${slide.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-slate-600'}`}>{slide.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 p-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-[10px] font-bold text-slate-800">{slide.cta_label ?? slide.cta ?? 'Explore Collection'}</h2>
                                            <p className="mt-0.5 truncate text-[9px] text-slate-500">Order {slide.sort_order ?? 0} · {slide.cta_link ?? slide.link ?? '/products'}</p>
                                        </div>
                                        <div className="flex shrink-0 gap-1.5">
                                            <button type="button" onClick={() => openSlide(slide)} disabled={busy} aria-label={`Edit ${slide.cta_label || slide.cta || 'hero slide'}`} className="rounded border border-stone-200 p-2 text-slate-600 hover:bg-stone-50 disabled:opacity-50"><Pencil size={12} /></button>
                                            <button type="button" onClick={() => remove(slide)} disabled={busy} aria-label={`Delete ${slide.cta_label || slide.cta || 'hero slide'}`} className="rounded border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>}
            </SectionCard>

            {draft && <SectionCard className="mt-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-[12px] font-extrabold text-slate-800">{draft.id ? 'Edit hero slide' : 'New hero slide'}</h2>
                    <button type="button" onClick={() => { setDraft(null); setError(''); }} className="text-[9px] font-semibold text-slate-500 hover:text-slate-800">Close</button>
                </div>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>CTA button text
                        <input required maxLength={120} value={draft.cta_label} onChange={(event) => setDraft((current) => ({ ...current, cta_label: event.target.value }))} className={fieldClass} />
                    </label>
                    <label className={labelClass}>Link (relative path or HTTP(S))
                        <input required maxLength={2000} value={draft.cta_link} onChange={(event) => setDraft((current) => ({ ...current, cta_link: event.target.value }))} placeholder="/products" className={fieldClass} />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Image URL
                        <input required maxLength={4000} value={draft.image} onChange={(event) => setDraft((current) => ({ ...current, image: event.target.value }))} placeholder="https://…" className={fieldClass} />
                    </label>
                    {draft.image && <div className="sm:col-span-2"><img src={draft.image} alt="Hero slide preview" className="h-36 w-full rounded-md border border-stone-200 bg-stone-50 object-cover" /></div>}
                    <label className={labelClass}>Sort order
                        <input required type="number" min="0" step="1" value={draft.sort_order} onChange={(event) => setDraft((current) => ({ ...current, sort_order: event.target.value }))} className={fieldClass} />
                    </label>
                    <label className="flex items-center gap-2 self-end pb-2 text-[10px] font-semibold text-slate-600"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} className="accent-[#a94e2b]" />Active slide</label>
                    <div className="flex justify-end gap-2 border-t border-stone-100 pt-3 sm:col-span-2">
                        <button type="button" onClick={() => { setDraft(null); setError(''); }} className="rounded-md border border-stone-200 px-3 py-2 text-[10px] font-semibold text-slate-600">Cancel</button>
                        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12} />{busy ? 'Saving…' : 'Save slide'}</button>
                    </div>
                </form>
            </SectionCard>}
        </div>
    );
};
