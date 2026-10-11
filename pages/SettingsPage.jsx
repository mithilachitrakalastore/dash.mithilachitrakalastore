import React from 'react';
import { Pause, Play, Settings, ShieldCheck } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

const fields = [
    ['Daily AI request limit', 'dailyRequestLimit', 1, 1000, 1],
    ['Monthly AI request limit', 'monthlyRequestLimit', 1, 10000, 1],
    ['Low-stock threshold (units)', 'lowStockThreshold', 0, 100000, 1],
    ['Input cost / 1M tokens (USD)', 'inputCostPerMillionUsd', 0, 10000, 0.01],
    ['Output cost / 1M tokens (USD)', 'outputCostPerMillionUsd', 0, 10000, 0.01],
];

export const SettingsPage = ({ settings, draft, setDraft, onSave, onToggleAI, saving }) => (
    <div>
        <PageHeading title="Settings" description="Shared AI limits and reporting preferences for seller and administrator accounts." />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
            <SectionCard>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><Settings size={16} className="text-[#c45a2e]" />AI usage and inventory thresholds</h2>
                <form onSubmit={onSave} className="mt-4 grid gap-3 sm:grid-cols-2">
                    {fields.map(([label, key, min, max, step]) => <label key={key} className="text-[10px] font-semibold text-slate-600">{label}<input type="number" min={min} max={max} step={step} value={draft[key]} onChange={(event) => setDraft((previous) => ({ ...previous, [key]: event.target.value }))} className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-[#c45a2e]" /></label>)}
                    <button type="submit" disabled={saving} className="self-end rounded-md bg-[#a94e2b] px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save settings'}</button>
                </form>
            </SectionCard>
            <div className="space-y-4">
                <SectionCard>
                    <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-emerald-700" />AI service</h2>
                    <p className="mt-2 text-[10px] leading-5 text-slate-600">Pausing stops new AI reports for every dashboard user. Storefront orders and seller tools are unaffected.</p>
                    <button type="button" onClick={onToggleAI} disabled={saving} className={`mt-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold ${settings.enabled ? 'bg-orange-50 text-[#a94727]' : 'bg-emerald-50 text-emerald-800'} disabled:opacity-50`}>{settings.enabled ? <Pause size={13} /> : <Play size={13} />}{settings.enabled ? 'Pause AI reports' : 'Enable AI reports'}</button>
                </SectionCard>
                <SectionCard><h2 className="text-sm font-extrabold">Read-only data policy</h2><p className="mt-2 text-[10px] leading-5 text-slate-600">The AI dashboard can report on store records but cannot change products, stock, orders, payments, or customer accounts.</p></SectionCard>
            </div>
        </div>
    </div>
);
