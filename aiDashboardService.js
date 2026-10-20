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
    generateMarketingSocialContent: (payload, token) => request('/admin/ai/marketing/social/generate-content', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    connectMarketingSocial: (platform, token) => request(`/admin/ai/marketing/social/connect/${encodeURIComponent(platform)}`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    disconnectMarketingSocial: (accountId, token) => request(`/admin/ai/marketing/social/accounts/${encodeURIComponent(accountId)}/disconnect`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    getMarketingSocialPosts: (token) => request('/admin/ai/marketing/social/posts', token),
    deleteMarketingSocialPost: (postId, token) => request(`/admin/ai/marketing/social/posts/${encodeURIComponent(postId)}`, token, {
        method: 'DELETE',
    }),
    publishMarketingSocialPost: (payload, token) => request('/admin/ai/marketing/social/posts', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    refreshMarketingSocialPost: (postId, token) => request(`/admin/ai/marketing/social/posts/${encodeURIComponent(postId)}/status`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    cancelScheduledMarketingSocialPost: (postId, token) => request(`/admin/ai/marketing/social/posts/${encodeURIComponent(postId)}/cancel`, token, {
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
    getCloudinaryImages: (token, cursor = '') => {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
        return request(`/admin/ai/cloudinary/images${query}`, token);
    },
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
    getTavroConversations: (token) => request('/admin/ai/tavro/conversations', token),
    createTavroConversation: (title, token) => request('/admin/ai/tavro/conversations', token, {
        method: 'POST',
        body: JSON.stringify({ title }),
    }),
    getTavroMessages: (conversationId, token) => request(`/admin/ai/tavro/conversations/${encodeURIComponent(conversationId)}/messages`, token),
    sendTavroMessage: (conversationId, message, token) => request(`/admin/ai/tavro/conversations/${encodeURIComponent(conversationId)}/messages`, token, {
        method: 'POST',
        body: JSON.stringify({ message }),
    }),
    searchTavroCustomers: (query, token) => request(`/admin/ai/tavro/customers?q=${encodeURIComponent(query)}`, token),
    getTavroCustomer: (customerId, token) => request(`/admin/ai/tavro/customers/${encodeURIComponent(customerId)}`, token),
    saveTavroMarketingPermission: (customerId, payload, token) => request(`/admin/ai/tavro/customers/${encodeURIComponent(customerId)}/marketing-permission`, token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    getTavroEmailDrafts: (token) => request('/admin/ai/tavro/email-drafts', token),
    generateTavroEmailDraft: (payload, token) => request('/admin/ai/tavro/email-drafts/generate', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    updateTavroEmailDraft: (draftId, payload, token) => request(`/admin/ai/tavro/email-drafts/${encodeURIComponent(draftId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    }),
    approveTavroEmailDraft: (draftId, token) => request(`/admin/ai/tavro/email-drafts/${encodeURIComponent(draftId)}/approve`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    sendTavroEmailDraft: (draftId, token) => request(`/admin/ai/tavro/email-drafts/${encodeURIComponent(draftId)}/send`, token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    suppressTavroEmail: (payload, token) => request('/admin/ai/tavro/email-suppressions', token, {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    researchTavro: (query, token) => request('/admin/ai/tavro/research', token, {
        method: 'POST',
        body: JSON.stringify({ query }),
    }),
    getTavroUsage: (token) => request('/admin/ai/tavro/usage', token),
    getTavroProspecting: (token) => request('/admin/ai/tavro/prospecting', token),
    updateTavroProspecting: (enabled, token) => request('/admin/ai/tavro/prospecting', token, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
    }),
    runTavroProspecting: (token) => request('/admin/ai/tavro/prospecting/run', token, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
};
