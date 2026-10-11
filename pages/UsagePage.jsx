import React from 'react';
import { Activity, Coins } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

export const UsagePage = ({ usage, settings, audit }) => {
    const recentTokens = audit.reduce((sum, entry) => sum + Number(entry.input_tokens || 0) + Number(entry.output_tokens || 0), 0);
    return (
        <div>
            <PageHeading title="AI Usage & Costs" description="Shared request budgets and provider usage for this dashboard." />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SectionCard><p className="text-[9px] uppercase text-slate-500">Today</p><p className="mt-2 text-xl font-extrabold">{usage.dailyRequests} <span className="text-xs font-semibold text-slate-400">/ {settings.dailyRequestLimit}</span></p></SectionCard>
                <SectionCard><p className="text-[9px] uppercase text-slate-500">This month</p><p className="mt-2 text-xl font-extrabold">{usage.monthlyRequests} <span className="text-xs font-semibold text-slate-400">/ {settings.monthlyRequestLimit}</span></p></SectionCard>
                <SectionCard><p className="text-[9px] uppercase text-slate-500">Recent tokens · last 30 entries</p><p className="mt-2 text-xl font-extrabold">{new Intl.NumberFormat('en-NP').format(recentTokens)}</p></SectionCard>
                <SectionCard><p className="text-[9px] uppercase text-slate-500">Low-stock alert</p><p className="mt-2 text-xl font-extrabold">{settings.lowStockThreshold} <span className="text-xs font-semibold text-slate-400">units</span></p></SectionCard>
            </div>
            <SectionCard className="mt-4">
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><Coins size={16} className="text-[#c45a2e]" />Configured model rates</h2>
                <div className="mt-3 grid gap-3 text-[10px] sm:grid-cols-2"><p className="rounded bg-stone-50 p-3">Input: ${Number(settings.inputCostPerMillionUsd).toFixed(2)} per 1M tokens</p><p className="rounded bg-stone-50 p-3">Output: ${Number(settings.outputCostPerMillionUsd).toFixed(2)} per 1M tokens</p></div>
                <p className="mt-3 flex items-start gap-2 text-[9px] leading-4 text-slate-500"><Activity size={13} className="mt-0.5 shrink-0" />Costs shown in AI responses are estimates only. Request budgets are shared by sellers and administrators.</p>
            </SectionCard>
        </div>
    );
};
