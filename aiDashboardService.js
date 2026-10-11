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
    getMarketingCampaigns: (token) => request('/admin/ai/marketing/campaigns', token),
    getMarketingSocial: (token) => request('/admin/ai/marketing/social', token),
    connectMarketingSocial: (platform, token) => request(`/admin/ai/marketing/social/connect/${encodeURIComponent(platform)}`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    disconnectMarketingSocial: (accountId, token) => request(`/admin/ai/marketing/social/accounts/${encodeURIComponent(accountId)}/disconnect`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    getMarketingSocialPosts: (token) => request('/admin/ai/marketing/social/posts', token),
    publishMarketingSocialPost: (payload, token) => request('/admin/ai/marketing/social/posts', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    refreshMarketingSocialPost: (postId, token) => request(`/admin/ai/marketing/social/posts/${encodeURIComponent(postId)}/status`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    getIntegrations: (token) => request('/admin/ai/integrations', token),
    getAutomations: (token) => request('/admin/ai/automations', token),
    createAutomation: (payload, token) => request('/admin/ai/automations', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    updateAutomation: (automationId, payload, token) => request(`/admin/ai/automations/${encodeURIComponent(automationId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }),
    createMarketingCampaign: (payload, token) => request('/admin/ai/marketing/campaigns', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    updateMarketingCampaign: (campaignId, payload, token) => request(`/admin/ai/marketing/campaigns/${encodeURIComponent(campaignId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }),
    getWishlists: (token) => request('/admin/ai/wishlists', token),
    getSupportTickets: (token, params = {}) => {
        const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
        return request(`/admin/ai/support/tickets${query ? `?${query}` : ''}`, token);
    },
    getSupportTicket: (ticketId, token) => request(`/admin/ai/support/tickets/${encodeURIComponent(ticketId)}`, token),
    createSupportTicket: (payload, token) => request('/admin/ai/support/tickets', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    updateSupportTicket: (ticketId, payload, token) => request(`/admin/ai/support/tickets/${encodeURIComponent(ticketId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }),
    addSupportMessage: (ticketId, payload, token) => request(`/admin/ai/support/tickets/${encodeURIComponent(ticketId)}/messages`, token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    getCloudinaryUploadSignature: (token) => request('/admin/ai/cloudinary/signature', token),
    getEmailTemplates: (token) => request('/admin/ai/email/templates', token),
    getEmailTemplate: (templateId, token) => request(`/admin/ai/email/templates/${encodeURIComponent(templateId)}`, token),
    sendAdminEmail: (payload, token) => request('/admin/ai/email/send', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
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
