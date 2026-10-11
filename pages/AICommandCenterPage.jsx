import React, { useState } from 'react';
import { Bot, CircleAlert, LoaderCircle, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { currency, PageHeading, SectionCard } from './shared';

const prompts = [
    'Summarize today’s orders and sales.',
    'Show products that are low on stock.',
    'Audit products for missing descriptions, tags, and images.',
];

export const AICommandCenterPage = ({ enabled, providerConfigured, onRunCommand, submitting }) => {
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const run = async (value = prompt) => {
        setError('');
        try {
            const response = await onRunCommand(value);
            setResult(response);
            setPrompt(value);
        } catch (runError) {
            setError(runError.message || 'Unable to run this report.');
        }
    };

    return (
        <div>
            <PageHeading title="AI Command Center" description="Ask read-only questions about store sales, inventory, and product completeness." />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)]">
                <SectionCard>
                    <h2 className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={17} className="text-[#c45a2e]" />Ask your store assistant</h2>
                    <div className="mt-4 flex flex-wrap gap-2">{prompts.map((item) => <button key={item} type="button" onClick={() => run(item)} disabled={submitting || !enabled || !providerConfigured} className="rounded-full border border-stone-200 px-3 py-2 text-left text-[10px] text-slate-600 hover:border-orange-300 disabled:opacity-40">{item}</button>)}</div>
                    <form onSubmit={(event) => { event.preventDefault(); run(); }} className="mt-4">
                        <label htmlFor="ai-page-prompt" className="sr-only">Ask a read-only store question</label>
                        <textarea id="ai-page-prompt" rows={4} maxLength={1500} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="For example: Show me low-stock products and explain the current stock risk." className="w-full resize-y rounded-lg border border-stone-200 bg-white p-3 text-xs outline-none focus:border-[#c45a2e]" />
                        <div className="mt-2 flex items-center justify-between gap-3"><p className="text-[9px] text-slate-500">Up to 1,500 characters · read-only reports</p><button type="submit" disabled={submitting || !prompt.trim() || !enabled || !providerConfigured} className="inline-flex items-center gap-2 rounded-md bg-[#a94e2b] px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-40">{submitting ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}{submitting ? 'Preparing report…' : 'Ask assistant'}</button></div>
                    </form>
                    {error && <p role="alert" className="mt-3 flex items-center gap-2 text-[10px] text-rose-700"><CircleAlert size={13} />{error}</p>}
                    {result && <article className="mt-5 rounded-lg border border-orange-100 bg-orange-50 p-4"><h3 className="text-[10px] font-bold uppercase tracking-wide text-[#a94727]">{result.taskType.replaceAll('_', ' ')}</h3><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-700">{result.answer}</p><p className="mt-3 border-t border-orange-100 pt-2 text-[9px] text-slate-500">Provider usage: {result.usage.inputTokens} input / {result.usage.outputTokens} output tokens. {result.usage.estimatedCostUsd === null ? 'Estimated cost unavailable.' : `Estimated cost: $${result.usage.estimatedCostUsd.toFixed(6)}.`}</p></article>}
                </SectionCard>
                <div className="space-y-4">
                    <SectionCard>
                        <h2 className="flex items-center gap-2 text-sm font-extrabold"><Bot size={16} className="text-[#c45a2e]" />Available reports</h2>
                        <ul className="mt-3 space-y-3 text-[10px] text-slate-600"><li><strong className="block text-slate-800">Orders and sales</strong>Today’s order count, value, and status mix.</li><li><strong className="block text-slate-800">Low-stock inventory</strong>Products at or below the configured threshold.</li><li><strong className="block text-slate-800">Product completeness</strong>Missing descriptions, categories, images, tags, and codes.</li></ul>
                    </SectionCard>
                    <SectionCard>
                        <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-emerald-700" />Data and safety</h2>
                        <p className="mt-3 text-[10px] leading-5 text-slate-600">Queries are read-only. Customer names, emails, addresses, and payment details are not sent to the AI provider. Dashboard users share the store-wide AI budget.</p>
                    </SectionCard>
                    {!enabled && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800">AI reports are paused in Settings.</p>}
                    {enabled && !providerConfigured && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800">The server-side AI provider is not configured.</p>}
                </div>
            </div>
        </div>
    );
};
