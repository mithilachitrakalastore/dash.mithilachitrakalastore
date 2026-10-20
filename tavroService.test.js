import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createApprovalSnapshot,
    isApprovalCurrent,
    isValidResearchUrl,
    normalizeCustomerSearch,
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
    assert.equal(isApprovalCurrent({ ...storedDraft, version: 4 }), false);
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
