import React, { useState } from 'react';
import { PageHeading, SectionCard, StatusPill } from './shared';

export const AdminUsersPage = ({ users = [], currentUser, onAction, loading }) => {
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
    const reviewStoreName = async (user, approved) => {
        await runUserAction(user, approved ? 'approve-store-name' : 'reject-store-name', {
            ...(approved ? { storeName: user.storeName_pending } : {}),
        });
    };

    return (
        <div>
            <PageHeading title="Artisans & Users" description="Review seller accounts and their activation status. Customer account details are not included here." />
            <SectionCard>
                <p className="mb-4 text-[10px] text-slate-500">{users.length} accounts{loading ? ' · refreshing…' : ''}</p>
                {actionError && <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700" role="alert">{actionError}</p>}
                <div className="space-y-2">
                    {users.filter((user) => user.id !== currentUser.id && ['seller', 'admin'].includes(user.role)).map((user) => (
                        <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-100 p-3">
                            <div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-800">{user.name || user.username || user.email || user.id}</p><p className="truncate text-[9px] text-slate-500">{user.storeName || user.email} · <span className="capitalize">{user.role}</span> · email {user.email_verified === false ? 'unverified' : 'verified'}</p>{user.storeName_pending && <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2"><p className="text-[9px] font-semibold text-amber-800">Requested store name: {user.storeName_pending}</p><div className="mt-2 flex gap-2"><button type="button" disabled={workingId === user.id} onClick={() => reviewStoreName(user, true)} className="rounded bg-emerald-700 px-2 py-1.5 text-[9px] font-semibold text-white disabled:opacity-50">Approve name</button><button type="button" disabled={workingId === user.id} onClick={() => reviewStoreName(user, false)} className="rounded border border-rose-200 px-2 py-1.5 text-[9px] font-semibold text-rose-700 disabled:opacity-50">Reject name</button></div></div>}</div>
                            <div className="flex items-center gap-2"><StatusPill status={user.status} />{user.status === 'active' ? <button type="button" disabled={workingId === user.id} onClick={() => updateStatus(user, 'disabled')} className="rounded border border-rose-200 px-2 py-1.5 text-[9px] font-semibold text-rose-700 disabled:opacity-50">Deactivate</button> : <button type="button" disabled={workingId === user.id || user.email_verified === false || Boolean(user.storeName_pending)} title={user.email_verified === false ? 'Account must be verified before activation.' : user.storeName_pending ? 'Approve or reject the requested store name first.' : ''} onClick={() => updateStatus(user, 'active')} className="rounded bg-emerald-700 px-2 py-1.5 text-[9px] font-semibold text-white disabled:opacity-50">Activate</button>}</div>
                        </article>
                    ))}
                    {!users.some((user) => user.id !== currentUser.id && ['seller', 'admin'].includes(user.role)) && <p className="py-8 text-center text-[10px] text-slate-500">No other artisan or administrator accounts were found.</p>}
                </div>
            </SectionCard>
        </div>
    );
};
