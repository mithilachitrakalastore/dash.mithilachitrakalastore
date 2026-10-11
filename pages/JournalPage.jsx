import React, { useState } from 'react';
import { BookOpen, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeading, SectionCard } from './shared';

const emptyPost = () => ({ id: null, slug: '', title: '', excerpt: '', body: '', image: '', published: true });
const fieldClass = 'w-full rounded-md border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none focus:border-[#c45a2e]';
const labelClass = 'block text-[9px] font-bold uppercase tracking-wider text-slate-500';

export const JournalPage = ({ posts = [], onAction, loading }) => {
    const [draft, setDraft] = useState(emptyPost);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const reset = () => {
        setDraft(emptyPost());
        setError('');
    };

    const edit = (post) => {
        setDraft({
            id: post.id,
            slug: post.slug || '',
            title: post.title || '',
            excerpt: post.excerpt || '',
            body: post.body || '',
            image: post.image || '',
            published: post.published !== false,
        });
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const save = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await onAction('save-journal-post', {
                post: {
                    ...draft,
                    slug: draft.slug || draft.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                },
            });
            reset();
        } catch (saveError) {
            setError(saveError.message || 'Unable to save this journal post.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (post) => {
        if (!window.confirm(`Delete “${post.title}”?`)) return;
        setBusy(true);
        setError('');
        try {
            await onAction('delete-journal-post', { postId: post.id });
            if (draft.id === post.id) reset();
        } catch (deleteError) {
            setError(deleteError.message || 'Unable to delete this journal post.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <PageHeading title="Cultural Journal" description="Create, edit, publish, or remove the stories shown in the store journal." action={<button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#903f23]"><Plus size={12} />New post</button>} />
            {error && <div role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-800">{error}</div>}

            <SectionCard className="mb-3">
                <div className="mb-3 flex items-center gap-2 border-b border-stone-100 pb-3"><BookOpen size={15} className="text-[#c45a2e]" /><h2 className="text-[12px] font-extrabold text-slate-800">{draft.id ? 'Edit journal post' : 'New journal post'}</h2></div>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Title
                        <input required maxLength={200} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Article title" className={fieldClass} />
                    </label>
                    <label className={labelClass}>Slug (optional)
                        <input maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="generated-from-title" className={fieldClass} />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Image URL (optional)
                        <input maxLength={4000} value={draft.image} onChange={(event) => setDraft((current) => ({ ...current, image: event.target.value }))} placeholder="https://…" className={fieldClass} />
                    </label>
                    {draft.image && <div className="sm:col-span-2"><img src={draft.image} alt="Journal post preview" className="h-36 w-full rounded-md border border-stone-200 bg-stone-50 object-cover" /></div>}
                    <label className={`${labelClass} sm:col-span-2`}>Short excerpt
                        <textarea maxLength={5000} rows={3} value={draft.excerpt} onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))} className={fieldClass} />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Article body
                        <textarea required maxLength={100000} rows={9} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Write the journal story…" className={`${fieldClass} font-mono`} />
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} className="accent-[#a94e2b]" />Publish this post</label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                        <button type="button" onClick={reset} className="rounded-md border border-stone-200 px-3 py-2 text-[10px] font-semibold text-slate-600">Clear</button>
                        <button type="submit" disabled={busy || !draft.title.trim() || !draft.body.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[#a94e2b] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Save size={12} />{busy ? 'Saving…' : draft.id ? 'Update post' : 'Save post'}</button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard>
                <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-[12px] font-extrabold text-slate-800">Journal posts</h2><span className="text-[9px] text-slate-500">{loading ? 'Refreshing…' : `${posts.length} posts`}</span></div>
                {loading && posts.length === 0 ? <p className="py-8 text-center text-[10px] text-slate-500">Loading journal posts…</p>
                    : posts.length === 0 ? <p className="py-8 text-center text-[10px] text-slate-500">No journal posts yet.</p>
                        : <div className="divide-y divide-stone-100">
                            {posts.map((post) => (
                                <article key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-[10px] font-bold text-slate-800">{post.title}</h3><span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${post.published ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-slate-600'}`}>{post.published ? 'Published' : 'Draft'}</span></div>
                                        <p className="mt-1 truncate text-[9px] text-slate-500">/{post.slug}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={() => edit(post)} disabled={busy} className="inline-flex items-center gap-1 rounded border border-stone-200 px-2.5 py-2 text-[9px] font-semibold text-slate-600 hover:bg-stone-50 disabled:opacity-50"><Pencil size={11} />Edit</button>
                                        <button type="button" onClick={() => remove(post)} disabled={busy} className="inline-flex items-center gap-1 rounded border border-rose-200 px-2.5 py-2 text-[9px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={11} />Delete</button>
                                    </div>
                                </article>
                            ))}
                        </div>}
            </SectionCard>
        </div>
    );
};
