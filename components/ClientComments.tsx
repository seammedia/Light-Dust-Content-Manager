import { MessageSquareText } from 'lucide-react';
import { Post } from '../types';

interface ClientCommentsProps {
  posts: Post[];
  onOpenCalendar: () => void;
  onUpdateComment: (postId: string, comment: string) => void;
}

export function ClientComments({ posts, onOpenCalendar, onUpdateComment }: ClientCommentsProps) {
  const sortedPosts = [...posts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Max comments</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Content feedback</h2>
        <p className="mt-2 max-w-2xl text-stone-500">Review and update feedback across your social calendar in one place.</p>
      </div>

      {sortedPosts.length ? (
        <div className="space-y-4">
          {sortedPosts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">{new Date(`${post.date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <h3 className="mt-1 font-semibold text-brand-dark">{post.title || 'Social media post'}</h3>
                </div>
                <span className="self-start rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{post.status}</span>
              </div>
              <label className="mt-5 block text-sm font-medium text-stone-700">
                Comment or change request
                <textarea
                  key={`${post.id}-${post.notes || ''}`}
                  defaultValue={post.notes || ''}
                  onBlur={(event) => {
                    if (event.target.value !== (post.notes || '')) onUpdateComment(post.id, event.target.value);
                  }}
                  rows={4}
                  placeholder="Add feedback, questions or requested changes…"
                  className="mt-2 w-full resize-y rounded-xl border border-stone-300 px-3 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                />
              </label>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center shadow-sm">
          <MessageSquareText className="mx-auto h-8 w-8 text-stone-300" />
          <h3 className="mt-4 text-lg font-semibold text-brand-dark">No content to comment on yet</h3>
          <p className="mt-2 text-sm text-stone-500">Comments will appear here when content is added to your calendar.</p>
        </section>
      )}

      <button type="button" onClick={onOpenCalendar} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-brand-green hover:text-brand-green">Open full social calendar</button>
    </div>
  );
}
