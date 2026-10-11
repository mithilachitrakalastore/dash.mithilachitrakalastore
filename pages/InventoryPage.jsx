import React, { useMemo, useState } from 'react';
import { Boxes, Search } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

export const InventoryPage = ({ products = [], threshold = 5 }) => {
    const [showLowStock, setShowLowStock] = useState(false);
    const [filter, setFilter] = useState('');
    const stock = useMemo(() => products.filter((product) => (!showLowStock || product.stock <= threshold) &&
        (!filter.trim() || product.name.toLowerCase().includes(filter.trim().toLowerCase()))), [filter, products, showLowStock, threshold]);

    return (
        <div>
            <PageHeading title="Inventory" description={`Stock overview · low-stock alert at ${threshold} units or less.`} />
            <SectionCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" aria-pressed={showLowStock} onClick={() => setShowLowStock((value) => !value)} className={`rounded-md px-3 py-1 text-[10px] font-bold ${showLowStock ? 'bg-[#a94e2b] text-white' : 'border border-stone-200 text-slate-600'}`}>{showLowStock ? 'Showing low stock' : 'Show low stock only'}</button>
                    <label className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-2"><Search size={13} className="text-slate-400" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter inventory" className="w-36 text-[8px] outline-none" /></label>
                </div>
                {stock.length === 0 ? <div className="py-12 text-center text-xs text-slate-500"><Boxes size={20} className="mx-auto mb-2" />No matching inventory records.</div> : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{stock.map((product) => { const image = (Array.isArray(product.image) ? product.image[0] : product.image) || product.images?.[0]; return <article key={product.id} className="flex items-center gap-3 rounded-md border border-stone-100 p-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">{image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-stone-300"><Boxes size={17} /></span>}</div><span className="min-w-0 flex-1"><strong className="block truncate text-[10px] text-slate-700">{product.name}</strong><small className="text-[9px] text-slate-500">{product.product_code || product.productCode || 'No product code'}</small></span><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${product.stock <= threshold ? 'bg-orange-100 text-orange-800' : 'bg-emerald-50 text-emerald-800'}`}>{product.stock} in stock</span></article>; })}</div>}
                <p className="mt-4 text-[9px] text-slate-400">Read-only snapshot · up to 2,000 products loaded.</p>
            </SectionCard>
        </div>
    );
};
