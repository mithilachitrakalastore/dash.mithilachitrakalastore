import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity, Bell, BookOpen, Boxes, ChevronDown, CircleHelp, ClipboardCheck, ClipboardList,
    Coins, Database, Heart, Image, LayoutDashboard, LoaderCircle, Mail, Megaphone, Package, Plug,
    Printer, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Store,
    Users, Workflow,
} from 'lucide-react';
import { aiDashboardService } from './aiDashboardService';
import { SectionCard } from './pages/shared';

const AICommandCenterPage = lazy(() => import('./pages/AICommandCenterPage').then((module) => ({ default: module.AICommandCenterPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const EmailPage = lazy(() => import('./pages/EmailPage').then((module) => ({ default: module.EmailPage })));
const FeaturePlaceholderPage = lazy(() => import('./pages/FeaturePlaceholderPage').then((module) => ({ default: module.FeaturePlaceholderPage })));
const HeroSlidesPage = lazy(() => import('./pages/HeroSlidesPage').then((module) => ({ default: module.HeroSlidesPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then((module) => ({ default: module.JournalPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const BillingPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.BillingPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then((module) => ({ default: module.PolicyPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const UsagePage = lazy(() => import('./pages/UsagePage').then((module) => ({ default: module.UsagePage })));
const WishlistsPage = lazy(() => import('./pages/WishlistsPage').then((module) => ({ default: module.WishlistsPage })));

const navGroups = [
    [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'ai-command-center', label: 'AI Command Center', icon: Sparkles, badge: 'New' },
    ],
    [
        { id: 'products', label: 'Products', icon: Package },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'billing', label: 'Billing & Print', icon: Printer },
        { id: 'wishlists', label: 'Wishlists', icon: Heart },
        { id: 'users', label: 'Artisans & Users', icon: Users, adminOnly: true },
        { id: 'email', label: 'Email', icon: Mail, adminOnly: true },
        { id: 'hero-slides', label: 'Hero Slides', icon: Image, adminOnly: true },
        { id: 'journal', label: 'Cultural Journal', icon: BookOpen, adminOnly: true },
        { id: 'policy', label: 'Commission Policy', icon: Coins, adminOnly: true },
        { id: 'customer-support', label: 'Customer Support', icon: CircleHelp, unavailable: true },
        { id: 'marketing-seo', label: 'Marketing & SEO', icon: Megaphone, unavailable: true },
        { id: 'automations', label: 'Automations', icon: Workflow, unavailable: true },
        { id: 'approvals', label: 'Approvals', icon: ClipboardCheck, unavailable: true },
        { id: 'analytics', label: 'Analytics & Reports', icon: Activity },
        { id: 'integrations', label: 'Integrations', icon: Plug, unavailable: true },
    ],
    [
        { id: 'usage', label: 'AI Usage & Costs', icon: Coins },
        { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList },
        { id: 'settings', label: 'Settings', icon: Settings },
    ],
];

const placeholderContent = {
    'customer-support': { title: 'Customer Support', description: 'Support workflows and customer conversation tools.' },
    'marketing-seo': { title: 'Marketing & SEO', description: 'Campaign planning and search optimization tools.' },
    automations: { title: 'Automations', description: 'Scheduled and event-driven store workflows.' },
    approvals: { title: 'Approvals', description: 'Review queue for proposed store actions.' },
    integrations: { title: 'Integrations', description: 'Connections to external store tools and services.' },
};

const readRoute = () => {
    const route = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return route || 'dashboard';
};

const HEADER_TITLES = Object.fromEntries(navGroups.flat().map(({ id, label }) => [id, label]));

export const DashboardApp = ({ currentUser, onSignOut }) => {
    const [overview, setOverview] = useState(null);
    const [management, setManagement] = useState(null);
    const [route, setRoute] = useState(readRoute);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [managementLoading, setManagementLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [settingsDraft, setSettingsDraft] = useState(null);
    const searchInputRef = useRef(null);

    const loadOverview = useCallback(async (initial = false) => {
        if (initial) setLoading(true);
        setError('');
        try {
            const data = await aiDashboardService.getOverview(currentUser.emailAdminToken);
            setOverview(data);
            setSettingsDraft({
                dailyRequestLimit: data.settings.dailyRequestLimit,
                monthlyRequestLimit: data.settings.monthlyRequestLimit,
                lowStockThreshold: data.settings.lowStockThreshold,
                inputCostPerMillionUsd: data.settings.inputCostPerMillionUsd,
                outputCostPerMillionUsd: data.settings.outputCostPerMillionUsd,
            });
        } catch (loadError) {
            setError(loadError.message || 'Unable to load the store dashboard.');
        } finally {
            if (initial) setLoading(false);
        }
    }, [currentUser.emailAdminToken]);

    const loadManagement = useCallback(async () => {
        setManagementLoading(true);
        setError('');
        try {
            const data = await aiDashboardService.getStoreManagement(currentUser.emailAdminToken);
            setManagement(data);
            return data;
        } catch (loadError) {
            setError(loadError.message || 'Unable to load store management data.');
            throw loadError;
        } finally {
            setManagementLoading(false);
        }
    }, [currentUser.emailAdminToken]);

    const runStoreAction = useCallback(async (action, payload) => {
        setError('');
        try {
            const result = await aiDashboardService.runStoreAction(action, payload, currentUser.emailAdminToken);
            await Promise.all([loadManagement(), loadOverview()]);
            return result;
        } catch (actionError) {
            setError(actionError.message || 'Unable to complete store management action.');
            throw actionError;
        }
    }, [currentUser.emailAdminToken, loadManagement, loadOverview]);

    useEffect(() => { loadOverview(true); }, [loadOverview]);
    useEffect(() => {
        if (['products', 'inventory', 'orders', 'billing', 'users', 'policy', 'hero-slides', 'journal'].includes(route)) {
            loadManagement().catch(() => {});
        }
    }, [loadManagement, route]);
    useEffect(() => {
        if (route !== 'products') return undefined;
        const refreshTimer = window.setInterval(() => loadManagement().catch(() => {}), 60_000);
        return () => window.clearInterval(refreshTimer);
    }, [loadManagement, route]);
    useEffect(() => {
        const handleHashChange = () => setRoute(readRoute());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    useEffect(() => {
        const handleSearchShortcut = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleSearchShortcut);
        return () => window.removeEventListener('keydown', handleSearchShortcut);
    }, []);

    const goTo = useCallback((nextRoute, nextSearch = '') => {
        setSearchTerm(nextSearch);
        setSearchOpen(false);
        setMobileNavOpen(false);
        const hash = `#/${nextRoute}`;
        if (window.location.hash === hash) setRoute(nextRoute);
        else window.location.hash = hash;
    }, []);

    const runCommand = useCallback(async (prompt) => {
        const command = String(prompt || '').trim();
        if (!command || submitting) return null;
        setSubmitting(true);
        setError('');
        try {
            const result = await aiDashboardService.runCommand(command, currentUser.emailAdminToken);
            await loadOverview();
            return result;
        } catch (commandError) {
            setError(commandError.message || 'Unable to complete the report.');
            throw commandError;
        } finally {
            setSubmitting(false);
        }
    }, [currentUser.emailAdminToken, loadOverview, submitting]);

    const saveSettings = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            await aiDashboardService.updateSettings({
                dailyRequestLimit: Number(settingsDraft.dailyRequestLimit),
                monthlyRequestLimit: Number(settingsDraft.monthlyRequestLimit),
                lowStockThreshold: Number(settingsDraft.lowStockThreshold),
                inputCostPerMillionUsd: Number(settingsDraft.inputCostPerMillionUsd),
                outputCostPerMillionUsd: Number(settingsDraft.outputCostPerMillionUsd),
            }, currentUser.emailAdminToken);
            await loadOverview();
        } catch (saveError) {
            setError(saveError.message || 'Unable to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const toggleAI = async () => {
        setSaving(true);
        setError('');
        try {
            await aiDashboardService.updateSettings({ enabled: !overview.settings.enabled }, currentUser.emailAdminToken);
            await loadOverview();
        } catch (saveError) {
            setError(saveError.message || 'Unable to update AI service status.');
        } finally {
            setSaving(false);
        }
    };

    const searchResults = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query || !overview?.store) return [];
        const products = (overview.store.products || [])
            .filter((product) => product.name.toLowerCase().includes(query) || String(product.productCode || '').toLowerCase().includes(query))
            .slice(0, 4)
            .map((product) => ({ id: `product-${product.id}`, label: product.name, detail: 'Product', route: 'products' }));
        const orders = overview.store.recentOrders
            .filter((order) => String(order.id).toLowerCase().includes(query) || String(order.status).toLowerCase().includes(query))
            .slice(0, 3)
            .map((order) => ({ id: `order-${order.id}`, label: `#${String(order.id).slice(-8)}`, detail: `Order · ${order.status}`, route: 'orders' }));
        return [...products, ...orders].slice(0, 6);
    }, [overview, searchTerm]);

    const settings = overview?.settings;
    const store = overview?.store;
    const activeTitle = HEADER_TITLES[route] || placeholderContent[route]?.title || 'Dashboard';
    const currentDate = new Date().toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kathmandu' });
    const localHour = Number(new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'Asia/Kathmandu',
    }).format(new Date()));
    const userInitial = String(currentUser.username || 'S').slice(0, 1).toUpperCase();

    const renderPage = () => {
        if (!store || !settings) return null;
        const sharedPageProps = {
            store,
            settings,
            providerConfigured: overview.providerConfigured,
            submitting,
            onRunCommand: runCommand,
            goTo,
        };
        switch (route) {
            case 'dashboard':
                return <DashboardPage {...sharedPageProps} />;
            case 'ai-command-center':
                return <AICommandCenterPage enabled={settings.enabled} providerConfigured={overview.providerConfigured} onRunCommand={runCommand} submitting={submitting} />;
            case 'products':
                return <ProductsPage products={management?.products || store.products || []} categories={management?.categories || []} storeName={management?.storeName || currentUser.storeName || ''} searchTerm={searchTerm} onAction={runStoreAction} onUploadSignature={() => aiDashboardService.getCloudinaryUploadSignature(currentUser.emailAdminToken)} loading={managementLoading} />;
            case 'inventory':
                return <InventoryPage products={management?.products || store.products || []} threshold={settings.lowStockThreshold} />;
            case 'orders':
                return <OrdersPage orders={management?.orders || store.recentOrders || []} searchTerm={searchTerm} currentUser={currentUser} onAction={runStoreAction} loading={managementLoading} />;
            case 'billing':
                return <BillingPage orders={management?.orders || []} currentUser={currentUser} onAction={runStoreAction} loading={managementLoading} />;
            case 'wishlists':
                return <WishlistsPage token={currentUser.emailAdminToken} />;
            case 'users':
                return currentUser.role === 'admin'
                    ? <AdminUsersPage users={management?.users || []} currentUser={currentUser} onAction={runStoreAction} loading={managementLoading} />
                    : <FeaturePlaceholderPage title="Administrator access required" description="Only store administrators can manage artisan and user accounts." goTo={goTo} />;
            case 'hero-slides':
                return currentUser.role === 'admin'
                    ? <HeroSlidesPage slides={management?.heroSlides || []} onAction={runStoreAction} loading={managementLoading} />
                    : <FeaturePlaceholderPage title="Administrator access required" description="Only store administrators can manage homepage hero slides." goTo={goTo} />;
            case 'journal':
                return currentUser.role === 'admin'
                    ? <JournalPage posts={management?.journalPosts || []} onAction={runStoreAction} loading={managementLoading} />
                    : <FeaturePlaceholderPage title="Administrator access required" description="Only store administrators can manage cultural journal posts." goTo={goTo} />;
            case 'email':
                return currentUser.role === 'admin'
                    ? <EmailPage token={currentUser.emailAdminToken} />
                    : <FeaturePlaceholderPage title="Administrator access required" description="Only active store administrators can send customer emails." goTo={goTo} />;
            case 'policy':
                return currentUser.role === 'admin'
                    ? <PolicyPage commission={management?.globalCommission ?? 12} onAction={runStoreAction} loading={managementLoading} />
                    : <FeaturePlaceholderPage title="Administrator access required" description="Only store administrators can manage store commission policy." goTo={goTo} />;
            case 'analytics':
                return <AnalyticsPage store={store} />;
            case 'usage':
                return <UsagePage usage={overview.usage} settings={settings} audit={overview.audit || []} />;
            case 'audit-logs':
                return <AuditLogsPage audit={overview.audit || []} />;
            case 'settings':
                return <SettingsPage settings={settings} draft={settingsDraft} setDraft={setSettingsDraft} onSave={saveSettings} onToggleAI={toggleAI} saving={saving} />;
            default:
                return <FeaturePlaceholderPage {...(placeholderContent[route] || placeholderContent.integrations)} goTo={goTo} />;
        }
    };

    if (loading) return <main className="grid min-h-screen place-items-center bg-[#f5f2ed] text-xs text-slate-600"><LoaderCircle size={16} className="mr-2 inline animate-spin" />Loading store dashboard…</main>;

    return (
        <div className="min-h-screen bg-[#f5f2ed] text-slate-800">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[216px] flex-col bg-[#232323] text-stone-100 lg:flex">
                <a href="#/dashboard" className="flex h-[54px] items-center gap-2 border-b border-white/10 px-3">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-[#b84f2c] text-white"><Store size={18} /></span>
                    <span><strong className="block font-playfair text-[12px] leading-4">Mithila Chitrakala Store</strong><small className="text-[8px] text-stone-400">Art · Culture · Heritage</small></span>
                </a>
                <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
                    {navGroups.map((group, index) => <div key={index} className={index ? 'border-t border-white/10 pt-2' : ''}>
                        {group.filter(({ adminOnly }) => !adminOnly || currentUser.role === 'admin').map(({ id, label, icon: Icon, badge, unavailable }) => (
                            <a key={id} href={`#/${id}`} aria-current={route === id ? 'page' : undefined} title={unavailable ? 'This area is not connected yet' : label} className={`mb-0.5 flex h-[34px] items-center gap-2.5 rounded px-2.5 text-[10px] transition ${route === id ? 'bg-[#a94e2b] text-white' : 'text-stone-300 hover:bg-white/10 hover:text-white'}`}>
                                <Icon size={14} /><span className="flex-1">{label}</span>{badge && <span className="rounded bg-[#d9633d] px-1.5 py-0.5 text-[8px] font-bold">{badge}</span>}{unavailable && <span className="text-[8px] text-stone-500">·</span>}
                            </a>
                        ))}
                    </div>)}
                </nav>
                <div className="border-t border-white/10 p-3 text-[9px] text-stone-400">
                    <p className="font-semibold text-stone-200">{currentUser.username}</p>
                    <p className="mt-0.5 capitalize">{currentUser.role}</p>
                    <button type="button" onClick={onSignOut} className="mt-2 inline-flex items-center gap-1.5 hover:text-white">Sign out</button>
                </div>
            </aside>

            <div className="lg:pl-[216px]">
                <header className="sticky top-0 z-20 flex h-[50px] items-center justify-between gap-3 border-b border-[#e4dfd8] bg-[#fbfaf8]/95 px-3 backdrop-blur sm:px-5">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <button type="button" onClick={() => setMobileNavOpen((open) => !open)} className="rounded border border-stone-200 p-1.5 lg:hidden" aria-label="Open sidebar navigation"><LayoutDashboard size={14} /></button>
                        <div className="relative hidden w-full max-w-[510px] sm:block">
                            <form onSubmit={(event) => { event.preventDefault(); goTo(searchResults[0]?.route || 'products', searchTerm); }} className="flex h-[30px] items-center gap-2 rounded-md border border-[#e5dfd7] bg-[#fffdfa] px-2.5">
                                <Search size={13} className="shrink-0 text-slate-400" />
                                <input ref={searchInputRef} value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)} placeholder="Search products, orders…" className="min-w-0 flex-1 bg-transparent text-[9px] outline-none" aria-label="Search products and orders" />
                                <kbd className="rounded border border-stone-200 px-1 text-[8px] text-slate-400">⌘ K</kbd>
                            </form>
                            {searchOpen && searchTerm.trim() && <div className="absolute left-0 right-0 top-9 z-40 rounded-md border border-stone-200 bg-white p-1.5 shadow-xl">
                                {searchResults.length ? searchResults.map((result) => <button key={result.id} type="button" onClick={() => goTo(result.route, searchTerm)} className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-orange-50"><span className="truncate text-[10px]">{result.label}</span><small className="ml-2 shrink-0 text-[8px] text-slate-400">{result.detail}</small></button>) : <p className="px-2 py-3 text-[9px] text-slate-500">No product or recent-order matches. Press Enter to open Products.</p>}
                            </div>}
                        </div>
                        <span className="truncate text-[10px] font-semibold text-slate-500 sm:hidden">{activeTitle}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                        <span className="hidden items-center gap-1.5 text-[9px] text-slate-500 xl:flex"><span className="text-sm">▦</span>{currentDate}</span>
                        <button type="button" onClick={() => goTo('inventory')} aria-label={`${store?.today.lowStockCount || 0} low-stock notices`} className="relative rounded p-1.5 text-slate-500 hover:bg-stone-100"><Bell size={14} />{store?.today.lowStockCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#c9532d] px-0.5 text-[7px] font-bold text-white">{Math.min(store.today.lowStockCount, 9)}</span>}</button>
                        <div className="flex items-center gap-1.5 border-l border-stone-200 pl-2.5 text-left">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#deb08d] text-[10px] font-extrabold text-[#5b2b1a]">{userInitial}</span>
                            <span className="hidden sm:block"><strong className="block max-w-[100px] truncate text-[9px]">{currentUser.username}</strong><small className="block text-[8px] capitalize text-slate-500">{currentUser.role}</small></span>
                            <ChevronDown size={11} className="hidden text-slate-400 sm:block" />
                        </div>
                    </div>
                </header>

                {mobileNavOpen && <nav className="fixed inset-x-0 top-[50px] z-30 grid grid-cols-2 gap-1 border-b border-stone-200 bg-white p-3 shadow-lg lg:hidden">{navGroups.flat().filter(({ adminOnly }) => !adminOnly || currentUser.role === 'admin').map(({ id, label, icon: Icon }) => <a key={id} href={`#/${id}`} onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-2 rounded p-2 text-[10px] ${route === id ? 'bg-orange-50 font-bold text-[#a94e2b]' : 'text-slate-600'}`}><Icon size={13} />{label}</a>)}</nav>}

                <main className="mx-auto max-w-[1600px] space-y-3 p-3 sm:p-4">
                    {route === 'dashboard' && <div className="flex flex-wrap items-end justify-between gap-2"><div><h1 className="font-playfair text-[22px] font-bold leading-tight text-[#252422]">Good {localHour < 12 ? 'morning' : localHour < 18 ? 'afternoon' : 'evening'}, {currentUser.role === 'seller' ? 'Seller' : 'Admin'}!</h1><p className="mt-0.5 text-[10px] text-slate-500">Here’s what’s happening with your store today.</p></div><span className="hidden text-[9px] text-slate-500 md:block">{currentDate}</span></div>}
                    {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[10px] text-rose-800"><ShieldCheck size={14} className="mt-0.5 shrink-0" /><div><strong>Dashboard request failed</strong><p className="mt-0.5">{error}</p>{/database setup is required/i.test(error) && <p className="mt-1">Apply <code>AI_Dashbord/schema.sql</code> in Supabase, then refresh.</p>}</div></div>}
                    {store && settings ? <Suspense fallback={<SectionCard className="py-12 text-center text-[10px] text-slate-500"><LoaderCircle size={15} className="mx-auto mb-2 animate-spin" />Loading page…</SectionCard>}>{renderPage()}</Suspense> : <SectionCard><p className="py-10 text-center text-[10px] text-slate-500">Store dashboard data is unavailable. Try refreshing the page.</p><button type="button" onClick={() => loadOverview(true)} className="mx-auto block text-[10px] font-bold text-[#a94e2b]">Retry</button></SectionCard>}
                    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e1da] py-2 text-[8px] text-slate-500"><span className="inline-flex items-center gap-1"><Database size={11} className="text-emerald-700" />Connected to shared store data</span><span className="inline-flex items-center gap-1"><ShieldCheck size={11} />Role-checked operations · AI receives minimized insights only</span><span className="inline-flex items-center gap-1"><Users size={11} />Shared seller and admin dashboard</span></footer>
                </main>
            </div>
        </div>
    );
};
