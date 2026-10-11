import React, { useState } from 'react';
import {
    Activity, ArrowRight, Boxes, CheckCircle2, Coins, Package, Send,
    CircleAlert, ShoppingBag, Sparkles, Users,
} from 'lucide-react';
import { SalesChart } from './SalesChart';
import { currency, dateTime, SectionCard, SectionTitle, StatusPill } from './shared';

const prompts = [
    'Summarize today’s orders and revenue',
    'Find products with low stock',
    'Show SEO issues in product listings',
];

const Sparkline = ({ values, color }) => {
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    const points = values.map((value, index) => {
        const x = values.length < 2 ? 50 : 3 + (index * 94) / (values.length - 1);
        const y = 26 - ((value - min) / range) * 20;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 32" role="img" aria-label="Seven-day trend" className="h-8 w-[78px] shrink-0 overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.split(' ').map((point, index) => {
                const [cx, cy] = point.split(',');
                return <circle key={index} cx={cx} cy={cy} r="1.8" fill={color} />;
            })}
        </svg>
    );
};

const MetricCard = ({ icon: Icon, label, value, note, trend, accent = 'orange', warning = false }) => {
    const colors = {
        orange: 'bg-orange-50 text-orange-700',
        green: 'bg-emerald-50 text-emerald-700',
        blue: 'bg-blue-50 text-blue-700',
        purple: 'bg-violet-50 text-violet-700',
    };
    const trendColors = {
        orange: '#e56a18',
        green: '#16865b',
        blue: '#3973b8',
        purple: '#8b4caf',
    };
    return (
        <article className={`min-h-[100px] rounded-md border p-3 ${warning ? 'border-orange-200 bg-[#fff5ec]' : 'border-[#e6e1da] bg-[#fffdfa]'}`}>
            <div className="flex items-center gap-2 text-[10px] text-slate-600"><span className={`grid h-7 w-7 place-items-center rounded ${colors[accent]}`}><Icon size={14} /></span>{label}</div>
            <div className="mt-2 flex items-end justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[19px] font-extrabold leading-none text-[#283347]">{value}</p>
                    <p className={`mt-1.5 text-[9px] ${warning ? 'text-orange-700' : 'text-slate-500'}`}>{note}</p>
                </div>
                {trend && <Sparkline values={trend} color={trendColors[accent]} />}
            </div>
        </article>
    );
};

const DashboardAssistant = ({ enabled, providerConfigured, onRun, submitting }) => {
    const [prompt, setPrompt] = useState('');
    const [answer, setAnswer] = useState('');

    const ask = async (value = prompt) => {
        const response = await onRun(value);
        if (response) {
            setAnswer(response.answer);
            setPrompt(value);
        }
    };

    return (
        <SectionCard className="bg-[#fffdfa]">
            <SectionTitle icon={Sparkles} title="AI Command Center" />
            <p className="mb-2 text-[9px] leading-4 text-slate-500">Ask about your store, get insights.</p>
            <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="flex items-center gap-1 rounded border border-stone-200 bg-white p-1">
                <input value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1500} placeholder="Ask me anything…" aria-label="Ask AI about the store" className="min-w-0 flex-1 px-2 py-2 text-[9px] outline-none" />
                <button type="submit" disabled={submitting || !prompt.trim() || !enabled || !providerConfigured} aria-label="Ask AI" className="rounded bg-[#c9532d] p-2 text-white disabled:opacity-40">{submitting ? <span className="block h-[13px] w-[13px] animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={13} />}</button>
            </form>
            <p className="mb-1 mt-3 text-[9px] text-slate-500">Try these examples:</p>
            <div className="space-y-1">
                {prompts.map((example) => <button key={example} type="button" onClick={() => ask(example)} disabled={submitting || !enabled || !providerConfigured} className="flex w-full items-center justify-between rounded border border-stone-100 px-2 py-1.5 text-left text-[8px] text-slate-600 hover:border-orange-200 disabled:opacity-40"><span className="truncate">{example}</span><ArrowRight size={11} className="shrink-0" /></button>)}
            </div>
            {answer && <p className="mt-3 line-clamp-4 rounded bg-orange-50 p-2 text-[9px] leading-4 text-slate-700">{answer}</p>}
        </SectionCard>
    );
};

