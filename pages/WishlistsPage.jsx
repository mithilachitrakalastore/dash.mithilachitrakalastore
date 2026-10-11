import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, RefreshCw, Search } from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { currency, PageHeading, SectionCard } from './shared';

export const WishlistsPage = ({ token }) => {
    const [wishlistData, setWishlistData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const loadWishlists = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setWishlistData(await aiDashboardService.getWishlists(token));
        } catch (loadError) {
            setError(loadError.message || 'Unable to load wishlist demand.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadWishlists(); }, [loadWishlists]);

    const products = useMemo(() => (wishlistData?.products || []).filter(({ product }) =>
        String(product?.name || '').toLowerCase().includes(search.trim().toLowerCase())
    ), [wishlistData, search]);

    return (
        <div>
            <PageHeading
                title="Wishlists"
                description="See which products customers have saved and where interest is strongest."
                action={<button type="button" onClick={loadWishlists} disabled={loading} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-stone-50 disabled:opacity-50"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Refresh</button>}
            />
            {error && <div role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-800">{error}<button type="button" onClick={loadWishlists} className="ml-2 font-bold underline">Retry</button></div>}
            {wishlistData?.truncated && <div role="status" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] text-amber-900">Results are capped at 20,000 wishlist entries; additional entries may be available.</div>}
            <SectionCard>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Heart size={14} className="text-[#c45a2e]" /><h2 className="text-[12px] font-extrabold text-slate-800">Product demand</h2></div>
                    <span className="text-[9px] text-slate-500">{loading ? 'Refreshing…' : `${wishlistData?.wishlistCount || 0} wishlist saves · ${wishlistData?.products?.length || 0} products`}</span>
                </div>
                <label className="mb-3 flex max-w-sm items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2"><Search size={12} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search wishlisted products…" aria-label="Search wishlisted products" className="w-full bg-transparent text-[10px] outline-none" /></label>
                {loading && !wishlistData ? <p className="py-10 text-center text-[10px] text-slate-500">Loading wishlist demand…</p>
                    : !error && products.length === 0 ? <p className="py-10 text-center text-[10px] text-slate-500">{search ? 'No matching wishlisted products.' : 'No products in wishlists yet.'}</p>
                        : <div className="divide-y divide-stone-100">
                            {products.map(({ product, count, customers, customersTruncated }) => {
                                const image = (Array.isArray(product.image) ? product.image[0] : product.image) ||
                                    (Array.isArray(product.images) ? product.images[0] : '');
                                return (
                                    <article key={product.id} className="flex items-center gap-3 py-3">
                                        <div className="relative h-12 w-12 shrink-0">
                                            {image ? <img src={image} alt="" loading="lazy" className="h-12 w-12 rounded-md border border-stone-100 object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-md bg-stone-100 text-stone-400"><Heart size={16} /></div>}
                                            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#a94e2b] px-1 text-[8px] font-bold text-white">{count}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate text-[10px] font-bold text-slate-800">{product.name}</h3>
                                            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">{currency(product.price)} · {count > 5 ? 'High demand' : 'Trending'}</p>
                                            <p className="mt-1 truncate text-[9px] text-slate-500" title={`${customers?.join(', ') || 'Anonymous'}${customersTruncated ? ', and more' : ''}`}>
                                                <span className="font-semibold text-slate-600">Interested collectors: </span>
                                                {customers?.length ? `${customers.join(', ')}${customersTruncated ? ', and more' : ''}` : 'Anonymous'}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>}
            </SectionCard>
        </div>
    );
};
