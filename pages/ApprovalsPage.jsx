import React, { useMemo, useState } from 'react';
import { Check, Clock3, Store, UserRoundCheck, X } from 'lucide-react';
import { PageHeading, SectionCard, StatusPill } from './shared';

export const ApprovalsPage = ({ users = [], currentUser, onAction, loading }) => {
    const [workingId, setWorkingId] = useState(null);
    const [actionError, setActionError] = useState('');
    const requests = useMemo(() => users
        .filter((user) => user.id !== currentUser.id && user.role === 'seller')
        .flatMap((user) => {
            if (user.storeName_pending) return [{ ...user, requestType: 'store-name' }];
            if (user.status === 'pending' && user.email_verified !== false) {
                return [{ ...user, requestType: 'account-activation' }];
            }
            return [];
        }), [currentUser.id, users]);

    const review = async (user, action, payload = {}) => {
        setWorkingId(user.id);
        setActionError('');
        try {
            await onAction(action, { userId: user.id, ...payload });
        } catch (error) {
            setActionError(error.message || 'Unable to process this request.');
        } finally {
            setWorkingId(null);
        }
    };

    return (
        <div>
            <PageHeading title="Approvals" description="Review seller store-name changes and verified seller account activation requests." />
            <SectionCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-500">{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}{loading ? ' · refreshing…' : ''}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-800"><Clock3 size={12} />Admin review queue</span>
                </div>
                {actionError && <p className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700" role="alert">{actionError}</p>}
                <div className="space-y-2">
                    {requests.map((user) => {
                        const isStoreName = user.requestType === 'store-name';
                        return (
                            <article key={`${user.requestType}-${user.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-100 p-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-50 text-[#a94e2b]">{isStoreName ? <Store size={16} /> : <UserRoundCheck size={16} />}</span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-[11px] font-bold text-slate-800">{user.name || user.username || user.email || user.id}</p>
                                            <StatusPill status={isStoreName ? 'pending' : user.status} />
                                        </div>
                                        <p className="mt-1 truncate text-[9px] text-slate-500">{user.email || 'No email on file'} · seller · {isStoreName ? 'Store name change' : 'Account activation'}</p>
                                        {isStoreName
                                            ? <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[10px] font-semibold text-amber-900">Requested name: {user.storeName_pending}<span className="mt-0.5 block font-normal text-amber-800">Current name: {user.storeName || 'Not set'}</span></p>
                                            : <p className="mt-2 text-[9px] text-slate-600">Email is verified. Approving grants this seller dashboard access.</p>}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button type="button" disabled={workingId === user.id} onClick={() => isStoreName
                                        ? review(user, 'reject-store-name')
                                        : review(user, 'set-user-status', { status: 'disabled' })}
                                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-2 text-[9px] font-bold text-rose-700 disabled:opacity-50">
                                        <X size={12} />{isStoreName ? 'Reject' : 'Decline'}
                                    </button>
                                    <button type="button" disabled={workingId === user.id} onClick={() => isStoreName
                                        ? review(user, 'approve-store-name', { storeName: user.storeName_pending })
                                        : review(user, 'set-user-status', { status: 'active' })}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-2 text-[9px] font-bold text-white disabled:opacity-50">
                                        <Check size={12} />{isStoreName ? 'Approve name' : 'Activate account'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                    {!requests.length && <div className="py-12 text-center"><Check size={22} className="mx-auto text-emerald-700" /><p className="mt-2 text-[11px] font-bold text-slate-700">You’re all caught up</p><p className="mt-1 text-[9px] text-slate-500">New seller requests will appear here when they are ready for review.</p></div>}
                </div>
            </SectionCard>
        </div>
    );
};
