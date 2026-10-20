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
