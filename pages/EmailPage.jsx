import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { aiDashboardService } from '../aiDashboardService';
import { PageHeading, SectionCard } from './shared';

const AUTO_TEMPLATE_VARIABLES = new Set(['USER_NAME', 'USER_EMAIL', 'APP_NAME', 'CREATED_DATE', 'YEAR']);
const EMAIL_SENDERS = [
    ['hello', 'hello@mithilachitrakalastore.com.np'],
    ['orders', 'orders@mithilachitrakalastore.com.np'],
    ['support', 'support@mithilachitrakalastore.com.np'],
    ['security', 'security@mithilachitrakalastore.com.np'],
];

const createInitialDraft = () => ({
    mode: 'custom',
    sender: 'hello',
    replyTo: 'support',
    category: 'general',
    to: '',
    subject: '',
    template: '',
    templateVariables: {},
    contentType: 'text',
    message: '',
});

const fieldClass = 'mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none focus:border-[#c45a2e]';
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-500';

export const EmailPage = ({ token }) => {
    const [draft, setDraft] = useState(createInitialDraft);
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [templateError, setTemplateError] = useState('');
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState(null);

    const loadTemplates = useCallback(async () => {
        setTemplatesLoading(true);
        setTemplatesError('');
        try {
            const result = await aiDashboardService.getEmailTemplates(token);
            setTemplates(result.templates || []);
        } catch (error) {
            setTemplatesError(error.message || 'Unable to load Resend templates.');
        } finally {
            setTemplatesLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    useEffect(() => {
        if (draft.mode !== 'template' || !draft.template) {
            setSelectedTemplate(null);
            setTemplateError('');
            return undefined;
        }

        let current = true;
        setSelectedTemplate(null);
        setTemplateLoading(true);
        setTemplateError('');
        aiDashboardService.getEmailTemplate(draft.template, token)
            .then((result) => {
                if (current) setSelectedTemplate(result.template);
            })
            .catch((error) => {
                if (current) {
                    setSelectedTemplate(null);
                    setTemplateError(error.message || 'Unable to load template details.');
                }
            })
            .finally(() => {
                if (current) setTemplateLoading(false);
            });
        return () => { current = false; };
    }, [draft.mode, draft.template, token]);

    const updateDraft = (field, value) => {
        setDraft((previous) => ({ ...previous, [field]: value }));
        setNotice(null);
    };

    const sendEmail = async (event) => {
        event.preventDefault();
        setNotice(null);
        setSending(true);
        try {
            const result = await aiDashboardService.sendAdminEmail({
                to: draft.to,
                subject: draft.subject,
                message: draft.message,
                category: draft.category,
                sender: draft.sender,
                replyTo: draft.replyTo,
                template: draft.template,
                templateMode: draft.mode,
                templateVariables: draft.templateVariables,
                isHtml: draft.contentType === 'html',
            }, token);
            setNotice({ type: 'success', text: result.message || 'Email sent successfully.' });
            setDraft(createInitialDraft());
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to send the email.' });
        } finally {
            setSending(false);
        }
    };

    const updateTemplateVariable = (key, value) => {
        setDraft((previous) => ({
            ...previous,
            templateVariables: { ...previous.templateVariables, [key]: value },
        }));
        setNotice(null);
    };

    return (
        <div>
            <PageHeading
                title="Email"
                description="Send a custom message or a published Resend template to a customer."
            />
            <SectionCard className="max-w-4xl">
                <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <Mail size={15} className="text-[#c45a2e]" />
                    <h2 className="text-[12px] font-extrabold text-slate-800">Compose email</h2>
                </div>

                {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mb-4 rounded-md border px-3 py-2.5 text-[10px] ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</div>}

                <div className="mb-4 flex w-full max-w-sm rounded-md bg-stone-100 p-1">
                    <button type="button" onClick={() => updateDraft('mode', 'custom')} className={`flex-1 rounded px-3 py-2 text-[10px] font-bold ${draft.mode === 'custom' ? 'bg-white text-[#a94e2b] shadow-sm' : 'text-slate-500'}`}>Custom</button>
                    <button type="button" onClick={() => updateDraft('mode', 'template')} className={`flex-1 rounded px-3 py-2 text-[10px] font-bold ${draft.mode === 'template' ? 'bg-white text-[#a94e2b] shadow-sm' : 'text-slate-500'}`}>Resend template</button>
                </div>

                <form onSubmit={sendEmail} className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]">
                        <label className={labelClass}>To
                            <input required type="email" maxLength={320} autoComplete="email" value={draft.to} onChange={(event) => updateDraft('to', event.target.value)} placeholder="customer@example.com" className={fieldClass} />
                        </label>
                        <label className={labelClass}>Category
                            <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)} className={fieldClass}>
                                <option value="security">Security</option>
                                <option value="support">Support</option>
                                <option value="general">General</option>
                                <option value="orders">Orders</option>
                                <option value="welcome">Welcome</option>
                            </select>
                        </label>
                    </div>

                    {draft.mode === 'template' ? (
                        <div className="space-y-4">
                            <div>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <label htmlFor="email-template" className={labelClass}>Published template</label>
                                    <button type="button" onClick={loadTemplates} disabled={templatesLoading} className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#a94e2b] disabled:opacity-50">
                                        <RefreshCw size={11} className={templatesLoading ? 'animate-spin' : ''} /> Refresh
                                    </button>
                                </div>
                                <select id="email-template" required value={draft.template} onChange={(event) => setDraft((previous) => ({ ...previous, template: event.target.value, templateVariables: {} }))} className={fieldClass}>
                                    <option value="">{templatesLoading ? 'Loading templates…' : 'Choose a template'}</option>
                                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                                </select>
                                {templatesError && <p role="alert" className="mt-1 text-[10px] text-rose-700">{templatesError}</p>}
                                {!templatesLoading && !templatesError && templates.length === 0 && <p className="mt-1 text-[10px] text-slate-500">No published templates available.</p>}
                            </div>

                            {templateLoading && <p className="text-[10px] text-slate-500">Loading template fields…</p>}
                            {templateError && <p role="alert" className="text-[10px] text-rose-700">{templateError}</p>}
                            {selectedTemplate?.variables?.some(({ key }) => AUTO_TEMPLATE_VARIABLES.has(key)) && <p className="text-[10px] leading-4 text-slate-500">USER_NAME is resolved from the recipient profile or email address. USER_EMAIL and standard store values are filled automatically.</p>}
                            {selectedTemplate?.variables?.filter(({ key }) => !AUTO_TEMPLATE_VARIABLES.has(key)).map((variable) => (
                                <label key={variable.key} className={labelClass}>{variable.key} <span className="font-normal normal-case">({variable.type})</span>
                                    <input
                                        required={variable.fallback_value == null || variable.fallback_value === ''}
                                        type={variable.type === 'number' ? 'number' : 'text'}
                                        step={variable.type === 'number' ? 'any' : undefined}
                                        value={draft.templateVariables[variable.key] ?? (variable.fallback_value == null ? '' : String(variable.fallback_value))}
                                        onChange={(event) => updateTemplateVariable(variable.key, event.target.value)}
                                        placeholder={`Value for ${variable.key}`}
                                        className={fieldClass}
                                    />
                                </label>
                            ))}
                            {selectedTemplate && !selectedTemplate.variables?.some(({ key }) => !AUTO_TEMPLATE_VARIABLES.has(key)) && <p className="text-[10px] text-slate-500">This template's values are filled automatically or it needs no additional values.</p>}

                            <details className="border-t border-stone-100 pt-3">
                                <summary className="cursor-pointer text-[10px] font-bold text-slate-600">Advanced settings</summary>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <label className={labelClass}>Subject override
                                        <input type="text" maxLength={998} value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)} placeholder={selectedTemplate?.subject || 'Use template subject'} className={fieldClass} />
                                    </label>
                                    <label className={labelClass}>From
                                        <select value={draft.sender} onChange={(event) => updateDraft('sender', event.target.value)} className={fieldClass}>{EMAIL_SENDERS.map(([key, address]) => <option key={key} value={key}>{address}</option>)}</select>
                                    </label>
                                    <label className={labelClass}>Reply-to
                                        <select value={draft.replyTo} onChange={(event) => updateDraft('replyTo', event.target.value)} className={fieldClass}>{EMAIL_SENDERS.map(([key, address]) => <option key={key} value={key}>{address}</option>)}</select>
                                    </label>
                                </div>
                            </details>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className={labelClass}>Subject
                                <input required type="text" maxLength={998} value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)} placeholder="Email subject" className={fieldClass} />
                            </label>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor="email-message" className={labelClass}>Message</label>
                                <div className="inline-flex rounded bg-stone-100 p-1">
                                    <button type="button" onClick={() => updateDraft('contentType', 'text')} className={`rounded px-2.5 py-1.5 text-[9px] font-bold ${draft.contentType === 'text' ? 'bg-white text-[#a94e2b] shadow-sm' : 'text-slate-500'}`}>Text</button>
                                    <button type="button" onClick={() => updateDraft('contentType', 'html')} className={`rounded px-2.5 py-1.5 text-[9px] font-bold ${draft.contentType === 'html' ? 'bg-white text-[#a94e2b] shadow-sm' : 'text-slate-500'}`}>HTML</button>
                                </div>
                            </div>
                            <textarea id="email-message" required maxLength={8000} rows={12} value={draft.message} onChange={(event) => updateDraft('message', event.target.value)} placeholder={draft.contentType === 'html' ? '<html>…</html>' : 'Write your message'} spellCheck={draft.contentType !== 'html'} className={`${fieldClass} font-mono`} />
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className={labelClass}>From
                                    <select value={draft.sender} onChange={(event) => updateDraft('sender', event.target.value)} className={fieldClass}>{EMAIL_SENDERS.map(([key, address]) => <option key={key} value={key}>{address}</option>)}</select>
                                </label>
                                <label className={labelClass}>Reply-to
                                    <select value={draft.replyTo} onChange={(event) => updateDraft('replyTo', event.target.value)} className={fieldClass}>{EMAIL_SENDERS.map(([key, address]) => <option key={key} value={key}>{address}</option>)}</select>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end border-t border-stone-100 pt-3">
                        <button type="submit" disabled={sending || (draft.mode === 'template' && (templateLoading || Boolean(templateError) || templatesLoading))} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#903f23] disabled:cursor-not-allowed disabled:opacity-50">
                            <Send size={12} />{sending ? 'Sending…' : 'Send email'}
                        </button>
                    </div>
                </form>
            </SectionCard>
        </div>
    );
};
