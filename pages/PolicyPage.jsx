import React, { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

export const PolicyPage = ({ commission, onAction, loading }) => {
    const [value, setValue] = useState(commission);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    useEffect(() => setValue(commission), [commission]);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await onAction('save-global-commission', { commission: Number(value) });
            setMessage('Commission policy saved.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeading title="Commission Policy" description="Set the platform fee used when new store orders are created." />
            <SectionCard className="max-w-xl">
                <form onSubmit={save} className="space-y-4">
                    <label className="block text-[10px] font-bold text-slate-700">Global commission rate (%)<span className="relative mt-1 block"><input aria-label="Global commission rate" type="number" min="0" max="100" step="0.1" required value={value} onChange={(event) => setValue(event.target.value)} className="w-full rounded border border-stone-200 bg-white px-3 py-2 pr-9 text-sm" /><Percent size={14} className="absolute right-3 top-2.5 text-slate-400" /></span></label>
                    <p className="text-[9px] leading-4 text-slate-500">This rate is applied to future orders by the store checkout API; it does not recalculate existing order ledgers.</p>
                    {message && <p role="status" className="text-[10px] text-emerald-700">{message}</p>}
                    <button type="submit" disabled={saving || loading} className="rounded bg-[#a94e2b] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save policy'}</button>
                </form>
            </SectionCard>
        </div>
    );
};
