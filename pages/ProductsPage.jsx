import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Package, Pencil, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { currency, PageHeading, SectionCard } from './shared';

const emptyProduct = {
    name: '', description: '', product_code: '', key_features: '', price: '', compare_price: '', storeName: '',
    image: '', images: [], category: '', style: '', theme: '', tags: '', custom_tags: '',
    stock: '', location: '', material: '', length: '', delivery: '', instruction: '',
    authenticity: '', visible_to_users: false, advance_payment_enabled: false,
    advance_payment_type: 'percentage', advance_payment_value: '',
};

const fieldClass = 'w-full rounded-xl border border-stone-200 bg-[#f9f7f3] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-[#5c1111] focus:ring-2 focus:ring-[#5c1111]/10';
const labelClass = 'mb-2 block text-[13px] font-bold uppercase tracking-[0.1em] text-stone-700';
const sectionTitleClass = 'text-sm font-black uppercase tracking-[0.14em] text-stone-700';
const imageList = (images) => Array.isArray(images)
    ? images.filter((image) => typeof image === 'string' && image.trim())
    : typeof images === 'string' ? images.split(',').map((image) => image.trim()).filter(Boolean) : [];
const productImage = (product) => (Array.isArray(product.image) ? product.image[0] : product.image) || imageList(product.images)[0] || '';

