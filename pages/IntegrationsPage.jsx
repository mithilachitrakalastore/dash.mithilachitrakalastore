import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Cloud, Database, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { PageHeading, SectionCard } from './shared';

const providerIcons = { supabase: Database, gemini: Sparkles, 'ai-provider': Sparkles, resend: Mail, cloudinary: Cloud };

const statusStyle = {
    connected: 'bg-emerald-100 text-emerald-800',
    ready: 'bg-emerald-100 text-emerald-800',
    not_configured: 'bg-amber-100 text-amber-800',
    needs_attention: 'bg-rose-100 text-rose-800',
};

const statusLabel = {
    connected: 'Connected',
    ready: 'Configured',
    not_configured: 'Not configured',
    needs_attention: 'Needs attention',
};

export const IntegrationsPage = ({ token }) => {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadIntegrations = useCallback(async (initial = false) => {
        if (initial) setLoading(true);
        else setRefreshing(true);
        setError('');
        try {
            const data = await aiDashboardService.getIntegrations(token);
            setIntegrations(data.integrations || []);
        } catch (loadError) {
            setError(loadError.message || 'Unable to load integration status.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => { loadIntegrations(true); }, [loadIntegrations]);

    return (
        <div>
            <PageHeading
                title="Integrations"
                description="Monitor the services that power store operations, AI insights, email, and product media."
                action={<button type="button" onClick={() => loadIntegrations()} disabled={refreshing || loading} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />Refresh status</button>}
            />
            {error && <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-800" role="alert">{error}</p>}
            {loading
                ? <SectionCard className="py-10 text-center text-[10px] text-slate-500"><RefreshCw size={15} className="mx-auto mb-2 animate-spin" />Checking configured services…</SectionCard>
                : <div className="grid gap-3 md:grid-cols-2">
                    {integrations.map((integration) => {
                        const Icon = providerIcons[integration.id] || Activity;
                        return (
                            <SectionCard key={integration.id} className="flex flex-col">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-[#a94e2b]"><Icon size={18} /></span>
                                        <div className="min-w-0"><h2 className="truncate text-[12px] font-extrabold text-slate-800">{integration.name}</h2><p className="mt-0.5 text-[9px] text-slate-500">{integration.category}</p></div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${statusStyle[integration.status] || 'bg-stone-100 text-slate-700'}`}>{statusLabel[integration.status] || integration.status}</span>
                                </div>
                                <p className="mt-3 flex-1 text-[10px] leading-5 text-slate-600">{integration.description}</p>
                                <div className="mt-3 border-t border-stone-100 pt-2.5">
                                    <p className="text-[9px] font-semibold text-slate-700">Used for: {integration.capabilities.join(', ')}</p>
                                    <p className="mt-1 text-[8px] text-slate-400">{integration.status === 'connected' ? 'Live server-side connectivity check' : 'Availability is based on server-side configuration'}</p>
                                </div>
                            </SectionCard>
                        );
                    })}
                    {!integrations.length && !error && <SectionCard className="col-span-full py-8 text-center text-[10px] text-slate-500">No integrations are registered.</SectionCard>}
                </div>}
            <SectionCard className="mt-3 border-blue-100 bg-blue-50/50">
                <h2 className="text-[10px] font-extrabold text-slate-800">Credential and access policy</h2>
                <p className="mt-1 text-[9px] leading-5 text-slate-600">Provider credentials are managed in the dashboard server’s environment, never in browser storage or this page. Add a provider-specific API workflow before exposing controls for connecting, disconnecting, or changing permissions.</p>
            </SectionCard>
        </div>
    );
};
