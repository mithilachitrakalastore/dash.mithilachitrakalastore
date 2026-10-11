import React from 'react';
import { ArrowLeft, CircleDashed } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

export const FeaturePlaceholderPage = ({ title, description, goTo }) => (
    <div>
        <PageHeading title={title} description={description} />
        <SectionCard className="mx-auto max-w-2xl py-12 text-center">
            <CircleDashed size={30} className="mx-auto text-[#c45a2e]" />
            <h2 className="mt-4 text-sm font-extrabold text-slate-800">This area is not connected yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-slate-500">This standalone dashboard currently connects to the store API for read-only product, inventory, order, analytics, and AI reporting. This section stays disabled until a supported API workflow is implemented.</p>
            <button type="button" onClick={() => goTo('dashboard')} className="mt-5 inline-flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-stone-50"><ArrowLeft size={13} />Back to dashboard</button>
        </SectionCard>
    </div>
);
