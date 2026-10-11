import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PageHeading, SectionCard, StatusPill } from './shared';

export const AdminUsersPage = ({ users = [], currentUser, onAction, loading, goTo }) => {
    const [workingId, setWorkingId] = useState(null);
    const [actionError, setActionError] = useState('');
    const runUserAction = async (user, action, payload) => {
        setWorkingId(user.id);
        setActionError('');
        try {
            await onAction(action, { userId: user.id, ...payload });
        } catch (error) {
            setActionError(error.message || 'Unable to update this account.');
        } finally {
            setWorkingId(null);
        }
    };
    const updateStatus = async (user, status) => {
        await runUserAction(user, 'set-user-status', { status });
    };
    return (
        <div>
            <PageHeading
                title="Artisans & Users"
                description="Manage existing seller and administrator access. New seller requests and store-name changes are reviewed in Approvals."
                action={<button type="button" onClick={() => goTo('approvals')} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700"><ClipboardCheck size={13} />Open approvals</button>}
            />
            <SectionCard>
                <p className="mb-4 text-[10px] text-slate-500">{users.length} accounts{loading ? ' · refreshing…' : ''}</p>
                {actionError && <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700" role="alert">{actionError}</p>}
                <div className="space-y-2">
                    {users.filter((user) => user.id !== currentUser.id && ['seller', 'admin'].includes(user.role)).map((user) => (
                        <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-100 p-3">
                            <div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-800">{user.name || user.username || user.email || user.id}</p><p className="truncate text-[9px] text-slate-500">{user.storeName || user.email} · <span className="capitalize">{user.role}</span> · email {user.email_verified === false ? 'unverified' : 'verified'}</p>{user.storeName_pending && <button type="button" onClick={() => goTo('approvals')} className="mt-2 text-left text-[9px] font-semibold text-[#a94e2b] hover:underline">Store-name request pending · Review in Approvals</button>}</div>
                            <div className="flex items-center gap-2"><StatusPill status={user.status} />{user.status === 'active' && <button type="button" disabled={workingId === user.id} onClick={() => updateStatus(user, 'disabled')} className="rounded border border-rose-200 px-2 py-1.5 text-[9px] font-semibold text-rose-700 disabled:opacity-50">Deactivate</button>}{user.status === 'disabled' && <button type="button" disabled={workingId === user.id || user.email_verified === false || Boolean(user.storeName_pending)} title={user.email_verified === false ? 'Account must be verified before access can be restored.' : user.storeName_pending ? 'Resolve the pending store-name request in Approvals first.' : ''} onClick={() => updateStatus(user, 'active')} className="rounded bg-emerald-700 px-2 py-1.5 text-[9px] font-semibold text-white disabled:opacity-50">Restore access</button>}</div>
                        </article>
                    ))}
                    {!users.some((user) => user.id !== currentUser.id && ['seller', 'admin'].includes(user.role)) && <p className="py-8 text-center text-[10px] text-slate-500">No other artisan or administrator accounts were found.</p>}
                </div>
            </SectionCard>
        </div>
    );
};