export const DashboardPage = ({ store, settings, providerConfigured, goTo, onRunCommand, submitting }) => {
    const pendingOrders = store.recentOrders.filter((order) => ['pending', 'processing'].includes(String(order.status).toLowerCase())).length;
    const topProducts = store.topProducts.slice(0, 4);
    const financials = store.financials;
    const financialScopeNote = store.financialsTruncated ? 'Latest 1,000 orders · legacy dashboard limit' : '';
    const financialNote = 'Unavailable · restart dashboard API';

    return (
        <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Coins} label="Total Sales" value={currency(store.today.sales)} note="Today · excluding cancelled" trend={store.salesTrend.map((point) => Number(point.sales) || 0)} accent="green" />
                <MetricCard icon={ShoppingBag} label="Total Orders" value={store.today.orders} note="Orders placed today" trend={store.salesTrend.map((point) => Number(point.orders) || 0)} accent="orange" />
                <MetricCard icon={Users} label="Total Customers" value={new Intl.NumberFormat('en-NP').format(store.today.customers)} note="Unique buyers · excludes cancelled/refunded orders" trend={store.salesTrend.map((point) => Number(point.customers) || 0)} accent="purple" />
                <MetricCard icon={CircleAlert} label="Low Stock Products" value={store.today.lowStockCount} note={store.today.lowStockCount ? 'Needs attention · view inventory' : 'Inventory looks healthy'} warning={store.today.lowStockCount > 0} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Package} label="Registry Volume" value={financials ? currency(financials.registryVolume) : '—'} note={financials ? financialScopeNote || 'Gross non-cancelled order value' : financialNote} accent="blue" />
                <MetricCard icon={Coins} label="MCS Shares" value={financials ? currency(financials.mcsShares) : '—'} note={financials ? financialScopeNote || 'Commission from non-cancelled orders' : financialNote} accent="purple" />
                <MetricCard icon={CircleAlert} label="Due for Disbursement" value={financials ? currency(financials.dueForDisbursement) : '—'} note={financials ? financialScopeNote || 'Eligible seller payouts not yet settled' : financialNote} accent="orange" />
                <MetricCard icon={CheckCircle2} label="Settled Funds" value={financials ? currency(financials.settledFunds) : '—'} note={financials ? financialScopeNote || 'Seller payouts marked as paid' : financialNote} accent="green" />
            </div>

            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(235px,1fr)_minmax(205px,.88fr)]">
                <div className="space-y-3">
                    <SectionCard>
                        <SectionTitle icon={Activity} title="Sales Overview" action="Last 7 days" />
                        <SalesChart trend={store.salesTrend} />
                        {store.salesDataTruncated && <p className="mt-2 text-[9px] text-amber-700">Trend includes the latest 2,000 orders.</p>}
                    </SectionCard>

                    <SectionCard>
                        <SectionTitle icon={ShoppingBag} title="Recent Orders" action="View All" onAction={() => goTo('orders')} />
                        {store.recentOrders.length === 0 ? <p className="py-6 text-center text-[10px] text-slate-500">No orders have been placed yet.</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[425px] text-left text-[9px]">
                                    <thead className="border-b border-stone-100 text-slate-500"><tr><th className="py-2 pr-2">Order ID</th><th className="px-2 py-2">Amount</th><th className="px-2 py-2">Status</th><th className="py-2 pl-2 text-right">Date</th></tr></thead>
                                    <tbody>{store.recentOrders.slice(0, 5).map((order) => <tr key={order.id} className="border-b border-stone-50 last:border-0"><td className="py-2.5 pr-2 font-bold text-slate-700">#{String(order.id).slice(-8)}</td><td className="px-2 py-2.5">{currency(order.total)}</td><td className="px-2 py-2.5"><StatusPill status={order.status} /></td><td className="py-2.5 pl-2 text-right text-slate-500">{dateTime(order.date)}</td></tr>)}</tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>

                <div className="space-y-3">
                    <SectionCard>
                        <SectionTitle icon={Sparkles} title="AI Insights & Recommendations" action="View All" onAction={() => goTo('ai-command-center')} />
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-700"><Boxes size={13} /></span>
                                <p className="flex-1 text-[9px] leading-4 text-slate-600">{store.today.lowStockCount} products are at or below the {settings.lowStockThreshold}-unit stock threshold.</p>
                                <button type="button" onClick={() => goTo('inventory')} className="text-[8px] font-bold text-[#b74d29]">Inventory</button>
                            </div>
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ShoppingBag size={13} /></span>
                                <p className="flex-1 text-[9px] leading-4 text-slate-600">{store.today.orders} orders recorded today with {currency(store.today.sales)} in non-cancelled sales.</p>
                                <button type="button" onClick={() => goTo('analytics')} className="text-[8px] font-bold text-[#b74d29]">Report</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><CheckCircle2 size={13} /></span>
                                <p className="flex-1 text-[9px] leading-4 text-slate-600">{pendingOrders} pending or processing orders in the latest order list.</p>
                                <button type="button" onClick={() => goTo('orders')} className="text-[8px] font-bold text-[#b74d29]">Orders</button>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard>
                        <SectionTitle icon={Package} title="Top Selling Products" action="View All" onAction={() => goTo('products')} />
                        {topProducts.length === 0 ? <p className="py-3 text-[9px] text-slate-500">No product sales data is available yet.</p> : <ul className="divide-y divide-stone-100">{topProducts.map((product, index) => <li key={product.id} className="flex items-center justify-between gap-2 py-2"><span className="flex min-w-0 items-center gap-2"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-orange-50">{(product.image || product.images?.[0]) ? <img src={product.image || product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[8px] font-bold text-orange-700">{index + 1}</span>}</span><span className="truncate text-[9px] text-slate-700">{product.name}</span></span><span className="shrink-0 text-[8px] text-slate-500">{product.sold} sold</span></li>)}</ul>}
                    </SectionCard>
                </div>

                <div className="space-y-3">
                    <DashboardAssistant enabled={settings.enabled} providerConfigured={providerConfigured} onRun={onRunCommand} submitting={submitting} />
                    <SectionCard>
                        <SectionTitle icon={ArrowRight} title="Quick Actions" />
                        <div className="space-y-1">
                            {[
                                ['View Products', 'products', Package],
                                ['View Orders', 'orders', ShoppingBag],
                                ['Check Inventory', 'inventory', Boxes],
                                ['Open AI Command Center', 'ai-command-center', Sparkles],
                            ].map(([label, route, Icon]) => <button key={route} type="button" onClick={() => goTo(route)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-[9px] text-slate-600 hover:bg-orange-50 hover:text-[#a94727]"><Icon size={13} className="text-[#c45a2e]" />{label}</button>)}
                        </div>
                    </SectionCard>
                    <SectionCard>
                        <SectionTitle icon={Activity} title="System Status" />
                        <div className="space-y-2 text-[9px]">
                            {[['Store API', true], ['Database', true], ['AI Service', providerConfigured]].map(([label, online]) => <div key={label} className="flex items-center justify-between"><span className="text-slate-600">{label}</span><span className={`inline-flex items-center gap-1 ${online ? 'text-emerald-700' : 'text-amber-700'}`}><i className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />{online ? 'Online' : 'Unavailable'}</span></div>)}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};
