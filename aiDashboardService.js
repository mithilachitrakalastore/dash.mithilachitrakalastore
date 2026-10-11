const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const request = async (path, token, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
            ...options.headers,
        },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || `Server returned ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
};

export const aiDashboardService = {
    getAuthConfig: () => request('/admin/ai/auth-config', ''),
    login: (username, password) => request('/admin/ai/session', '', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    }),
    createGoogleLinkGrant: (username, password) => request('/admin/ai/session/google-link-grant', '', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    }),
    loginWithGoogle: (supabaseAccessToken, linkGrant = '') => request('/admin/ai/session/google', '', {
        method: 'POST',
        body: JSON.stringify({ supabaseAccessToken, linkGrant }),
    }),
    verifySession: (token) => request('/admin/ai/session/verify', token, { method: 'POST' }),
    getOverview: (token) => request('/admin/ai/overview', token),
    getStoreManagement: (token) => request('/admin/ai/store-management', token),
    getCloudinaryUploadSignature: (token) => request('/admin/ai/cloudinary/signature', token),
    runStoreAction: (action, payload, token) => request('/admin/ai/store-management/action', token, {
        method: 'POST',
        body: JSON.stringify({ action, payload }),
    }),
    runCommand: (prompt, token) => request('/admin/ai/command', token, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    }),
    updateSettings: (settings, token) => request('/admin/ai/settings', token, {
        method: 'PATCH',
        body: JSON.stringify(settings),
    }),
};
