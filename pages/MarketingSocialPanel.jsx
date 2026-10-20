import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Camera, Check, ExternalLink, Link2, LoaderCircle, RefreshCw, Send, Share2, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
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
const productPageUrl = (product) => product?.slug
    ? `https://mithilachitrakalastore.com.np/product/${encodeURIComponent(product.slug)}`
    : '';
const fallbackProductCaption = (product) => {
    const name = String(product?.name || 'this beautiful piece').trim();
    const hooks = [
        'Give your space a story worth sharing. ✨',
        'A little art can make a room feel a lot more like you. ✨',
        'Looking for a detail that makes you stop and smile? Meet your new favorite. ✨',
    ];
    const hookIndex = [...name].reduce((total, character) => total + character.charCodeAt(0), 0) % hooks.length;
    return `${hooks[hookIndex]}\n\nMeet ${name} — a beautiful find for anyone who loves art with character.\n\nBring home a little inspiration. Discover it today.\n\n#MithilaArt #ArtForYourHome #Nepal`;
};
const kathmanduDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
}).format(new Date());
// The API reports `publicUrlConfigured` beside `providers`; merge it so the Connect button reads one object.
const normalizeProviders = (social = {}) => ({
    meta: Boolean(social.providers?.meta),
    instagram: Boolean(social.providers?.instagram),
    tiktok: Boolean(social.providers?.tiktok),
    encryption: Boolean(social.providers?.encryption),
    publicUrlConfigured: Boolean(social.publicUrlConfigured ?? social.providers?.publicUrlConfigured),
});
const statusLabel = { draft: 'Draft', scheduled: 'Scheduled', publishing: 'Publishing', processing: 'Processing on TikTok', published: 'Published', failed: 'Failed', cancelled: 'Cancelled' };

