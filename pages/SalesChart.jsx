import React, { useMemo } from 'react';
import { currency, shortDate } from './shared';

export const SalesChart = ({ trend = [] }) => {
    const chart = useMemo(() => {
        const maxSales = Math.max(1, ...trend.map((point) => Number(point.sales) || 0));
        const maxOrders = Math.max(1, ...trend.map((point) => Number(point.orders) || 0));
        const coordinates = (value, max, index) => `${18 + index * 54},${154 - ((Number(value) || 0) / max) * 118}`;
        return {
            maxSales,
            sales: trend.map((point, index) => coordinates(point.sales, maxSales, index)).join(' '),
            orders: trend.map((point, index) => coordinates(point.orders, maxOrders, index)).join(' '),
        };
    }, [trend]);

    return (
        <div>
            <div className="mb-2 flex items-center justify-end gap-4 text-[9px] text-slate-500">
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#c9532d]" />Sales</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#e8b68f]" />Orders</span>
            </div>
            <div className="flex gap-2">
                <div className="flex h-40 flex-col justify-between pb-4 text-[8px] text-slate-400">
                    <span>{currency(chart.maxSales)}</span>
                    <span>{currency(chart.maxSales * 0.66)}</span>
                    <span>{currency(chart.maxSales * 0.33)}</span>
                    <span>Rs. 0</span>
                </div>
                <div className="min-w-0 flex-1">
                    <svg viewBox="0 0 360 166" role="img" aria-label="Sales and orders over the last seven days" className="h-40 w-full">
                        {[36, 75, 114, 154].map((y) => <line key={y} x1="0" x2="360" y1={y} y2={y} stroke="#eee9e2" strokeDasharray="3 4" />)}
                        {trend.length > 1 && <>
                            <polyline points={chart.orders} fill="none" stroke="#e8b68f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points={chart.sales} fill="none" stroke="#c9532d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {chart.sales.split(' ').map((point) => {
                                const [cx, cy] = point.split(',');
                                return <circle key={cx} cx={cx} cy={cy} r="2.7" fill="#c9532d" />;
                            })}
                        </>}
                    </svg>
                    <div className="mt-1 flex justify-between text-[8px] text-slate-500">{trend.map((point) => <span key={point.date}>{shortDate(point.date)}</span>)}</div>
                </div>
            </div>
        </div>
    );
};
