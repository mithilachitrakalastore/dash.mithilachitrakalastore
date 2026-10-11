import React from 'react';
import { ClipboardList } from 'lucide-react';
import { dateTime, PageHeading, SectionCard } from './shared';

export const AuditLogsPage = ({ audit = [] }) => (
    <div>
        <PageHeading title="Audit Logs" description="Recent AI report and settings activity. Sensitive customer data is not included." />
        <SectionCard>
            {audit.length === 0 ? <p className="py-12 text-center text-xs text-slate-500"><ClipboardList size={20} className="mx-auto mb-2" />No activity has been recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-[10px]"><thead className="border-b border-stone-100 text-[9px] uppercase text-slate-500"><tr><th className="py-3 pr-3">Task</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Tokens</th><th className="px-3 py-3">Summary</th><th className="py-3 pl-3 text-right">When</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id} className="border-b border-stone-50 last:border-0"><td className="py-3 pr-3 font-semibold capitalize">{entry.task_type.replaceAll('_', ' ')}</td><td className={`px-3 py-3 font-bold ${entry.status === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{entry.status}</td><td className="px-3 py-3">{Number(entry.input_tokens || 0) + Number(entry.output_tokens || 0)}</td><td className="max-w-xs px-3 py-3 text-slate-500">{entry.result_summary || entry.error_message || '—'}</td><td className="py-3 pl-3 text-right text-slate-500">{dateTime(entry.created_at)}</td></tr>)}</tbody></table></div>}
        </SectionCard>
    </div>
);
