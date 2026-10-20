import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createApprovalSnapshot,
    canTransitionEmailDraft,
    isApprovalCurrent,
    isValidResearchUrl,
    normalizeCustomerSearch,
    qualifyDailyProspects,
    tavroSkills,
    tavroTools,
    validateCustomerEmailDraft,
} from './tavroService.js';

test('customer search input is bounded and cannot inject PostgREST wildcards', () => {
    assert.equal(normalizeCustomerSearch('  art%_buyer  '), 'artbuyer');
    assert.equal(normalizeCustomerSearch('x'.repeat(150)).length, 100);
});

test('email drafts require a valid address, subject, body, and purpose', () => {
    assert.deepEqual(validateCustomerEmailDraft({
        recipient: ' Guest@Example.com ',
        subject: 'Order update',
        body: 'Your order is being prepared.',
        purpose: 'order_update',
    }), {
        draft: {
            recipient: 'guest@example.com',
            subject: 'Order update',
            body: 'Your order is being prepared.',
            purpose: 'order_update',
        },
    });

    assert.match(validateCustomerEmailDraft({
        recipient: 'not-an-email',
        subject: 'Subject',
        body: 'Body',
        purpose: 'support',
    }).error, /valid customer email/i);
    assert.match(validateCustomerEmailDraft({
        recipient: 'guest@example.com',
        subject: '',
        body: 'Body',
        purpose: 'support',
    }).error, /subject/i);
    assert.match(validateCustomerEmailDraft({
        recipient: 'guest@example.com',
        subject: 'Subject',
        body: 'Body',
        purpose: 'arbitrary',
    }).error, /purpose/i);
});

test('daily prospect qualification requires current verified opt-in and no purchase or suppression', () => {
    const now = new Date().toISOString();
    const permissions = [
        { customer_id: '1', email: 'opted@example.com', consent_status: 'granted', consent_recorded_at: now },
        { customer_id: '2', email: 'no-consent@example.com', consent_status: 'revoked', consent_recorded_at: now },
        { customer_id: '3', email: 'buyer@example.com', consent_status: 'granted', consent_recorded_at: now },
        { customer_id: '4', email: 'suppressed@example.com', consent_status: 'granted', consent_recorded_at: now },
        { customer_id: '5', email: 'changed@example.com', consent_status: 'granted', consent_recorded_at: now },
        { customer_id: '6', email: 'unverified@example.com', consent_status: 'granted', consent_recorded_at: now },
        { customer_id: '7', email: 'future@example.com', consent_status: 'granted', consent_recorded_at: '2999-01-01T00:00:00.000Z' },
        { customer_id: '8', email: 'staff@example.com', consent_status: 'granted', consent_recorded_at: now },
    ];
    const customers = [
        { id: '1', email: 'opted@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '2', email: 'no-consent@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '3', email: 'buyer@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '4', email: 'suppressed@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '5', email: 'different@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '6', email: 'unverified@example.com', role: 'customer', status: 'active', email_verified: false },
        { id: '7', email: 'future@example.com', role: 'customer', status: 'active', email_verified: true },
        { id: '8', email: 'staff@example.com', role: 'admin', status: 'active', email_verified: true },
    ];
    const prospects = qualifyDailyProspects({
        permissions,
        customers,
        orderedCustomerIds: ['3'],
        suppressedEmails: ['suppressed@example.com'],
        recentlyContactedCustomerIds: [],
        limit: 10,
    });

    assert.deepEqual(prospects.map(({ id }) => id), ['1']);
});

test('daily prospect qualification never exceeds ten and excludes recent contacts', () => {
    const now = new Date().toISOString();
    const permissions = Array.from({ length: 12 }, (_, index) => ({
        customer_id: String(index + 1),
        email: `customer${index + 1}@example.com`,
        consent_status: 'granted',
        consent_recorded_at: now,
    }));
    const customers = permissions.map(({ customer_id, email }) => ({
        id: customer_id,
        email,
        role: 'customer',
        status: 'active',
        email_verified: true,
    }));
    const prospects = qualifyDailyProspects({
        permissions,
        customers,
        orderedCustomerIds: [],
        suppressedEmails: [],
        recentlyContactedCustomerIds: ['1'],
        limit: 50,
    });

    assert.equal(prospects.length, 10);
    assert.equal(prospects.some(({ id }) => id === '1'), false);
});

test('approval is bound to exact email content, purpose, and version', () => {
    const approved = createApprovalSnapshot({
        recipient: 'guest@example.com',
        subject: 'A note from Mithila Chitrakala',
        body: 'Hello there.',
        purpose: 'support',
        version: 3,
    });
    const storedDraft = {
        ...approved.snapshot,
        status: 'approved',
        approval_snapshot: approved.snapshot,
        approval_hash: approved.hash,
        approved_version: 3,
        version: 3,
    };

    assert.equal(isApprovalCurrent(storedDraft), true);
    assert.equal(isApprovalCurrent({ ...storedDraft, body: 'Edited after approval.' }), false);
    assert.equal(isApprovalCurrent({ ...storedDraft, recipient: 'other@example.com' }), false);
    assert.equal(isApprovalCurrent({ ...storedDraft, purpose: 'marketing' }), false);
    assert.equal(isApprovalCurrent({ ...storedDraft, version: 4 }), false);
});

test('email status transitions require approval and prevent duplicate sends', () => {
    assert.equal(canTransitionEmailDraft('draft', 'approved'), true);
    assert.equal(canTransitionEmailDraft('draft', 'sending'), false);
    assert.equal(canTransitionEmailDraft('approved', 'sending'), true);
    assert.equal(canTransitionEmailDraft('sending', 'sending'), false);
    assert.equal(canTransitionEmailDraft('sent', 'sending'), false);
    assert.equal(canTransitionEmailDraft('sending', 'sent'), true);
});

test('research sources must use HTTPS and cannot embed credentials', () => {
    assert.equal(isValidResearchUrl('https://example.com/research'), true);
    assert.equal(isValidResearchUrl('http://example.com'), false);
    assert.equal(isValidResearchUrl('https://user:pass@example.com'), false);
    assert.equal(isValidResearchUrl('not a URL'), false);
});

test('skill and tool registry does not expose unrestricted execution capabilities', () => {
    assert.ok(tavroSkills.some((skill) => skill.id === 'customer_research'));
    assert.ok(tavroTools.every((tool) => tool.permission && tool.timeoutMs > 0 && tool.input && tool.output));
    assert.equal(tavroTools.some((tool) => /shell|sql|filesystem|arbitrary/i.test(tool.id)), false);
});
