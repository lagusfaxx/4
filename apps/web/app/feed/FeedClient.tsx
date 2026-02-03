'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '../../components/Avatar';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import useMe from '../../hooks/useMe';

type AnyPost = any;

function fmtCount(n: any) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
  return `${num}`;
}

export default function FeedClient() {
  const router = useRouter();
  const { me, loading } = useMe();
  const [tab, setTab] = useState<'forYou' | 'following'>('forYou');
  const [posts, setPosts] = useState<AnyPost[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = !!me;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPending(true);
        setError(null);
        // Tipar la respuesta para evitar que TS infiera {} y falle en build cuando accedemos a data.items
        const data = await apiFetch<any>('/feed');
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        if (!mounted) return;
        setPosts(items);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'No se pudo cargar el feed');
      } finally {
        if (mounted) setPending(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const visiblePosts = useMemo(() => {
    // Future: filter based on tab.
    return posts;
  }, [posts]);

  const trends = [
    { tag: '#DiseñoWeb', posts: '12.5k publicaciones' },
    { tag: '#Fotografia', posts: '9.3k publicaciones' },
    { tag: '#Tecnologia', posts: '18.7k publicaciones' }
  ];

  const suggestions = [
    { name: 'Veronica Palacios', handle: '@veropalacios', subtitle: 'Especialista en marketing' },
    { name: 'Camila Vargas', handle: '@camilavargas', subtitle: 'Fotógrafa' }
  ];

  const onRequireAuth = (nextPath: string) => {
    const next = encodeURIComponent(nextPath);
    router.push(`/login?next=${next}`);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Center */}
        <section className="min-w-0">
          <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/10 bg-black/20 px-4 pt-3 backdrop-blur-xl lg:-mx-0 lg:rounded-3xl lg:border lg:bg-white/5 lg:shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            {/* Top brand bar (shows on mobile too) */}
            <div className="flex items-center justify-between pb-2">
              <div className="w-10" />
              <Link href="/inicio" className="flex items-center justify-center">
                <img
                  src="/brand/logo.png"
                  alt="UZEED"
                  className="h-9 w-auto opacity-95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:h-7"
                />
              </Link>
              <div className="w-10" />
            </div>

            <div className="flex items-end justify-center gap-8 pb-3 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setTab('forYou')}
                className={`relative px-2 py-1 transition ${tab === 'forYou' ? 'text-white' : 'text-white/70 hover:text-white'}`}
              >
                Para ti
                {tab === 'forYou' && (
                  <span className="absolute -bottom-3 left-1/2 h-[2px] w-14 -translate-x-1/2 rounded-full bg-white" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab('following')}
                className={`relative px-2 py-1 transition ${tab === 'following' ? 'text-white' : 'text-white/70 hover:text-white'}`}
              >
                Siguiendo
                {tab === 'following' && (
                  <span className="absolute -bottom-3 left-1/2 h-[2px] w-20 -translate-x-1/2 rounded-full bg-white" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4 pb-16">
            {loading && (
              <div className="uzeed-glass rounded-3xl p-6">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="mt-4 h-3 w-72 rounded bg-white/10" />
                <div className="mt-6 h-64 w-full rounded-2xl bg-white/10" />
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="uzeed-glass rounded-3xl p-6 text-white/80">
                No hay publicaciones todavía.
              </div>
            )}

            {posts.map((post: AnyPost) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="uzeed-glass rounded-3xl p-5">
              <div className="mb-3 text-sm font-semibold">Tendencias</div>
              <div className="space-y-3">
                {trends.map((t) => (
                  <div key={t.tag} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="font-semibold">{t.tag}</div>
                    <div className="mt-1 text-xs text-white/70">{t.posts}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="uzeed-glass rounded-3xl p-5">
              <div className="mb-3 text-sm font-semibold">A quién seguir</div>
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div key={s.handle} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.name}</div>
                      <div className="truncate text-xs text-white/70">{s.handle} · {s.subtitle}</div>
                    </div>
                    <button className="uzeed-pill px-4 py-2 text-xs font-semibold">Seguir</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-1 text-xs text-white/50">
              Términos · Privacidad · Acerca de
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: AnyPost }) {
  const router = useRouter();

  const authorName = post?.author?.displayName || post?.author?.username || 'Usuario';
  const handle = post?.author?.username ? `@${post.author.username}` : '';
  const avatarUrl = post?.author?.avatarUrl || post?.author?.avatar || '';

  // Prefer full media, but if the API hid media due to paywall, show the preview thumbnail.
  const imageUrl = post?.media?.[0]?.url || post?.preview?.url || post?.imageUrl || '';
  const isPaywalled = Boolean(
    // API v2 may include explicit paywalled flag
    (post as any)?.paywalled || (post as any)?.isPaywalled
  );
  const isLocked = Boolean(isPaywalled && !(post?.media?.length > 0));
  const authorProfileHref = post?.author?.username ? `/perfil/${post.author.username}` : '/inicio';
  const likeCount = post?.likeCount ?? post?.likesCount ?? post?._count?.likes ?? post?._count?.Like ?? 0;
  const commentCount = post?.commentCount ?? post?.commentsCount ?? post?._count?.comments ?? post?._count?.Comment ?? 0;
  const shareCount = post?.shareCount ?? 0;

  return (
    <article className="uzeed-glass rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <button
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={() => post?.author?.username && router.push(`/perfil/${post.author.username}`)}
        >
          <Avatar src={avatarUrl} alt={post?.author?.username || authorName} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{authorName}</div>
            <div className="truncate text-xs text-white/70">{handle}</div>
          </div>
        </button>

        <button className="rounded-full px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white">···</button>
      </div>

      {post?.content && <div className="mt-3 text-sm text-white/90">{post.content}</div>}

      {imageUrl && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              // resolveMediaUrl puede devolver null; en ese caso no pasamos null a <img src>
              src={resolveMediaUrl(imageUrl) ?? undefined}
              alt="post"
              className={
                "block w-full max-h-[70vh] object-contain transition duration-300 " +
                (isLocked ? " blur-2xl scale-110 brightness-75" : "")
              }
              loading="lazy"
            />

            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="uzeed-glass rounded-2xl px-5 py-4 text-center backdrop-blur-md">
                  <div className="text-sm font-semibold">Contenido bloqueado</div>
                  <div className="mt-1 text-xs text-white/70">Suscríbete para verlo</div>
                  <Link
                    href={authorProfileHref}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-white/75">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/10">
            <span aria-hidden>❤</span>
            <span className="text-xs">{fmtCount(likeCount)}</span>
          </button>
          <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/10">
            <span aria-hidden>💬</span>
            <span className="text-xs">{fmtCount(commentCount)}</span>
          </button>
          <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/10">
            <span aria-hidden>↗</span>
            <span className="text-xs">{fmtCount(shareCount)}</span>
          </button>
        </div>

        <button className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/10">
          <span aria-hidden>🔖</span>
        </button>
      </div>
    </article>
  );
}
