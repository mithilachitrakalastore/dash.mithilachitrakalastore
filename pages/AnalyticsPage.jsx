import React from 'react';
import { Activity, ShoppingBag } from 'lucide-react';
import { SalesChart } from './SalesChart';
import { currency, PageHeading, SectionCard } from './shared';

export const AnalyticsPage = ({ store }) => {
    const weeklySales = store.salesTrend.reduce((sum, point) => sum + Number(point.sales || 0), 0);
    const weeklyOrders = store.salesTrend.reduce((sum, point) => sum + Number(point.orders || 0), 0);
    return (
        <div>
            <PageHeading title="Analytics & Reports" description="Seven-day sales and order activity from store records." />
            <div className="mb-4 grid gap-3 sm:grid-cols-2"><SectionCard><p className="text-[9px] uppercase tracking-wide text-slate-500">Sales in chart period</p><p className="mt-2 text-xl font-extrabold">{currency(weeklySales)}</p></SectionCard><SectionCard><p className="text-[9px] uppercase tracking-wide text-slate-500">Orders in chart period</p><p className="mt-2 flex items-center gap-2 text-xl font-extrabold"><ShoppingBag size={17} className="text-[#c45a2e]" />{weeklyOrders}</p></SectionCard></div>
            <SectionCard><h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold"><Activity size={16} className="text-[#c45a2e]" />Sales and orders · last 7 days</h2><SalesChart trend={store.salesTrend} />{store.salesDataTruncated && <p className="mt-3 text-[9px] text-amber-700">This trend is based on the latest 2,000 orders.</p>}</SectionCard>
        </div>
    );
};