export const ProductsPage = ({ products = [], categories = [], storeName = '', searchTerm = '', onAction, onUploadSignature, loading }) => {
    const [filter, setFilter] = useState(searchTerm);
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [formError, setFormError] = useState('');
    const fileInput = useRef(null);
    const filtered = useMemo(() => products.filter((product) => {
        const query = filter.trim().toLowerCase();
        return !query || String(product.name || '').toLowerCase().includes(query) ||
            String(product.product_code || '').toLowerCase().includes(query) ||
            String(product.category || '').toLowerCase().includes(query);
    }), [products, filter]);

    const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    const openProduct = (product = null) => {
        setNewCategory('');
        setFormError('');
        setDraft(product ? {
            ...emptyProduct,
            ...product,
            image: productImage(product),
            images: imageList(product.images),
            category: Array.isArray(product.category) ? product.category.join(', ') : product.category || '',
            price: product.price ?? '',
            compare_price: product.compare_price ?? '',
            stock: product.stock ?? '',
            advance_payment_enabled: Boolean(product.advance_payment_enabled),
            advance_payment_type: product.advance_payment_type || 'percentage',
            advance_payment_value: product.advance_payment_value ?? '',
        } : { ...emptyProduct, storeName });
    };

    const save = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            const images = [...new Set([draft.image, ...imageList(draft.images)].filter(Boolean))];
            await onAction('save-product', { productId: draft.id, product: { ...draft, images } });
            setDraft(null);
        } catch (error) {
            setFormError(error.message || 'Unable to save this product.');
        } finally {
            setBusy(false);
        }
    };

    const uploadImages = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        if (files.some((file) => !file.type.startsWith('image/'))) {
            window.alert('Please choose image files only.');
            event.target.value = '';
            return;
        }
        if (files.some((file) => file.size > 10 * 1024 * 1024)) {
            window.alert('Each image must be 10 MB or smaller.');
            event.target.value = '';
            return;
        }

        setUploading(true);
        try {
            const signature = await onUploadSignature();
            const urls = [];
            for (const file of files) {
                const form = new FormData();
                form.append('file', file);
                form.append('api_key', signature.apiKey);
                form.append('timestamp', String(signature.timestamp));
                form.append('folder', signature.folder);
                form.append('signature', signature.signature);
                const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, {
                    method: 'POST',
                    body: form,
                });
                const result = await response.json();
                if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary image upload failed.');
                urls.push(result.secure_url);
            }
            setDraft((current) => {
                const allImages = [...new Set([...imageList(current.images), ...urls])];
                return { ...current, image: current.image || allImages[0] || '', images: allImages };
            });
        } catch (error) {
            setFormError(error.message || 'Unable to upload product images.');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const addCategory = async () => {
        const name = newCategory.trim();
        if (!name) return;
        try {
            const { result } = await onAction('add-product-category', { category: name });
            const current = String(draft.category || '').split(',').map((item) => item.trim()).filter(Boolean);
            updateDraft('category', [...new Set([...current, result.name])].join(', '));
            setNewCategory('');
        } catch (error) {
            setFormError(error.message || 'Unable to save this category.');
        }
    };

    const toggleCategory = (category) => {
        const selected = String(draft.category || '').split(',').map((item) => item.trim()).filter(Boolean);
        updateDraft('category', selected.includes(category)
            ? selected.filter((item) => item !== category).join(', ')
            : [...selected, category].join(', '));
    };
    const advancePaymentAmount = !draft ? 0 : draft.advance_payment_type === 'percentage'
        ? (Number(draft.price) * Number(draft.advance_payment_value) / 100)
        : Number(draft.advance_payment_value);

    return (
        <div>
            <PageHeading title="Products" description="Manage product listings, images, prices, details, and stock in the store catalog." action={<button type="button" onClick={() => openProduct()} className="group inline-flex shrink-0 items-center gap-3 rounded-2xl border border-[#9b653d] bg-gradient-to-br from-[#6a1717] via-[#521010] to-[#35100f] px-4 py-2.5 text-left text-white shadow-[0_8px_20px_rgba(92,17,17,.2)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(92,17,17,.3)] focus:outline-none focus:ring-2 focus:ring-[#c98f52] focus:ring-offset-2 sm:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e8c58f]/50 bg-[#e8c58f]/10 text-[#f0ca8d] shadow-inner transition group-hover:rotate-3 group-hover:bg-[#e8c58f]/20">
                    <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                    <span className="block whitespace-nowrap text-sm font-bold leading-5">Add Product</span>
                    <span className="block whitespace-nowrap text-[10px] font-medium tracking-wide text-[#ead3b3]">Create an artifact listing</span>
                </span>
            </button>} />
            <SectionCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-500">{filtered.length} products {loading ? '· refreshing…' : ''}</p>
                    <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5"><Search size={13} className="text-slate-400" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search products" className="w-44 text-[10px] outline-none" /></label>
                </div>
                {filtered.length === 0 ? <div className="py-12 text-center text-xs text-slate-500"><Package size={20} className="mx-auto mb-2" />No matching products.</div> : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                        {filtered.map((product) => <article key={product.id} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="relative aspect-[4/3] overflow-hidden bg-[#f3eee6]">
                                {productImage(product)
                                    ? <img src={productImage(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                    : <div className="grid h-full place-items-center text-stone-300"><ImagePlus size={30} /><span className="sr-only">No product image</span></div>}
                                <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${product.visible_to_users ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{product.visible_to_users ? 'Published' : 'Hidden'}</span>
                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                    <button type="button" aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)} className="rounded-full bg-white/95 p-2 text-stone-700 shadow"><Pencil size={13} /></button>
                                    <button type="button" aria-label={`Delete ${product.name}`} onClick={async () => { if (window.confirm(`Delete “${product.name}”?`)) await onAction('delete-product', { productId: product.id }); }} className="rounded-full bg-white/95 p-2 text-rose-700 shadow"><Trash2 size={13} /></button>
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="truncate text-xs font-bold text-stone-900">{product.name}</p>
                                <p className="mt-1 truncate text-[9px] text-stone-500">{product.category || product.product_code || 'Mithila art'}</p>
                                <div className="mt-3 flex items-end justify-between border-t border-stone-100 pt-2">
                                    <span className="text-[12px] font-black text-[#5c1111]">{currency(product.price)}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800"><ShoppingBag size={11} />{Number(product.sold) || 0} sold</span>
                                        <span className={`text-[9px] font-bold ${Number(product.stock) <= 5 ? 'text-orange-700' : 'text-stone-500'}`}>{Number(product.stock) || 0} in stock</span>
                                    </div>
                                </div>
                                <div className="mt-2 flex justify-end gap-2 sm:hidden">
                                    <button type="button" onClick={() => openProduct(product)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px]"><Pencil size={11} /> Edit</button>
                                    <button type="button" onClick={async () => { if (window.confirm(`Delete “${product.name}”?`)) await onAction('delete-product', { productId: product.id }); }} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-[9px] text-rose-700"><Trash2 size={11} /> Delete</button>
                                </div>
                            </div>
                        </article>)}
                    </div>
                )}
            </SectionCard>
            {draft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211916]/75 p-2 backdrop-blur-sm sm:p-4">
                <form onSubmit={save} className="flex max-h-[96vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-[1.25rem] border border-[#d8c7ab] bg-[#f5f1e9] shadow-2xl">
                    <header className="flex shrink-0 items-center justify-between gap-4 bg-[#35211d] px-5 py-4 text-white sm:px-8">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d8b77b]/40 bg-[#d8b77b]/10 text-[#e6c994] sm:grid"><Package size={22} /></div>
                            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e6c994]">Mithila · Seller studio</p><h2 className="mt-1 truncate font-playfair text-2xl font-black sm:text-[27px]">{draft.id ? 'Refine your artwork' : 'Bring a new artwork to life'}</h2><p className="mt-1 text-xs text-[#e9ded4]">Build the listing, preview it, then publish when it is ready.</p></div>
                        </div>
                        <button type="button" onClick={() => setDraft(null)} aria-label="Close product form" className="shrink-0 rounded-full border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/20"><X size={18} /></button>
                    </header>
                    {formError && <p role="alert" className="mx-5 mt-3 shrink-0 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:mx-8">{formError}</p>}
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                        <div className="grid items-start gap-4 xl:grid-cols-[180px_minmax(0,1fr)_270px]">
                            <nav aria-label="Product listing sections" className="grid grid-cols-3 gap-2 xl:sticky xl:top-1 xl:grid-cols-1 xl:gap-3">
                                {[['01', 'Essentials', 'product-overview'], ['02', 'Story & craft', 'product-details'], ['03', 'Artwork images', 'product-images']].map(([number, label, target]) => <button key={target} type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="flex items-center gap-2 rounded-xl border border-[#e2d8c9] bg-white/80 p-2 text-left transition hover:border-[#8c5b43] hover:bg-white xl:gap-3 xl:p-3">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eee5d7] text-[10px] font-black text-[#75412f]">{number}</span><span className="text-[10px] font-bold text-stone-700 sm:text-xs">{label}</span>
                                </button>)}
                            </nav>
                            <div className="min-w-0 space-y-4">
                                <section id="product-overview" className="scroll-mt-3 rounded-2xl border border-[#e2d8c9] bg-white p-4 shadow-sm sm:p-6">
                                    <div className="mb-5 flex items-center justify-between"><h3 className={sectionTitleClass}>Product Overview</h3><span className="rounded-full bg-[#5c1111]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#5c1111]">Essential</span></div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="md:col-span-2"><span className={labelClass}>Product Name</span><input required value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className={fieldClass} placeholder="Enter product name" /></label>
                                        <div className="md:col-span-2">
                                            <span className={labelClass}>Categories</span>
                                            <div className="grid max-h-40 gap-1 overflow-y-auto rounded-xl border border-stone-200 bg-[#f9f7f3] p-3 sm:grid-cols-2">
                                                {categories.map((category) => <label key={category.id || category.name} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-stone-700 hover:bg-white"><input className="h-4 w-4 accent-[#5c1111]" type="checkbox" checked={String(draft.category).split(',').map((item) => item.trim()).includes(category.name)} onChange={() => toggleCategory(category.name)} />{category.name}</label>)}
                                                {!categories.length && <p className="text-xs text-stone-500">No saved categories yet; add one below.</p>}
                                            </div>
                                            <div className="mt-2 flex gap-2"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className={`${fieldClass} py-2.5`} placeholder="Create a category" /><button type="button" onClick={addCategory} className="shrink-0 rounded-xl border border-[#5c1111] px-4 text-xs font-bold text-[#5c1111]">Add category</button></div>
                                        </div>
                                        <label><span className={labelClass}>Price (Rs.)</span><input required type="number" min="0" step="0.01" value={draft.price} onChange={(event) => updateDraft('price', event.target.value)} className={fieldClass} placeholder="0" /></label>
                                        <label><span className={labelClass}>Compare Price (Rs.)</span><input type="number" min="0" step="0.01" value={draft.compare_price} onChange={(event) => updateDraft('compare_price', event.target.value)} className={fieldClass} placeholder="0" /></label>
                                        <label><span className={labelClass}>Stock Quantity</span><input required type="number" min="0" step="1" value={draft.stock} onChange={(event) => updateDraft('stock', event.target.value)} className={fieldClass} placeholder="0" /></label>
                                        <label><span className={labelClass}>Product Code</span><input value={draft.product_code} onChange={(event) => updateDraft('product_code', event.target.value)} className={fieldClass} placeholder="MCS-ART-102" /></label>
                                        <div className="md:col-span-2 rounded-xl border border-[#e2d8c9] bg-[#fcfaf7] p-4">
                                            <label className="flex cursor-pointer items-start gap-3">
                                                <input type="checkbox" checked={Boolean(draft.advance_payment_enabled)} onChange={(event) => updateDraft('advance_payment_enabled', event.target.checked)} className="mt-1 h-4 w-4 accent-[#5c1111]" />
                                                <span><strong className="block text-sm font-bold text-stone-800">Offer an advance payment</strong><small className="mt-1 block text-xs leading-5 text-stone-500">Set the required deposit for this product. No payment gateway is used; an administrator verifies payments manually in Orders / Billing.</small></span>
                                            </label>
                                            {draft.advance_payment_enabled && <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                <label><span className={labelClass}>Advance type</span><select value={draft.advance_payment_type} onChange={(event) => updateDraft('advance_payment_type', event.target.value)} className={fieldClass}><option value="percentage">Percentage of product price</option><option value="fixed">Fixed amount (Rs.)</option></select></label>
                                                <label><span className={labelClass}>{draft.advance_payment_type === 'percentage' ? 'Advance percentage (%)' : 'Advance amount (Rs.)'}</span><input required type="number" min="0.01" max={draft.advance_payment_type === 'percentage' ? 100 : Number(draft.price) || undefined} step="0.01" value={draft.advance_payment_value} onChange={(event) => updateDraft('advance_payment_value', event.target.value)} className={fieldClass} placeholder={draft.advance_payment_type === 'percentage' ? 'e.g. 30' : 'e.g. 500'} /></label>
                                                <p className="text-xs text-stone-600 sm:col-span-2">{Number.isFinite(advancePaymentAmount) && advancePaymentAmount > 0 ? `Advance due: ${currency(advancePaymentAmount)}` : 'Enter an advance value greater than zero.'}</p>
                                            </div>}
                                        </div>
                                    </div>
                                </section>
                                <section id="product-details" className="scroll-mt-3 rounded-2xl border border-[#e2d8c9] bg-white p-4 shadow-sm sm:p-6">
                                    <div className="mb-5 flex items-center justify-between"><h3 className={sectionTitleClass}>Details & Craftsmanship</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">Metadata</span></div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label><span className={labelClass}>Style</span><select value={draft.style || ''} onChange={(event) => updateDraft('style', event.target.value)} className={fieldClass}><option value="">Choose a style</option>{['Traditional', 'Modern', 'Folk', 'Contemporary', 'Minimal'].map((value) => <option key={value}>{value}</option>)}</select></label>
                                        <label><span className={labelClass}>Theme</span><select value={draft.theme || ''} onChange={(event) => updateDraft('theme', event.target.value)} className={fieldClass}><option value="">Choose a theme</option>{['Nature', 'Floral', 'Birds', 'Devotional', 'Mythology', 'Village Life', 'Folklore', 'Abstract'].map((value) => <option key={value}>{value}</option>)}</select></label>
                                        {[['material', 'Material', 'Canvas, wood'], ['length', 'Dimensions', '12x16 inches'], ['delivery', 'Delivery Time', '7–10 days'], ['location', 'Location', 'Janakpur'], ['instruction', 'Care Instructions', 'Keep away from direct sunlight'], ['authenticity', 'Authenticity', 'Certified authentic Mithila art'], ['tags', 'Tags', 'folk art, handmade'], ['custom_tags', 'Custom Tags', 'heritage, hand-painted']].map(([key, label, placeholder]) => <label key={key} className={['instruction', 'authenticity'].includes(key) ? 'md:col-span-2' : ''}><span className={labelClass}>{label}</span><input value={draft[key] || ''} onChange={(event) => updateDraft(key, event.target.value)} className={fieldClass} placeholder={placeholder} /></label>)}
                                        <label className="md:col-span-2"><span className={labelClass}>Description</span><textarea value={draft.description || ''} onChange={(event) => updateDraft('description', event.target.value)} className={`${fieldClass} min-h-24`} /></label>
                                        <label className="md:col-span-2"><span className={labelClass}>Key Features (one per line)</span><textarea value={draft.key_features || ''} onChange={(event) => updateDraft('key_features', event.target.value)} className={`${fieldClass} min-h-24`} placeholder={'Feature | Detail'} /></label>
                                    </div>
                                </section>
                                <section id="product-images" className="scroll-mt-3 rounded-2xl border border-[#e2d8c9] bg-white p-4 shadow-sm sm:p-6">
                                    <div className="mb-4 flex items-center justify-between"><h3 className={sectionTitleClass}>Product Images</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">Media</span></div>
                                    <div className="mb-3 flex items-center justify-between gap-3"><span className={`${labelClass} mb-0`}>Add product photos</span><button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="rounded-xl bg-[#5c1111] px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-white disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload Images'}</button><input ref={fileInput} type="file" accept="image/*" multiple onChange={uploadImages} className="hidden" /></div>
                                    <label><span className={labelClass}>Primary Image URL</span><input type="url" value={draft.image || ''} onChange={(event) => updateDraft('image', event.target.value)} className={fieldClass} placeholder="https://…" /></label>
                                    {!!imageList(draft.images).length && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{imageList(draft.images).map((url) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl border"><img src={url} alt="Product" className="h-full w-full object-cover" /><button type="button" onClick={() => setDraft((current) => { const images = imageList(current.images).filter((image) => image !== url); return { ...current, images, image: current.image === url ? images[0] || '' : current.image }; })} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-700"><X size={12} /></button></div>)}</div>}
                                    <p className="mt-2 text-xs text-stone-500">Upload image files (10 MB maximum each) or paste a direct image URL.</p>
                                </section>
                            </div>
                            <aside className="space-y-3 xl:sticky xl:top-1">
                                <section className="overflow-hidden rounded-2xl border border-[#e2d8c9] bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-700">Storefront preview</h3><span className="rounded-full bg-[#f3eee6] px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-[#75412f]">Live</span></div>
                                    <div className="aspect-[4/3] bg-[#f3eee6]">{draft.image || imageList(draft.images)[0]
                                        ? <img src={draft.image || imageList(draft.images)[0]} alt="Listing preview" className="h-full w-full object-cover" />
                                        : <div className="grid h-full place-items-center text-[#b6a58c]"><div className="text-center"><ImagePlus size={28} className="mx-auto mb-2" /><span className="text-[10px] font-semibold">Your artwork image</span></div></div>}</div>
                                    <div className="p-4"><p className="line-clamp-2 font-playfair text-lg font-bold text-stone-900">{draft.name || 'Your artwork title'}</p><p className="mt-1 truncate text-[10px] text-stone-500">{String(draft.category || '').split(',')[0] || 'Mithila handmade art'}</p><div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3"><span className="text-sm font-black text-[#5c1111]">{currency(draft.price || 0)}</span><span className={`rounded-full px-2 py-1 text-[8px] font-bold ${draft.visible_to_users ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{draft.visible_to_users ? 'Visible in store' : 'Hidden from store'}</span></div></div>
                                </section>
                                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#e2d8c9] bg-white px-4 py-3"><span><strong className="block text-[10px] font-black uppercase tracking-wider text-stone-700">Publish listing</strong><small className="text-[10px] text-stone-500">Show this artwork in your store</small></span><input type="checkbox" checked={Boolean(draft.visible_to_users)} onChange={(event) => updateDraft('visible_to_users', event.target.checked)} className="h-4 w-4 accent-[#5c1111]" /></label>
                                <section className="rounded-xl border border-[#e2d8c9] bg-white p-4"><h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-700">Ready to publish?</h3><ul className="mt-3 space-y-2 text-[11px] text-stone-700">{[['Product name', Boolean(draft.name)], ['Price added', Number(draft.price) > 0], ['Inventory tracked', draft.stock !== ''], ['Product image', Boolean(draft.image || draft.images?.length)]].map(([label, done]) => <li key={label} className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>{done ? '✓' : '·'}</span>{label}</li>)}</ul></section>
                            </aside>
                        </div>
                    </div>
                    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e2d8c9] bg-white px-4 py-3 sm:px-7">
                        <p className="text-[11px] text-stone-500">{uploading ? 'Uploading artwork…' : 'Your changes are applied to the live catalog when saved.'}</p>
                        <div className="flex gap-2"><button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50">Discard</button><button disabled={busy || uploading} className="rounded-xl bg-[#5c1111] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-stone-900 disabled:opacity-50">{busy ? 'Saving…' : draft.id ? 'Save listing' : 'Publish listing'}</button></div>
                    </footer>
                </form>
            </div>}
        </div>
    );
};
