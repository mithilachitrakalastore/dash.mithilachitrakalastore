import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { DashboardApp } from './DashboardApp.jsx';
import { aiDashboardService } from './aiDashboardService.js';
import './styles.css';

const DASHBOARD_SESSION_KEY = 'mcs-ai-dashboard-session';
const GOOGLE_LINK_GRANT_KEY = 'mcs-ai-google-link-grant';

const App = () => {
    const [session, setSession] = useState(null);
    const [restoringSession, setRestoringSession] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [supabaseAuth, setSupabaseAuth] = useState(null);
    const [googleConfigured, setGoogleConfigured] = useState(false);
    const handledAccessToken = useRef('');

    const saveSession = (authenticated) => {
        const nextSession = { token: authenticated.token, admin: authenticated.admin };
        sessionStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
    };

    useEffect(() => {
        let isCurrent = true;
        const restoreSession = async () => {
            const savedSession = sessionStorage.getItem(DASHBOARD_SESSION_KEY);
            if (!savedSession) {
                setRestoringSession(false);
                return;
            }
            let parsedSession;
            try {
                parsedSession = JSON.parse(savedSession);
            } catch {
                sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
                setError('Saved dashboard session data is invalid. Sign in again.');
                setRestoringSession(false);
                return;
            }
            if (typeof parsedSession?.token !== 'string' || !parsedSession.token) {
                sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
                setError('Saved dashboard session data is invalid. Sign in again.');
                setRestoringSession(false);
                return;
            }
            try {
                const verified = await aiDashboardService.verifySession(parsedSession.token);
                if (isCurrent) {
                    setSession({ token: parsedSession.token, admin: verified.admin });
                }
            } catch (restoreError) {
                if (restoreError.status === 401 || restoreError.status === 403) {
                    sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
                    if (isCurrent) setError('Your saved session has expired. Sign in again.');
                } else if (isCurrent) {
                    setError(`Unable to verify the saved session: ${restoreError.message}`);
                }
            } finally {
                if (isCurrent) setRestoringSession(false);
            }
        };
        restoreSession();
        return () => { isCurrent = false; };
    }, []);

    useEffect(() => {
        let isCurrent = true;
        aiDashboardService.getAuthConfig()
            .then(({ supabaseUrl, supabaseAnonKey }) => {
                if (!isCurrent) return;
                setSupabaseAuth(createClient(supabaseUrl, supabaseAnonKey));
                setGoogleConfigured(true);
            })
            .catch((configError) => {
                if (!isCurrent) return;
                setGoogleConfigured(false);
                setError(configError.message || 'Google sign-in is not configured.');
            });
        return () => { isCurrent = false; };
    }, []);

    useEffect(() => {
        if (!supabaseAuth) return undefined;
        let isCurrent = true;
        const processGoogleSession = async (authSession) => {
            if (!authSession?.access_token || handledAccessToken.current === authSession.access_token) return;
            handledAccessToken.current = authSession.access_token;
            setLoading(true);
            setError('');
            try {
                const linkGrant = sessionStorage.getItem(GOOGLE_LINK_GRANT_KEY) || '';
                sessionStorage.removeItem(GOOGLE_LINK_GRANT_KEY);
                const authenticated = await aiDashboardService.loginWithGoogle(authSession.access_token, linkGrant);
                if (isCurrent) {
                    saveSession(authenticated);
                    setPassword('');
                }
            } catch (authError) {
                handledAccessToken.current = '';
                if (isCurrent) setError(authError.message || 'Unable to verify Google store account sign-in.');
            } finally {
                await supabaseAuth.auth.signOut();
                if (isCurrent) setLoading(false);
            }
        };

        const { data: listener } = supabaseAuth.auth.onAuthStateChange((_event, authSession) => {
            if (authSession) window.setTimeout(() => processGoogleSession(authSession), 0);
        });
        supabaseAuth.auth.getSession()
            .then(({ data, error: sessionError }) => {
                if (sessionError) throw sessionError;
                if (data.session) processGoogleSession(data.session);
            })
            .catch((sessionError) => {
                if (isCurrent) setError(sessionError.message || 'Unable to restore Google sign-in.');
            });

        return () => {
            isCurrent = false;
            listener.subscription.unsubscribe();
        };
    }, [supabaseAuth]);

    const signIn = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const authenticated = await aiDashboardService.login(username, password);
            saveSession(authenticated);
            setPassword('');
        } catch (loginError) {
            setError(loginError.message || 'Unable to sign in.');
        } finally {
            setLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        if (!supabaseAuth || loading) return;
        setLoading(true);
        setError('');
        try {
            sessionStorage.removeItem(GOOGLE_LINK_GRANT_KEY);
            const { error: oauthError } = await supabaseAuth.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
            });
            if (oauthError) throw oauthError;
        } catch (oauthError) {
            setError(oauthError.message || 'Unable to start Google sign-in.');
            setLoading(false);
        }
    };

    const linkGoogleToStoreAccount = async () => {
        if (!supabaseAuth || loading) return;
        setLoading(true);
        setError('');
        try {
            const { linkGrant } = await aiDashboardService.createGoogleLinkGrant(username, password);
            sessionStorage.setItem(GOOGLE_LINK_GRANT_KEY, linkGrant);
            const { error: oauthError } = await supabaseAuth.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
            });
            if (oauthError) throw oauthError;
        } catch (linkError) {
            sessionStorage.removeItem(GOOGLE_LINK_GRANT_KEY);
            setError(linkError.message || 'Unable to verify the store account for Google linking.');
            setLoading(false);
        }
    };

    const signOut = () => {
        sessionStorage.removeItem(DASHBOARD_SESSION_KEY);
        setSession(null);
        setPassword('');
    };

    if (restoringSession) {
        return <main className="grid min-h-screen place-items-center bg-[#f7f4ee] text-sm text-stone-600">Restoring your dashboard session…</main>;
    }

    if (session) {
        return <DashboardApp currentUser={{ ...session.admin, emailAdminToken: session.token }} onSignOut={signOut} />;
    }

    return (
        <main className="login-shell">
            <section className="login-card">
                <p className="eyebrow">Mithila Chitrakala Store</p>
                <h1>AI Command Center</h1>
                <p className="login-description">Sign in with an active seller or administrator account to view the store insights dashboard.</p>
                <button type="button" onClick={signInWithGoogle} disabled={loading || !googleConfigured} className="google-signin-button">
                    <span className="google-mark" aria-hidden="true">G</span>
                    {loading ? 'Verifying Google account…' : 'Continue with Google'}
                </button>
                {!googleConfigured && <p className="login-footnote">Google sign-in is unavailable until the dashboard server has Supabase URL and anon-key configuration.</p>}
                <div className="login-divider"><span>or use your password</span></div>
                <form onSubmit={signIn}>
                    <label htmlFor="username">Seller or administrator username/email</label>
                    <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={254} />
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} />
                    {error && <p role="alert" className="login-error">{error}</p>}
                    <button type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Sign in securely'}</button>
                    <button type="button" className="link-google-button" onClick={linkGoogleToStoreAccount} disabled={loading || !googleConfigured}>
                        {loading ? 'Verifying…' : 'Link Google to this store account'}
                    </button>
                </form>
                <p className="login-footnote">Linking requires the password for an existing active, verified seller or administrator account and a verified Google account. The short-lived link grant is held in session storage only during sign-in. Your dashboard session survives page refreshes in this tab and is cleared when you sign out, close the tab, or the 12-hour session expires.</p>
            </section>
        </main>
    );
};

createRoot(document.getElementById('root')).render(<App />);
