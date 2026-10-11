import React, { useMemo, useState } from 'react';
import { Printer, Search, ShoppingBag } from 'lucide-react';
import { currency, dateTime, PageHeading, SectionCard, StatusPill } from './shared';

const statusOptions = ['pending', 'confirmed', 'packing', 'billing', 'shipped', 'arrived', 'delivered', 'cancelled'];

const Invoice = ({ order, onClose }) => (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 print:static print:block print:bg-white print:p-0">
        <div className="invoice-print-root max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:p-0 print:shadow-none">
            <div className="mb-4 flex justify-end gap-2 print:hidden">
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded bg-[#a94e2b] px-3 py-2 text-[10px] font-bold text-white"><Printer size={13} /> Print bill</button>
                <button type="button" onClick={onClose} className="rounded border px-3 py-2 text-[10px]">Close</button>
            </div>
            <article className="mx-auto max-w-3xl space-y-6 text-stone-900 print:max-w-full print:space-y-4">
                <header className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5 print:pb-3">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <img className="h-12 w-12 rounded-lg object-contain" src="https://res.cloudinary.com/djmbuuz28/image/upload/v1761108817/logo.png" alt="Mithila Chitrakala Store" />
                            <div><h1 className="font-playfair text-xl font-black tracking-tight sm:text-2xl">Mithila Chitrakala Store</h1><p className="text-[8px] font-black uppercase tracking-[.25em] text-[#5c1111]/75">Premium Heritage Registry</p></div>
                        </div>
                        <div className="text-[9px] leading-relaxed text-stone-500">MCS Central Hub, Ward 13<br />Janakpur Dham, Nepal<br />PAN No: 14450215<br />contact@mithilachitrakalastore.com.np</div>
                    </div>
                    <div className="text-right">
                        <h2 className="font-playfair text-2xl font-black italic uppercase text-stone-200 sm:text-4xl print:text-stone-300">Tax Invoice</h2>
                        <div className="mt-2 space-y-1 text-[8px] font-black uppercase tracking-wider text-stone-400 sm:text-[9px]">
                            <p>Invoice No: <span className="text-stone-900">{order.invoice_no || 'DRAFT'}</span></p>
                            <p>Tracking ID: <span className="text-stone-900">{order.tracking_id || 'N/A'}</span></p>
                            <p>Date: <span className="text-stone-900">{new Date(order.date).toLocaleDateString('en-GB')}</span></p>
                        </div>
                        {order.invoice_no && <a className="mt-1 inline-block text-[8px] text-[#5c1111] underline print:hidden" href={`https://mithilachitrakalastore.com.np/verify/${encodeURIComponent(order.invoice_no)}`} target="_blank" rel="noreferrer">Verify invoice</a>}
                    </div>
                </header>
                <section className="border-y border-stone-100 py-4 print:py-2">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-[#5c1111]">Recipient Details</p>
                    <div className="flex justify-between gap-4 text-[10px]">
                        <div><p className="font-black">{order.customer?.name || 'Customer'}</p><p className="text-stone-500">{order.customer?.address || ''}<br />{order.customer?.city || ''}<br />T: {order.customer?.phone || '—'}</p></div>
                        <div className="text-right text-stone-500"><p>Order ID: <strong className="text-stone-900">#{order.id}</strong></p><p>Status: <strong className="capitalize text-stone-900">{order.status || 'pending'}</strong></p></div>
                    </div>
                </section>
                <table className="w-full text-left">
                    <thead className="bg-stone-50 text-[8px] font-black uppercase tracking-widest text-stone-400"><tr><th className="px-2 py-2">Masterpiece Description</th><th className="px-2 py-2 text-right">Order ID</th><th className="px-2 py-2 text-right">Quantity</th><th className="px-2 py-2 text-right">Unit Price</th><th className="px-2 py-2 text-right">Total</th></tr></thead>
                    <tbody className="divide-y divide-stone-100">{(order.items || []).map((item, index) => <tr key={`${item.id || item.name}-${index}`} className="text-[9px] print:text-[8px]"><td className="px-2 py-2"><p className="font-bold text-stone-900">{item.name || 'Store item'}</p><p className="mt-0.5 text-[7px] uppercase tracking-wider text-stone-400">{[item.material, item.category].filter(Boolean).join(' · ')}</p></td><td className="px-2 py-2 text-right">{item.sourceOrderId || order.id}</td><td className="px-2 py-2 text-right">{Number(item.quantity) || 1}</td><td className="px-2 py-2 text-right">{currency(item.price)}</td><td className="px-2 py-2 text-right font-bold">{currency((Number(item.price) || 0) * (Number(item.quantity) || 1))}</td></tr>)}</tbody>
                </table>
                <div className="flex justify-end border-t border-stone-100 pt-3">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-stone-400"><span>Subtotal</span><span className="text-stone-900">{currency(order.total)}</span></div>
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-wider text-stone-400"><span>Heritage Tax</span><span className="text-stone-900">Rs. 0</span></div>
                        <div className="print:hidden rounded-lg border border-stone-100 bg-stone-50 p-3 text-[8px] text-stone-500"><p className="mb-1 font-black uppercase tracking-widest text-[#5c1111]">Internal MCS Records</p><div className="flex justify-between"><span>MCS Commission ({order.commission_percentage ?? 0}%)</span><span>-{currency(order.commission_amount)}</span></div><div className="mt-1 flex justify-between"><span>Seller payable</span><span>{currency(order.seller_payable_amount)}</span></div></div>
                        <div className="flex items-baseline justify-between border-t-2 border-stone-900 pt-2"><span className="font-playfair text-sm font-black italic">Total Paid</span><span className="font-playfair text-xl font-black text-[#5c1111]">{currency(order.total)}</span></div>
                        <div className="text-right"><span className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[7px] font-black uppercase tracking-widest text-emerald-700">Payment Status: {order.customer_payment_status || order.payment_status || 'pending'}</span></div>
                    </div>
                </div>
                <footer className="flex items-end justify-between gap-4 border-t border-stone-100 pt-4 print:pt-2">
                    <div><p className="text-[8px] font-black uppercase tracking-widest text-[#5c1111]">✓ Certified Original Mithila Artifact</p><p className="mt-1 max-w-xs text-[7px] leading-relaxed text-stone-400">This invoice serves as a certificate of origin.<br />Scan the QR code to verify this invoice online.</p></div>
                    {order.invoice_no && <div className="text-center"><img className="h-16 w-16" alt="Invoice verification QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://mithilachitrakalastore.com.np/verify/${order.invoice_no}`)}`} /><p className="text-[7px] font-black uppercase tracking-wider text-stone-400">Scan to verify</p></div>}
                </footer>
            </article>
        </div>
    </div>
);

export const OrdersPage = ({ orders = [], searchTerm = '', currentUser, onAction, loading, billing = false }) => {
    const [filter, setFilter] = useState(searchTerm);
    const [statusFilter, setStatusFilter] = useState(billing ? 'billing' : 'all');
    const [invoice, setInvoice] = useState(null);
    const [workingId, setWorkingId] = useState(null);
    const isAdmin = currentUser?.role === 'admin';
    const filtered = useMemo(() => orders.filter((order) => {
        const query = filter.trim().toLowerCase();
        const matchesQuery = !query || String(order.id).toLowerCase().includes(query) || String(order.status).toLowerCase().includes(query) ||
            String(order.invoice_no || '').toLowerCase().includes(query) || String(order.customer?.name || '').toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || (billing
            ? statusFilter === 'billing'
                ? ['billing', 'packing', 'delivered'].includes(order.status)
                : String(order.customer_payment_status || order.payment_status || 'pending') === statusFilter
            : order.status === statusFilter);
        return matchesQuery && matchesStatus;
    }), [billing, filter, orders, statusFilter]);

    const act = async (action, payload, orderId) => {
        setWorkingId(orderId);
        try {
            await onAction(action, payload);
        } finally {
            setWorkingId(null);
        }
    };

    return (
        <div>
            <PageHeading title={billing ? 'Billing & Print' : 'Orders'} description={billing ? 'Review order billing, payment verification, seller payouts, and print customer invoices.' : 'Manage order fulfillment and payment status. Open Billing & Print to prepare customer invoices.'} />
            <SectionCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-500">Showing {filtered.length} of {orders.length} orders{loading ? ' · refreshing…' : ''}</p>
                    <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1"><Search size={13} className="text-slate-400" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search order, customer, invoice" className="w-48 text-[10px] outline-none" /></label>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-stone-200 bg-white px-1 text-[12px]">
                            {billing ? <><option value="billing">Billable orders</option><option value="pending">Payment pending</option><option value="done">Payment complete</option><option value="all">All billing states</option></> : <><option value="all">All order status</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</>}
                        </select>
                    </div>
                </div>
                {filtered.length === 0 ? <div className="py-12 text-center text-xs text-slate-500"><ShoppingBag size={20} className="mx-auto mb-2" />No matching orders.</div> : <div className="space-y-3">{filtered.map((order) => {
                    const sellerStatuses = ['pending', 'confirmed', 'packing'];
                    const availableStatuses = isAdmin ? statusOptions : [...new Set([...sellerStatuses, order.status])];
                    return <article key={order.id} className="rounded-lg border border-stone-100 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><p className="text-[11px] font-bold text-slate-800">Order #{order.id}</p><p className="mt-1 text-[9px] text-slate-500">{order.customer?.name || 'Customer'} · {order.invoice_no || 'No invoice number'} · {dateTime(order.date)}</p><p className="mt-1 text-[10px] font-semibold">{currency(order.total)} <span className="ml-2"><StatusPill status={order.status} /></span></p></div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select value={order.status} disabled={workingId === order.id || (!isAdmin && ['billing', 'arrived', 'delivered', 'shipped'].includes(order.status))} onChange={(event) => act('update-order-status', { orderId: order.id, status: event.target.value }, order.id)} className="rounded border border-stone-200 bg-white px-2 py-2 text-[9px] capitalize disabled:opacity-50">{availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                                {billing && <button type="button" onClick={() => setInvoice(order)} className="inline-flex items-center gap-1 rounded bg-[#a94e2b] px-2.5 py-2 text-[9px] font-bold text-white"><Printer size={12} /> Invoice / Print</button>}
                            </div>
                        </div>
                        <div className="mt-3 grid gap-2 border-t border-stone-100 pt-2 text-[9px] sm:grid-cols-3">
                            <p>Customer payment: <strong className="capitalize">{order.customer_payment_status || order.payment_status || 'pending'}</strong>{isAdmin && <button type="button" disabled={workingId === order.id} onClick={() => act('verify-customer-payment', { orderId: order.id, verified: !order.customer_payment_verified }, order.id)} className="ml-2 font-bold text-[#a94e2b] disabled:opacity-50">{order.customer_payment_verified ? 'Unverify' : 'Verify payment'}</button>}</p>
                            <p>Seller payable: <strong>{currency(order.seller_payable_amount)}</strong></p>
                            <p>Seller payout: <strong className="capitalize">{order.mcs_payment_status || 'pending'}</strong>{isAdmin && <button type="button" disabled={workingId === order.id || order.mcs_payment_status === 'done'} onClick={() => act('confirm-seller-payout', { orderId: order.id }, order.id)} className="ml-2 font-bold text-[#a94e2b] disabled:opacity-50">{order.mcs_payment_status === 'done' ? 'Paid' : 'Confirm payout'}</button>}</p>
                        </div>
                    </article>;
                })}</div>}
            </SectionCard>
            {invoice && <Invoice order={invoice} onClose={() => setInvoice(null)} />}
        </div>
    );
};

export const BillingPage = (props) => <OrdersPage {...props} billing />;
