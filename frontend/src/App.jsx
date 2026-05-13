import React, { useMemo, useState } from 'react';

const seedPosts = [
  {
    id: 1,
    author: 'aurelia',
    name: 'Aurelia Chen',
    handle: '@aurelia',
    time: '2h',
    content: 'Designing Chirp in black & white is oddly calming. Minimal UI, maximum focus.',
    comments: 12,
    shares: 7,
    likes: 94,
  },
  {
    id: 2,
    author: 'miles',
    name: 'Miles Rivera',
    handle: '@milescodes',
    time: '4h',
    content: 'Browsing as a guest should feel first-class. Login can wait — value comes first.',
    comments: 8,
    shares: 4,
    likes: 65,
  },
  {
    id: 3,
    author: 'sana',
    name: 'Sana Park',
    handle: '@sanapark',
    time: '6h',
    content: 'Tiny motion details in transitions make the product feel alive ✨',
    comments: 19,
    shares: 13,
    likes: 141,
  },
];

const BirdLogo = () => (
  <div className="h-10 w-10 rounded-full border border-white/40 bg-black grid place-items-center">
    <div className="relative h-4 w-5">
      <span className="absolute left-0 top-1 h-3 w-4 rounded-full border border-white" />
      <span className="absolute right-0 top-0 h-2 w-2 rotate-45 border-r border-t border-white" />
      <span className="absolute left-3 top-1 h-1 w-1 rounded-full bg-white" />
    </div>
  </div>
);

function App() {
  const [likes, setLikes] = useState(() => Object.fromEntries(seedPosts.map((p) => [p.id, p.likes])));
  const [page, setPage] = useState('home');

  const profileStats = useMemo(() => {
    const totalLikes = Object.values(likes).reduce((a, b) => a + b, 0);
    return { posts: seedPosts.length, followers: '12.4K', following: 236, totalLikes };
  }, [likes]);

  const toggleLike = (id) => setLikes((prev) => ({ ...prev, [id]: prev[id] + 1 }));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl border-x border-white/10 min-h-screen">
        <header className="sticky top-0 z-20 backdrop-blur bg-black/80 border-b border-white/10 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <BirdLogo />
            <div>
              <p className="font-semibold tracking-wide">Chirp</p>
              <p className="text-xs text-white/60">Speak in short bursts.</p>
            </div>
          </div>
          <button className="rounded-full border border-white/30 px-4 py-2 text-sm transition hover:bg-white hover:text-black">Browse as Guest</button>
        </header>

        <nav className="grid grid-cols-2 border-b border-white/10 text-sm">
          {['home', 'profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => setPage(tab)}
              className={`py-3 capitalize transition ${page === tab ? 'border-b-2 border-white font-semibold' : 'text-white/60 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <main className="p-4 sm:p-6">
          {page === 'home' ? (
            <section className="space-y-4 animate-[fadeIn_.35s_ease]">
              {seedPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.05] hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{post.name} <span className="text-white/50 font-normal">{post.handle} · {post.time}</span></p>
                      <p className="mt-2 text-white/90 leading-relaxed">{post.content}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 text-sm text-white/70">
                    <button className="transition hover:text-white">💬 {post.comments}</button>
                    <button className="transition hover:text-white">🔁 {post.shares}</button>
                    <button onClick={() => toggleLike(post.id)} className="transition hover:text-white">♥ {likes[post.id]}</button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="animate-[fadeIn_.35s_ease]">
              <div className="rounded-3xl border border-white/10 p-6 bg-white/[0.03]">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full border border-white/20 bg-gradient-to-b from-white/30 to-white/5" />
                  <div>
                    <h2 className="text-xl font-semibold">Chirp Guest</h2>
                    <p className="text-white/60">@guest · public profile preview</p>
                  </div>
                </div>
                <p className="mt-4 text-white/80">Welcome to Chirp. You can explore posts, profiles, and conversations before creating an account.</p>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-white/60">Posts</p><p className="font-semibold">{profileStats.posts}</p></div>
                  <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-white/60">Followers</p><p className="font-semibold">{profileStats.followers}</p></div>
                  <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-white/60">Following</p><p className="font-semibold">{profileStats.following}</p></div>
                  <div className="rounded-xl border border-white/10 p-3"><p className="text-xs text-white/60">Total Likes</p><p className="font-semibold">{profileStats.totalLikes}</p></div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <style>{`@keyframes fadeIn { from {opacity: 0; transform: translateY(8px);} to {opacity: 1; transform: translateY(0);} }`}</style>
    </div>
  );
}

export default App;
