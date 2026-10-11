import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, ExternalLink, Link2, LoaderCircle, Send, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { SectionCard } from './shared';

const platformLabels = { instagram: 'Instagram', facebook: 'Facebook Page', tiktok: 'TikTok' };
const platformStyles = {
    instagram: 'bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 text-white',
    facebook: 'bg-blue-600 text-white',
    tiktok: 'bg-slate-900 text-white',
};
const imageFromProduct = (product) => {
    const image = Array.isArray(product.image) ? product.image[0] : product.image;
    const images = Array.isArray(product.images)
        ? product.images
        : typeof product.images === 'string' ? product.images.split(',') : [];
    return [image, ...images].find((value) => typeof value === 'string' && value.startsWith('https://')) || '';
};
const statusLabel = { draft: 'Draft', publishing: 'Publishing', processing: 'Processing on TikTok', published: 'Published', failed: 'Failed' };

export const MarketingSocialPanel = ({ token, products = [] }) => {
    const [accounts, setAccounts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [providers, setProviders] = useState({ meta: false, tiktok: false, encryption: false, publicUrlConfigured: false });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [accountId, setAccountId] = useState('');
    const [caption, setCaption] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState('image');
    const [privacyLevel, setPrivacyLevel] = useState('');

    const refresh = async () => {
        const [social, postHistory] = await Promise.all([
            aiDashboardService.getMarketingSocial(token),
            aiDashboardService.getMarketingSocialPosts(token),
        ]);
        setAccounts(social.accounts || []);
        setProviders(social.providers || {});
        setPosts(postHistory.posts || []);
        setAccountId((current) => social.accounts?.some((account) => account.id === current)
            ? current
            : social.accounts?.[0]?.id || '');
    };
    useEffect(() => {
        let current = true;
        Promise.all([aiDashboardService.getMarketingSocial(token), aiDashboardService.getMarketingSocialPosts(token)])
            .then(([social, postHistory]) => {
                if (!current) return;
                setAccounts(social.accounts || []);
                setProviders(social.providers || {});
                setPosts(postHistory.posts || []);
                setAccountId(social.accounts?.[0]?.id || '');
            })
            .catch((loadError) => {
                if (current) setError(loadError.message || 'Unable to load social publishing tools.');
            })
            .finally(() => {
                if (current) setLoading(false);
            });
        const query = window.location.hash.split('?')[1] || '';
        const socialResult = new URLSearchParams(query).get('social');
        if (socialResult === 'connected') setNotice('Social account connected. Choose an account below to prepare a post.');
        else if (socialResult && socialResult !== 'authorization_cancelled') setError(`Social account connection did not finish (${socialResult.replaceAll('_', ' ')}). Check app configuration and try again.`);
        return () => { current = false; };
    }, [token]);

    const selectedAccount = useMemo(() => accounts.find((account) => account.id === accountId), [accounts, accountId]);
    const connect = async (provider) => {
        setBusy(`connect-${provider}`);
        setError('');
        try {
            const { authorizationUrl } = await aiDashboardService.connectMarketingSocial(provider, token);
            window.location.assign(authorizationUrl);
        } catch (connectError) {
            setError(connectError.message || 'Unable to start social account connection.');
            setBusy('');
        }
    };
    const disconnect = async (account) => {
        if (!window.confirm(`Disconnect ${account.account_name}? Saved posts will remain in the history, but new publishing will stop.`)) return;
        setBusy(account.id);
        setError('');
        try {
            await aiDashboardService.disconnectMarketingSocial(account.id, token);
            setAccounts((current) => current.filter((item) => item.id !== account.id));
            setNotice(`${account.account_name} disconnected.`);
        } catch (disconnectError) {
            setError(disconnectError.message || 'Unable to disconnect this account.');
        } finally {
            setBusy('');
        }
    };
    const publish = async (event) => {
        event.preventDefault();
        if (!selectedAccount) return;
        const confirmed = window.confirm(
            `Publish this post now to ${selectedAccount.account_name} on ${platformLabels[selectedAccount.platform]}? This will create a live post on that account.`
        );
        if (!confirmed) return;
        setBusy('publish');
        setError('');
        setNotice('');
        try {
            const { post } = await aiDashboardService.publishMarketingSocialPost({
                platform: selectedAccount.platform,
                accountId: selectedAccount.id,
                caption,
                mediaUrl: mediaType === 'text' ? '' : mediaUrl.trim(),
                mediaType,
                privacyLevel,
            }, token);
            setPosts((current) => [post, ...current]);
            setCaption('');
            setMediaUrl('');
            setNotice(post.status === 'processing'
                ? 'TikTok accepted the post. Check its status as processing completes.'
                : 'Your post was published successfully.');
        } catch (publishError) {
            setError(publishError.message || 'Unable to publish this post.');
            try { await refresh(); } catch { /* Keep the provider error visible. */ }
        } finally {
            setBusy('');
        }
    };
    const checkStatus = async (postId) => {
        setBusy(postId);
        setError('');
        try {
            const { post } = await aiDashboardService.refreshMarketingSocialPost(postId, token);
            setPosts((current) => current.map((item) => item.id === post.id ? post : item));
        } catch (statusError) {
            setError(statusError.message || 'Unable to check TikTok post status.');
        } finally {
            setBusy('');
        }
    };
    const mediaFromProduct = (event) => {
        const product = products.find((item) => String(item.id) === event.target.value);
        if (product) {
            const url = imageFromProduct(product);
            if (url) {
                setMediaUrl(url);
                setMediaType('image');
                if (!caption) setCaption(product.name || '');
            }
        }
    };

    return (
        <SectionCard>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Link2 size={15} className="text-[#c45a2e]" />Social accounts & publishing</h2>
                    <p className="mt-1 max-w-3xl text-[9px] leading-4 text-slate-500">Connect accounts through the platform authorization screen. Review the post and confirm before anything is published live.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button type="button" disabled={!providers.meta || !providers.encryption || !providers.publicUrlConfigured || busy !== ''} onClick={() => connect('meta')} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"><Share2 size={12} />Connect Meta</button>
                    <button type="button" disabled={!providers.tiktok || !providers.encryption || !providers.publicUrlConfigured || busy !== ''} onClick={() => connect('tiktok')} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45">♪ Connect TikTok</button>
                </div>
            </div>

            {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mb-3 rounded-md border px-3 py-2 text-[10px] ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}

            {(!providers.meta || !providers.tiktok || !providers.encryption || !providers.publicUrlConfigured) && <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[9px] leading-4 text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0" /><span>Connections need server-only Meta/TikTok app credentials, `AI_DASHBOARD_PUBLIC_URL`, and a 32-byte social-token encryption key. Platform review/permissions may also be required. Never put these secrets in frontend `VITE_*` settings.</span></div>}

            {loading ? <p className="py-6 text-center text-[10px] text-slate-500"><LoaderCircle size={13} className="mr-1 inline animate-spin" />Loading connections…</p> : (
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="space-y-2">
                        {accounts.length ? accounts.map((account) => (
                            <div key={account.id} className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 ${accountId === account.id ? 'border-[#bd6740]/50 bg-orange-50/40' : 'border-stone-100 bg-white'}`}>
                                <button type="button" onClick={() => { setAccountId(account.id); setPrivacyLevel(account.metadata?.privacyOptions?.[0] || ''); setMediaType(account.platform === 'tiktok' ? 'video' : 'image'); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[14px] font-black ${platformStyles[account.platform]}`}>
                                        {account.platform === 'instagram' ? <Camera size={14} /> : account.platform === 'facebook' ? <Share2 size={14} /> : '♪'}
                                    </span>
                                    <span className="min-w-0"><strong className="block truncate text-[10px] text-slate-800">{account.account_name}</strong><small className="block text-[8px] capitalize text-slate-500">{platformLabels[account.platform]}</small></span>
                                </button>
                                <button type="button" disabled={busy !== ''} onClick={() => disconnect(account)} aria-label={`Disconnect ${account.account_name}`} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={12} /></button>
                            </div>
                        )) : <div className="rounded-lg border border-dashed border-stone-200 px-3 py-5 text-center text-[9px] text-slate-500">No social accounts connected.</div>}
                        {!accounts.length && !providers.meta && !providers.tiktok && <p className="text-[8px] leading-4 text-slate-500">Set `META_APP_ID`, `META_APP_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and `AI_DASHBOARD_PUBLIC_URL` on the server. Meta authorization can return both Facebook Pages and linked Instagram professional accounts.</p>}
                    </div>

                    <form onSubmit={publish} className="space-y-2 rounded-lg border border-stone-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-2"><h3 className="text-[10px] font-extrabold text-slate-800">Prepare a post</h3>{selectedAccount && <span className="text-[8px] text-slate-500">To {selectedAccount.account_name}</span>}</div>
                        <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Account</span><select required disabled={!accounts.length} value={accountId} onChange={(event) => { const next = accounts.find((account) => account.id === event.target.value); setAccountId(event.target.value); if (next) { setPrivacyLevel(next.metadata?.privacyOptions?.[0] || ''); setMediaType(next.platform === 'tiktok' ? 'video' : 'image'); } }} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]">{!accounts.length && <option value="">Connect an account first</option>}{accounts.map((account) => <option key={account.id} value={account.id}>{platformLabels[account.platform]} · {account.account_name}</option>)}</select></label>
                        <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Caption</span><textarea required maxLength={2200} rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write your post caption…" className="w-full resize-y rounded-md border border-stone-200 px-2.5 py-2 text-[10px] outline-none focus:border-[#bd6740]" /></label>
                        {selectedAccount?.platform !== 'facebook' || mediaType !== 'text' ? <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                            {products.some((product) => imageFromProduct(product)) && <label><span className="mb-1 block text-[9px] font-bold text-slate-600">Use a product image</span><select defaultValue="" onChange={mediaFromProduct} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="">Choose product…</option>{products.filter((product) => imageFromProduct(product)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}
                            <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Public HTTPS media URL</span><input required type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://…" className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-[9px] outline-none focus:border-[#bd6740]" /></label>
                        </div> : null}
                        <div className="grid gap-2 sm:grid-cols-2">
                            <label><span className="mb-1 block text-[9px] font-bold text-slate-600">Media type</span><select value={mediaType} onChange={(event) => setMediaType(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]">{(selectedAccount?.platform === 'tiktok' ? [['image', 'Photo'], ['video', 'Video']] : selectedAccount?.platform === 'facebook' ? [['image', 'Image'], ['text', 'Text only']] : [['image', 'Image']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            {selectedAccount?.platform === 'tiktok' && <label><span className="mb-1 block text-[9px] font-bold text-slate-600">TikTok privacy</span><select required value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="">Choose privacy…</option>{(selectedAccount.metadata?.privacyOptions || []).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label>}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2">
                            <p className="max-w-sm text-[8px] leading-4 text-slate-500"><ExternalLink size={10} className="mr-1 inline" />Media must be public so the provider can fetch it. TikTok may keep posts private until its app passes review.</p>
                            <button type="submit" disabled={!selectedAccount || !caption.trim() || busy !== ''} className="inline-flex items-center gap-1.5 rounded-md bg-[#68201a] px-3 py-2 text-[9px] font-bold text-white hover:bg-[#4f1714] disabled:cursor-not-allowed disabled:opacity-50">{busy === 'publish' ? <LoaderCircle size={12} className="animate-spin" /> : <Send size={12} />}Publish now</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="mt-3 border-t border-stone-100 pt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-slate-800"><Check size={12} className="text-[#c45a2e]" />Publishing history</h3>
                {posts.length ? <div className="max-h-56 space-y-1.5 overflow-y-auto">{posts.slice(0, 30).map((post) => (
                    <div key={post.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-100 bg-white px-2.5 py-2">
                        <div className="min-w-0"><p className="truncate text-[9px] font-semibold text-slate-700">{post.caption}</p><p className="mt-0.5 text-[8px] capitalize text-slate-500">{platformLabels[post.platform]} · {new Date(post.created_at).toLocaleString()}</p>{post.error_message && <p className="mt-1 text-[8px] text-rose-700">{post.error_message}</p>}</div>
                        <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 text-[8px] font-bold ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : post.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel[post.status] || post.status}</span>{post.status === 'processing' && post.platform === 'tiktok' && <button type="button" disabled={busy !== ''} onClick={() => checkStatus(post.id)} className="text-[8px] font-bold text-[#a74427] hover:underline disabled:opacity-50">Check</button>}</div>
                    </div>
                ))}</div> : <p className="text-[9px] text-slate-500">Published posts and provider failures will appear here.</p>}
            </div>
        </SectionCard>
    );
};
