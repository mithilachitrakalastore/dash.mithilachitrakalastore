import { createHash } from 'node:crypto';

export const tavroSkills = [
    {
        id: 'business_assistance',
        purpose: 'Answer business development, product positioning, and professional writing questions.',
        inputs: ['administrator_prompt'],
        output: 'plain_text_advice',
        tools: [],
        permission: 'active_administrator',
        safety: 'Do not invent store facts, customer information, research, or actions.',
    },
    {
        id: 'customer_research',
        purpose: 'Find existing store customer records and summarize verified order and support history.',
        inputs: ['search_query', 'customer_id'],
        output: 'authorized_customer_records',
        tools: ['search_customers', 'get_customer_profile'],
        permission: 'active_administrator',
        safety: 'Search structured store tables only; never infer preferences not supported by records.',
    },
    {
        id: 'email_drafting',
        purpose: 'Prepare an individual customer email for human review.',
        inputs: ['customer_id', 'purpose', 'tone'],
        output: 'editable_email_draft',
        tools: ['get_customer_profile', 'draft_customer_email'],
        permission: 'active_administrator',
        safety: 'Draft only; sending requires explicit approval of the unchanged recipient, subject, and body.',
    },
    {
        id: 'marketing_research',
        purpose: 'Research public marketing opportunities and develop source-aware recommendations.',
        inputs: ['research_question'],
        output: 'research_report_with_sources',
        tools: ['search_public_web'],
        permission: 'active_administrator',
        safety: 'Separate sourced observations from hypotheses; never invent citations or performance claims.',
    },
];

export const tavroTools = [
    {
        id: 'search_customers',
        input: { query: 'string, 2-100 characters' },
        output: 'up to 20 matching customer records',
        permission: 'active_administrator',
        timeoutMs: 5000,
        available: true,
    },
    {
        id: 'get_customer_profile',
        input: { customerId: 'string' },
        output: 'customer identity, bounded order history, and support ticket summaries',
        permission: 'active_administrator',
        timeoutMs: 5000,
        available: true,
    },
    {
        id: 'draft_customer_email',
        input: { customerId: 'string', purpose: 'support | order_update | marketing', tone: 'string' },
        output: 'persisted editable email draft',
        permission: 'active_administrator',
        timeoutMs: 30000,
        available: true,
    },
    {
        id: 'send_approved_email',
        input: { draftId: 'string' },
        output: 'provider message ID and delivery submission status',
        permission: 'active_administrator_and_explicit_approval',
        timeoutMs: 30000,
        available: true,
    },
    {
        id: 'search_public_web',
        input: { query: 'string, 3-800 characters' },
        output: 'grounded research with provider citations, when available',
        permission: 'active_administrator',
        timeoutMs: 30000,
        available: true,
    },
];

export const normalizeCustomerSearch = (value) => String(value || '')
    .trim()
    .replace(/[%_]/g, '')
    .slice(0, 100);

export const qualifyDailyProspects = ({
    permissions,
    customers,
    orderedCustomerIds,
    suppressedEmails,
    recentlyContactedCustomerIds,
    limit = 10,
}) => {
    const customerById = new Map((customers || []).map((customer) => [String(customer.id), customer]));
    const orderedIds = new Set((orderedCustomerIds || []).map(String));
    const suppressed = new Set((suppressedEmails || []).map((email) => String(email).toLowerCase()));
    const recentlyContacted = new Set((recentlyContactedCustomerIds || []).map(String));
    const seenCustomerIds = new Set();
    const qualified = [];

    for (const permission of permissions || []) {
        const customerId = String(permission.customer_id || '');
        const customer = customerById.get(customerId);
        const email = String(permission.email || '').trim().toLowerCase();
        if (!customerId || seenCustomerIds.has(customerId)) continue;
        seenCustomerIds.add(customerId);
        if (permission.consent_status !== 'granted' ||
            !Number.isFinite(new Date(permission.consent_recorded_at).getTime()) ||
            new Date(permission.consent_recorded_at).getTime() > Date.now() ||
            !customer ||
            ['admin', 'seller'].includes(String(customer.role || '').toLowerCase()) ||
            String(customer.status || '').toLowerCase() !== 'active' ||
            customer.email_verified !== true ||
            !customer.email ||
            String(customer.email).trim().toLowerCase() !== email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            orderedIds.has(customerId) ||
            suppressed.has(email) ||
            recentlyContacted.has(customerId)) continue;
        qualified.push({
            ...customer,
            id: customerId,
            email,
            consentRecordedAt: permission.consent_recorded_at,
        });
    }

    return qualified
        .sort((left, right) => new Date(right.consentRecordedAt) - new Date(left.consentRecordedAt))
        .slice(0, Math.min(10, Math.max(0, Number(limit) || 0)));
};

export const validateCustomerEmailDraft = ({ recipient, subject, body, purpose }) => {
    const normalizedRecipient = String(recipient || '').trim().toLowerCase();
    const normalizedSubject = String(subject || '').trim();
    const normalizedBody = String(body || '').trim();
    const allowedPurposes = new Set(['support', 'order_update', 'marketing']);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient) || normalizedRecipient.length > 320) {
        return { error: 'A valid customer email address is required.' };
    }
    if (!normalizedSubject || normalizedSubject.length > 998) {
        return { error: 'The subject must contain 1-998 characters.' };
    }
    if (!normalizedBody || normalizedBody.length > 8000) {
        return { error: 'The message must contain 1-8,000 characters.' };
    }
    if (!allowedPurposes.has(purpose)) {
        return { error: 'Choose a valid email purpose.' };
    }
    return {
        draft: {
            recipient: normalizedRecipient,
            subject: normalizedSubject,
            body: normalizedBody,
            purpose,
        },
    };
};

export const createApprovalSnapshot = ({ recipient, subject, body, purpose, version }) => {
    const snapshot = {
        recipient: String(recipient),
        subject: String(subject),
        body: String(body),
        purpose: String(purpose),
        version: Number(version),
    };
    const hash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    return { snapshot, hash };
};

const allowedEmailDraftTransitions = {
    draft: new Set(['approved', 'cancelled']),
    pending_approval: new Set(['approved', 'draft', 'cancelled']),
    approved: new Set(['draft', 'sending', 'cancelled']),
    sending: new Set(['sent', 'failed']),
    failed: new Set(['draft', 'approved', 'cancelled']),
    sent: new Set(),
    cancelled: new Set(),
};

export const canTransitionEmailDraft = (currentStatus, nextStatus) =>
    allowedEmailDraftTransitions[currentStatus]?.has(nextStatus) || false;

export const isApprovalCurrent = (draft) => {
    if (!draft?.approval_snapshot || !draft?.approval_hash) return false;
    if (Number(draft.approved_version) !== Number(draft.version)) return false;
    const approved = createApprovalSnapshot({
        ...draft.approval_snapshot,
        version: draft.approved_version,
    });
    const current = createApprovalSnapshot({
        recipient: draft.recipient,
        subject: draft.subject,
        body: draft.body,
        purpose: draft.purpose,
        version: draft.version,
    });
    return approved.hash === draft.approval_hash &&
        current.hash === draft.approval_hash;
};

export const isValidResearchUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
        return false;
    }
};
