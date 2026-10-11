import React from 'react';

export const currency = (value) => `Rs. ${new Intl.NumberFormat('en-NP', {
    maximumFractionDigits: 0,
}).format(Number(value) || 0)}`;

export const shortDate = (value) => new Date(`${value}T12:00:00+05:45`)
    .toLocaleDateString('en-NP', { month: 'short', day: 'numeric', timeZone: 'Asia/Kathmandu' });

export const dateTime = (value) => new Date(value)
    .toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kathmandu' });

export const SectionCard = ({ className = '', children, ...props }) => (
    <section className={`rounded-lg border border-[#e6e1da] bg-[#fffdfa] p-4 shadow-[0_1px_5px_rgba(30,26,22,.025)] ${className}`} {...props}>
        {children}
    </section>
);

export const SectionTitle = ({ icon: Icon, title, action, onAction }) => (
    <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800">
            <Icon size={15} className="text-[#c45a2e]" />
            {title}
        </h2>
        {action && <button type="button" onClick={onAction} className="text-[9px] font-semibold text-[#b74d29] hover:underline">{action}</button>}
    </div>
);

export const PageHeading = ({ title, description, action }) => (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
            <h1 className="font-playfair text-[22px] font-bold text-[#282624]">{title}</h1>
            {description && <p className="mt-1 text-[11px] text-slate-500">{description}</p>}
        </div>
        {action}
    </div>
);

export const StatusPill = ({ status }) => {
    const value = String(status || 'unknown').toLowerCase();
    const className = ['delivered', 'shipped', 'completed'].includes(value)
        ? 'bg-emerald-100 text-emerald-800'
        : ['cancelled', 'rejected'].includes(value)
            ? 'bg-rose-100 text-rose-800'
            : ['pending', 'processing'].includes(value)
                ? 'bg-amber-100 text-amber-800'
                : 'bg-stone-100 text-stone-700';
    return <span className={`rounded-full px-2 py-1 text-[9px] font-bold capitalize ${className}`}>{value}</span>;
};