export const MarketingSocialPanel = ({ token, products = [] }) => {
    const [accounts, setAccounts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [insights, setInsights] = useState([]);
    const [insightsPeriod, setInsightsPeriod] = useState(null);
    const [socialAutomation, setSocialAutomation] = useState(null);
    const [socialRuns, setSocialRuns] = useState([]);
    const [providers, setProviders] = useState({ meta: false, instagram: false, encryption: false, publicUrlConfigured: false });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [generatedSources, setGeneratedSources] = useState([]);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleMode, setScheduleMode] = useState(false);
    const [accountId, setAccountId] = useState('');
    const [caption, setCaption] = useState('');
    const [productId, setProductId] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState('image');
    const [facebookPostType, setFacebookPostType] = useState('link');
    const [privacyLevel, setPrivacyLevel] = useState('');
    const [editingDraftId, setEditingDraftId] = useState('');

    const refresh = async () => {
        const [social, postHistory, insightsResult, automationResult] = await Promise.all([
            aiDashboardService.getMarketingSocial(token),
            aiDashboardService.getMarketingSocialPosts(token),
            aiDashboardService.getMarketingSocialInsights(token),
            aiDashboardService.getMarketingSocialDraftAutomation(token),
        ]);
        setAccounts(social.accounts || []);
        setProviders(normalizeProviders(social));
        setPosts(postHistory.posts || []);
        setInsights(insightsResult.insights || []);
        setInsightsPeriod(insightsResult.period || null);
        setSocialAutomation(automationResult.settings || null);
        setSocialRuns(automationResult.runs || []);
        setAccountId((current) => social.accounts?.some((account) => account.id === current)
            ? current
            : social.accounts?.[0]?.id || '');
    };
    useEffect(() => {
        let current = true;
        Promise.all([
            aiDashboardService.getMarketingSocial(token),
            aiDashboardService.getMarketingSocialPosts(token),
            aiDashboardService.getMarketingSocialInsights(token),
            aiDashboardService.getMarketingSocialDraftAutomation(token),
        ])
            .then(([social, postHistory, insightsResult, automationResult]) => {
                if (!current) return;
                setAccounts(social.accounts || []);
                setProviders(normalizeProviders(social));
                setPosts(postHistory.posts || []);
                setInsights(insightsResult.insights || []);
                setInsightsPeriod(insightsResult.period || null);
                setSocialAutomation(automationResult.settings || null);
                setSocialRuns(automationResult.runs || []);
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

    useEffect(() => {
        const shouldRefresh = posts.some((post) => post.status === 'scheduled' || post.status === 'publishing') ||
            Boolean(socialAutomation?.enabled);
        if (!shouldRefresh) return undefined;
        let current = true;
        let refreshing = false;
        const timer = window.setInterval(async () => {
            if (refreshing) return;
            refreshing = true;
            try {
                const refreshRequests = [aiDashboardService.getMarketingSocialPosts(token)];
                if (socialAutomation?.enabled) refreshRequests.push(aiDashboardService.getMarketingSocialDraftAutomation(token));
                const [postHistory, automationResult] = await Promise.all(refreshRequests);
                if (current) setPosts(postHistory.posts || []);
                if (current && automationResult) setSocialRuns(automationResult.runs || []);
            } catch (refreshError) {
                if (current) setError(refreshError.message || 'Unable to refresh scheduled post status.');
            } finally {
                refreshing = false;
            }
        }, 30_000);
        return () => {
            current = false;
            window.clearInterval(timer);
        };
    }, [token, posts.some((post) => post.status === 'scheduled' || post.status === 'publishing'), socialAutomation?.enabled]);

    const missingSetup = useMemo(() => [
        !providers.meta && 'META_APP_ID and META_APP_SECRET',
        !providers.publicUrlConfigured && 'AI_DASHBOARD_PUBLIC_URL',
        !providers.encryption && 'SOCIAL_TOKEN_ENCRYPTION_KEY (64 hex characters or 32-byte base64)',
    ].filter(Boolean), [providers]);
    const instagramSetupMissing = !providers.instagram;
    const selectedAccount = useMemo(() => accounts.find((account) => account.id === accountId), [accounts, accountId]);
    const selectedProduct = useMemo(
        () => products.find((product) => String(product.id) === productId),
        [products, productId]
    );
    const selectedProductUrl = productPageUrl(selectedProduct);
    const facebookLinkPost = selectedAccount?.platform === 'facebook' && facebookPostType === 'link';
    const publishCaption = facebookLinkPost
        ? caption.trim()
        : [caption.trim(), selectedProductUrl].filter(Boolean).join('\n\n');
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
    const generateContent = async () => {
        if (!selectedAccount || !selectedProduct) {
            setError('Choose a social account and product before generating post content.');
            return;
        }
        setBusy('generate');
        setError('');
        setGeneratedSources([]);
        try {
            const result = await aiDashboardService.generateMarketingSocialContent({
                productId: String(selectedProduct.id),
                platform: selectedAccount.platform,
                goal: 'attract customers and encourage product page visits',
                tone: 'warm, authentic, culturally respectful, and inviting',
            }, token);
            const generatedContent = typeof result.content === 'string' ? result.content.trim() : '';
            if (!generatedContent) throw new Error('AI returned an empty caption.');
            setCaption(generatedContent);
            setGeneratedSources(result.sources || []);
            setNotice(result.trendResearchAvailable
                ? 'AI drafted post copy using current public web sources. Review every product claim before publishing.'
                : 'AI drafted post copy, but current trend sources were unavailable. Review all claims before publishing.');
        } catch (generationError) {
            setCaption(fallbackProductCaption(selectedProduct));
            const reason = generationError instanceof Error && generationError.message
                ? generationError.message
                : 'An unexpected server error occurred.';
            setError(`AI caption generation failed: ${reason} An editable caption was added for your selected product; review it before publishing.`);
        } finally {
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
    const updateSocialAutomation = async (enabled) => {
        setBusy('social-automation');
        setError('');
        try {
            const result = await aiDashboardService.updateMarketingSocialDraftAutomation(enabled, token);
            setSocialAutomation(result.settings);
            setNotice(enabled
                ? 'Every-two-days AI social drafting is enabled. It creates unpublished drafts for review only.'
                : 'Scheduled AI social drafting is paused. Existing drafts are unchanged.');
        } catch (settingsError) {
            setError(settingsError.message || 'Unable to update social AI draft settings.');
        } finally {
            setBusy('');
        }
    };
    const refreshInsights = async () => {
        setBusy('insights');
        setError('');
        try {
            const result = await aiDashboardService.getMarketingSocialInsights(token);
            setInsights(result.insights || []);
            setInsightsPeriod(result.period || null);
        } catch (insightError) {
            setError(insightError.message || 'Unable to refresh social account insights.');
        } finally {
            setBusy('');
        }
    };
    const publish = async (event) => {
        event.preventDefault();
        const shouldSchedule = event.nativeEvent.submitter?.value === 'schedule';
        if (!selectedAccount) return;
        const scheduledAt = shouldSchedule && scheduleDate && scheduleTime
            ? new Date(`${scheduleDate}T${scheduleTime}:00+05:45`).toISOString()
            : '';
        if (shouldSchedule && (!scheduledAt || new Date(scheduledAt).getTime() < Date.now() + 60_000)) {
            setError('Choose a Nepal-time schedule at least one minute in the future.');
            return;
        }
        if (facebookLinkPost && !selectedProductUrl) {
            setError('Select a product before publishing a Facebook link post.');
            return;
        }
        if (publishCaption.length > 2200) {
            setError('Caption and product link must be 2,200 characters or fewer.');
            return;
        }
        const confirmed = window.confirm(
            shouldSchedule
                ? `Schedule this post for ${scheduleDate} at ${scheduleTime} Nepal time on ${selectedAccount.account_name}?${selectedProductUrl ? `\n\nProduct link: ${selectedProductUrl}` : ''}\n\nIt will publish automatically at the scheduled time.`
                : `Publish this post now to ${selectedAccount.account_name} on ${platformLabels[selectedAccount.platform]}?${selectedProductUrl ? `\n\nProduct link: ${selectedProductUrl}` : ''}\n\nThis will create a live post on that account.`
        );
        if (!confirmed) return;
        setBusy(shouldSchedule ? 'schedule' : 'publish');
        setError('');
        setNotice('');
        try {
            const { post } = await aiDashboardService.publishMarketingSocialPost({
                platform: selectedAccount.platform,
                accountId: selectedAccount.id,
                caption: publishCaption,
                ...(editingDraftId ? { draftPostId: editingDraftId } : {}),
                mediaUrl: facebookLinkPost || mediaType === 'text' ? '' : mediaUrl.trim(),
                mediaType: selectedAccount.platform === 'facebook'
                    ? facebookPostType === 'photo' ? 'image' : 'text'
                    : mediaType,
                privacyLevel,
                productUrl: facebookLinkPost ? selectedProductUrl : '',
                ...(shouldSchedule ? { scheduledAt } : {}),
            }, token);
            setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
            setCaption('');
            setEditingDraftId('');
            setProductId('');
            setMediaUrl('');
            setScheduleDate('');
            setScheduleTime('');
            setScheduleMode(false);
            setNotice(post.status === 'scheduled'
                ? `Post scheduled for ${new Date(post.scheduled_at).toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })} Nepal time.`
                : post.status === 'processing'
                ? 'TikTok accepted the post. Check its status as processing completes.'
                : facebookLinkPost
                    ? 'Your Facebook post was published with a clickable product link preview.'
                    : selectedProductUrl
                    ? 'Your post was published with the product link in its caption.'
                    : 'Your post was published successfully.');
        } catch (publishError) {
            setError(publishError.message || 'Unable to publish this post.');
            try { await refresh(); } catch { /* Keep the provider error visible. */ }
        } finally {
            setBusy('');
        }
    };
    const cancelScheduledPost = async (postId) => {
        setBusy(postId);
        setError('');
        try {
            await aiDashboardService.cancelScheduledMarketingSocialPost(postId, token);
            setPosts((current) => current.map((post) => post.id === postId ? { ...post, status: 'cancelled' } : post));
            setNotice('Scheduled post cancelled.');
        } catch (cancelError) {
            setError(cancelError.message || 'Unable to cancel this scheduled post.');
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
    const deletePost = async (post) => {
        if (!window.confirm('Remove this entry from dashboard publishing history? This does not delete a post already published on the social platform.')) return;
        setBusy(post.id);
        setError('');
        try {
            await aiDashboardService.deleteMarketingSocialPost(post.id, token);
            setPosts((current) => current.filter((item) => item.id !== post.id));
            setNotice('Post removed from publishing history.');
        } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete this publishing history entry.');
        } finally {
            setBusy('');
        }
    };
    const selectProduct = (event) => {
        setProductId(event.target.value);
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
    const reviewDraft = (post) => {
        const account = accounts.find((item) => item.id === post.account_id);
        if (!account) {
            setError('The account for this draft is disconnected. Reconnect it before scheduling or publishing.');
            return;
        }
        setAccountId(account.id);
        setCaption(post.caption || '');
        setMediaUrl(post.media_url || '');
        setMediaType(post.media_type || 'text');
        setProductId(products.find((product) => productPageUrl(product) === post.product_url)?.id || '');
        setEditingDraftId(post.id);
        if (post.scheduled_at) {
            const suggested = new Date(new Date(post.scheduled_at).getTime() + 345 * 60_000);
            setScheduleDate(suggested.toISOString().slice(0, 10));
            setScheduleTime(suggested.toISOString().slice(11, 16));
        }
        setScheduleMode(false);
        setError('');
        setNotice('Review the generated caption and media, then publish now or choose and confirm a schedule time.');
    };

    return (
        <SectionCard>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-[12px] font-extrabold text-slate-800"><Link2 size={15} className="text-[#c45a2e]" />Social accounts & publishing</h2>
                    <p className="mt-1 max-w-3xl text-[9px] leading-4 text-slate-500">Connect accounts through the platform authorization screen. Review the post and confirm before anything is published live.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button type="button" disabled={!providers.meta || !providers.encryption || !providers.publicUrlConfigured || busy !== ''} onClick={() => connect('meta')} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"><Share2 size={12} />Connect Facebook Page</button>
                    <button type="button" disabled={!providers.instagram || !providers.encryption || !providers.publicUrlConfigured || busy !== ''} onClick={() => connect('instagram')} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"><Camera size={12} />Connect Instagram</button>
                </div>
            </div>

            {(error || notice) && <div role={error ? 'alert' : 'status'} className={`mb-3 rounded-md border px-3 py-2 text-[10px] ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || notice}</div>}

            <div className="mb-3 grid gap-3 xl:grid-cols-2">
                <section className="rounded-lg border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div><h3 className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-800"><BarChart3 size={13} className="text-[#c45a2e]" />Social reach & performance</h3><p className="mt-1 text-[8px] text-slate-500">Latest available 30-day account insights{insightsPeriod ? ` · refreshed ${new Date(insightsPeriod.until).toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })} NPT` : ''}</p></div>
                        <button type="button" disabled={busy !== ''} onClick={refreshInsights} aria-label="Refresh social insights" className="rounded border border-stone-200 p-1.5 text-slate-600 disabled:opacity-40"><RefreshCw size={11} className={busy === 'insights' ? 'animate-spin' : ''} /></button>
                    </div>
                    <div className="mt-3 space-y-2">
                        {insights.map((item) => (
                            <article key={item.accountId} className="rounded-md border border-stone-100 p-2">
                                <div className="flex items-center justify-between gap-2"><strong className="truncate text-[9px] text-slate-700">{item.accountName}</strong><span className="text-[8px] capitalize text-slate-500">{platformLabels[item.platform]}</span></div>
                                {item.available ? <div className="mt-2 grid grid-cols-3 gap-2 text-[8px]"><span>Daily reach total*<strong className="mt-0.5 block text-[11px] text-slate-800">{item.metrics.reach?.toLocaleString() ?? '—'}</strong></span><span>{item.platform === 'facebook' ? 'Post engagements' : 'Engaged accounts'}<strong className="mt-0.5 block text-[11px] text-slate-800">{item.metrics.engagement?.toLocaleString() ?? '—'}</strong></span>{item.metrics.profileViews !== null && <span>Profile views<strong className="mt-0.5 block text-[11px] text-slate-800">{item.metrics.profileViews?.toLocaleString() ?? '—'}</strong></span>}</div> : <p className="mt-1 text-[8px] leading-4 text-amber-800">{item.message}</p>}
                            </article>
                        ))}
                        {!insights.length && <p className="rounded bg-stone-50 p-3 text-[8px] text-slate-500">Connect an account to load supported performance data.</p>}
                    </div>
                    <p className="mt-2 text-[8px] leading-4 text-slate-500">*Daily reach is summed, not unique people across the full 30-day period. Metrics may be unavailable without platform permissions and app review. TikTok insights are not currently exposed by this integration.</p>
                </section>

                <section className="rounded-lg border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div><h3 className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-800"><Sparkles size={13} className="text-violet-600" />AI social draft assistant</h3><p className="mt-1 text-[8px] leading-4 text-slate-500">Uses supported account insights and public product details. Runs every 2 days from 10:00 Nepal time when no other tracked AI job is active.</p></div>
                        {socialAutomation && <button type="button" role="switch" aria-checked={socialAutomation.enabled} onClick={() => updateSocialAutomation(!socialAutomation.enabled)} disabled={busy !== ''} className={`shrink-0 rounded px-2.5 py-1.5 text-[8px] font-bold ${socialAutomation.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-slate-700'}`}>{socialAutomation.enabled ? 'Enabled' : 'Paused'}</button>}
                    </div>
                    <div className="mt-3 rounded border border-violet-100 bg-violet-50 p-2 text-[8px] leading-4 text-violet-950">AI creates one unpublished draft for review, with a suggested next available 10:00 slot. It does not schedule or publish automatically. You must review and explicitly schedule or publish each post.</div>
                    <p className="mt-2 text-[8px] leading-4 text-slate-500">Requires the shared AI budget, an active AI setting, a connected Facebook/Instagram account with insights permission, public products, and this dashboard server to remain running. Enable only if you want background AI usage.</p>
                    {socialRuns[0] && <p className="mt-2 text-[8px] text-slate-500">Latest attempt: {socialRuns[0].run_date} · {socialRuns[0].status}{socialRuns[0].error_summary ? ` · ${socialRuns[0].error_summary}` : ''}</p>}
                    {!socialAutomation && <p className="mt-2 text-[8px] text-rose-700">Automation settings are not available. Apply the updated schema.sql and reload.</p>}
                </section>
            </div>

            {missingSetup.length > 0 && <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[9px] leading-4 text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0" /><span>Meta connections still need these server settings: {missingSetup.join(', ')}. Add them to the server environment (never `VITE_*` settings) and restart the service. Meta app review or tester roles may also be required.</span></div>}
            {instagramSetupMissing && <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[9px] leading-4 text-amber-900"><ShieldCheck size={13} className="mt-0.5 shrink-0" /><span>Direct Instagram Login needs `INSTA_APP_ID` and `INSTA_APP_SECRET` on the server, plus Instagram API with Instagram Login configured in Meta. Add these as server environment variables, never `VITE_*` settings.</span></div>}

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
                        {!accounts.length && !providers.meta && <p className="text-[8px] leading-4 text-slate-500">Set `META_APP_ID`, `META_APP_SECRET`, and `AI_DASHBOARD_PUBLIC_URL` on the server. Meta authorization can return both Facebook Pages and linked Instagram professional accounts.</p>}
                    </div>

                    <form onSubmit={publish} className="space-y-2 rounded-lg border border-stone-100 bg-white p-3">
                        <div className="flex items-center justify-between gap-2"><h3 className="text-[10px] font-extrabold text-slate-800">{editingDraftId ? 'Review AI draft' : 'Prepare a post'}</h3>{selectedAccount && <span className="text-[8px] text-slate-500">To {selectedAccount.account_name}</span>}</div>
                        <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Account</span><select required disabled={!accounts.length} value={accountId} onChange={(event) => { const next = accounts.find((account) => account.id === event.target.value); setAccountId(event.target.value); if (next) { setPrivacyLevel(next.metadata?.privacyOptions?.[0] || ''); setMediaType(next.platform === 'tiktok' ? 'video' : 'image'); } }} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]">{!accounts.length && <option value="">Connect an account first</option>}{accounts.map((account) => <option key={account.id} value={account.id}>{platformLabels[account.platform]} · {account.account_name}</option>)}</select></label>
                        {selectedAccount?.platform === 'facebook' && <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Facebook post type</span><select value={facebookPostType} onChange={(event) => setFacebookPostType(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="link">Link post (clickable product preview)</option><option value="photo">Photo post</option><option value="text">Text-only post</option></select></label>}
                        <div>
                            <div className="mb-1 flex items-center justify-between gap-2"><span className="text-[9px] font-bold text-slate-600">Caption</span><button type="button" disabled={!selectedProduct || !selectedAccount || busy !== ''} onClick={generateContent} className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-800 disabled:opacity-50">{busy === 'generate' ? <LoaderCircle size={10} className="animate-spin" /> : <span>✦</span>}Generate with AI</button></div>
                            <textarea required maxLength={2200} rows={5} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write a post caption or generate one with AI…" className="w-full resize-y rounded-md border border-stone-200 px-2.5 py-2 text-[10px] outline-none focus:border-[#bd6740]" />
                            <p className="mt-1 text-[8px] leading-4 text-slate-500">AI uses current public web search for trend ideas when available. It does not analyze your account insights or guarantee views/sales; review every claim.</p>
                            {generatedSources.length > 0 && <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-slate-500"><span>Research:</span>{generatedSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-[#a74427] underline">{source.title}</a>)}</div>}
                        </div>
                        {products.some((product) => productPageUrl(product)) && <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">{facebookLinkPost ? 'Product to link' : 'Add a product link'}</span><select value={productId} onChange={selectProduct} required={facebookLinkPost} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="">{facebookLinkPost ? 'Choose a product…' : 'No product selected'}</option>{products.filter((product) => productPageUrl(product)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>{selectedProductUrl && <span className="mt-1 block text-[8px] text-slate-500">{facebookLinkPost ? 'Facebook link preview: ' : 'Added to caption: '}<a href={selectedProductUrl} target="_blank" rel="noreferrer" className="text-[#a74427] underline">{selectedProductUrl}</a></span>}{selectedAccount?.platform === 'instagram' && selectedProductUrl && <span className="mt-1 block text-[8px] text-slate-500">Instagram captions don’t make links clickable. Customers can copy this URL or use your profile link.</span>}</label>}
                        {(selectedAccount?.platform !== 'facebook' && mediaType !== 'text') || (selectedAccount?.platform === 'facebook' && facebookPostType === 'photo') ? <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                            {products.some((product) => imageFromProduct(product)) && <label><span className="mb-1 block text-[9px] font-bold text-slate-600">Use a product image</span><select defaultValue="" onChange={mediaFromProduct} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="">Choose product image…</option>{products.filter((product) => imageFromProduct(product)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}
                            <label className="block"><span className="mb-1 block text-[9px] font-bold text-slate-600">Public HTTPS media URL</span><input required type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://…" className="w-full rounded-md border border-stone-200 px-2.5 py-1.5 text-[9px] outline-none focus:border-[#bd6740]" /></label>
                        </div> : null}
                        {facebookLinkPost && selectedProductUrl && <p className="rounded-md bg-blue-50 px-2.5 py-2 text-[8px] leading-4 text-blue-800">Facebook will attach this product page as a clickable link preview. Its image and title come from the public product page.</p>}
                        <div className="grid gap-2 sm:grid-cols-2">
                            {selectedAccount?.platform !== 'facebook' && <label><span className="mb-1 block text-[9px] font-bold text-slate-600">Media type</span><select value={mediaType} onChange={(event) => setMediaType(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]">{(selectedAccount?.platform === 'tiktok' ? [['image', 'Photo'], ['video', 'Video']] : [['image', 'Image']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
                            {selectedAccount?.platform === 'tiktok' && <label><span className="mb-1 block text-[9px] font-bold text-slate-600">TikTok privacy</span><select required value={privacyLevel} onChange={(event) => setPrivacyLevel(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]"><option value="">Choose privacy…</option>{(selectedAccount.metadata?.privacyOptions || []).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label>}
                        </div>
                            {scheduleMode && <div className="grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 sm:grid-cols-2">
                                <label><span className="mb-1 block text-[9px] font-bold text-slate-700">Schedule date (Nepal time)</span><input required type="date" min={kathmanduDate} value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]" /></label>
                                <label><span className="mb-1 block text-[9px] font-bold text-slate-700">Time (Asia/Kathmandu)</span><input required type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[9px]" /></label>
                                <p className="text-[8px] leading-4 text-amber-900 sm:col-span-2">This server must remain online at the scheduled time. Posts are queued only after you confirm, and you can cancel before publishing starts.</p>
                            </div>}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2">
                                <p className="max-w-sm text-[8px] leading-4 text-slate-500"><ExternalLink size={10} className="mr-1 inline" />Media must be public so the provider can fetch it. TikTok may keep posts private until its app passes review.</p>
                                <div className="flex gap-1.5">
                                    <button type="submit" value="publish" disabled={!selectedAccount || !caption.trim() || (facebookLinkPost && !selectedProductUrl) || busy !== ''} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'publish' ? <LoaderCircle size={12} className="animate-spin" /> : <Send size={12} />}Publish now</button>
                                    <button type={scheduleMode ? 'submit' : 'button'} value={scheduleMode ? 'schedule' : undefined} onClick={() => { if (!scheduleMode) setScheduleMode(true); }} disabled={!selectedAccount || !caption.trim() || (facebookLinkPost && !selectedProductUrl) || busy !== ''} className="inline-flex items-center gap-1.5 rounded-md bg-[#68201a] px-3 py-2 text-[9px] font-bold text-white hover:bg-[#4f1714] disabled:cursor-not-allowed disabled:opacity-50">{busy === 'schedule' ? <LoaderCircle size={12} className="animate-spin" /> : <CalendarDays size={12} />}{scheduleMode ? 'Confirm schedule' : 'Schedule post'}</button>
                                </div>
                            </div>
                    </form>
                </div>
            )}

            <div className="mt-3 border-t border-stone-100 pt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-slate-800"><Check size={12} className="text-[#c45a2e]" />Publishing history</h3>
                {posts.length ? <div className="max-h-56 space-y-1.5 overflow-y-auto">{posts.slice(0, 30).map((post) => (
                    <div key={post.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-100 bg-white px-2.5 py-2">
                <div className="min-w-0"><p className="truncate text-[9px] font-semibold text-slate-700">{post.caption}</p><p className="mt-0.5 text-[8px] capitalize text-slate-500">{platformLabels[post.platform]} · {new Date(post.created_at).toLocaleString()}</p>{post.status === 'draft' && post.scheduled_at && <p className="mt-1 text-[8px] text-violet-700">Suggested slot: {new Date(post.scheduled_at).toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })} NPT · not scheduled</p>}{post.error_message && <p className="mt-1 text-[8px] text-rose-700">{post.error_message}</p>}</div>
                <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 text-[8px] font-bold ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700' : post.status === 'failed' ? 'bg-rose-50 text-rose-700' : post.status === 'draft' ? 'bg-violet-50 text-violet-800' : 'bg-amber-50 text-amber-800'}`}>{post.status === 'draft' ? 'Review draft' : statusLabel[post.status] || post.status}</span>{post.status === 'draft' && <button type="button" disabled={busy !== ''} onClick={() => reviewDraft(post)} className="text-[8px] font-bold text-[#a74427] hover:underline disabled:opacity-50">Review</button>}{post.status === 'scheduled' && post.scheduled_at && <span className="text-[8px] text-slate-500">{new Date(post.scheduled_at).toLocaleString('en-NP', { timeZone: 'Asia/Kathmandu' })} NPT</span>}{post.status === 'scheduled' && <button type="button" disabled={busy !== ''} onClick={() => cancelScheduledPost(post.id)} className="text-[8px] font-bold text-rose-700 hover:underline disabled:opacity-50">Cancel</button>}{post.status === 'processing' && post.platform === 'tiktok' && <button type="button" disabled={busy !== ''} onClick={() => checkStatus(post.id)} className="text-[8px] font-bold text-[#a74427] hover:underline disabled:opacity-50">Check</button>}{['draft', 'published', 'failed', 'cancelled'].includes(post.status) && <button type="button" disabled={busy !== ''} onClick={() => deletePost(post)} aria-label={`Delete ${post.status} post history entry`} title="Remove from dashboard history" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 size={11} /></button>}</div>
                    </div>
                ))}</div> : <p className="text-[9px] text-slate-500">Generated drafts, published posts, and provider failures will appear here.</p>}
            </div>
        </SectionCard>
    );
};