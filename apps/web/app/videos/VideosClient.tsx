"use client";

import Link from "next/link";
import Avatar from "../../components/Avatar";
import { useEffect, useRef, useState } from "react";
import { apiFetch, resolveMediaUrl } from "../../lib/api";
import CreatePostModal from "../../components/CreatePostModal";
import FloatingCreateButton from "../../components/FloatingCreateButton";

type VideoPost = {
  id: string;
  body: string;
  createdAt: string;
  preview: { id: string; type: "IMAGE" | "VIDEO"; url: string } | null;
  media: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
  author: {
    id: string;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
  };
  paywalled: boolean;
  isSubscribed: boolean;
};

type VideosResponse = { posts: VideoPost[]; nextPage: number | null };

export default function VideosClient() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [muted, setMuted] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load(page: number, mode: "reset" | "append") {
    if (mode === "append") setLoadingMore(true);
    if (mode === "reset") setLoading(true);
    try {
      const res = await apiFetch<VideosResponse>(`/videos?page=${page}&limit=8`);
      setVideos((prev) => (mode === "append" ? [...prev, ...res.posts] : res.posts));
      setNextPage(res.nextPage);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los reels");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load(1, "reset");
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!nextPage || loading || loadingMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextPage) {
        load(nextPage, "append");
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextPage, loading, loadingMore]);

  useEffect(() => {
    const videosEls = Array.from(document.querySelectorAll("video[data-autoplay='true']")) as HTMLVideoElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => null);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );
    videosEls.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [videos]);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
        <div className="mt-3 h-4 w-72 rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Reels</h1>
            <p className="mt-1 text-sm text-white/70">Scroll vertical con autoplay y paywall.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setMuted((m) => !m)}>
              {muted ? "🔇 Silencio" : "🔊 Sonido"}
            </button>
            <Link className="btn-secondary" href="/feed">
              Volver a Inicio
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card p-4 text-sm text-red-200 border-red-500/30 bg-red-500/10">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6">
        {videos.map((post) => {
          const video = post.media.find((m) => m.type === "VIDEO") || post.preview;
          const videoUrl = resolveMediaUrl(video?.url);
          const avatar = resolveMediaUrl(post.author.avatarUrl);

          return (
            <div key={post.id} className="card p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                    {avatar ? <img src={avatar} alt={post.author.username} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <div className="font-semibold">{post.author.displayName || post.author.username}</div>
                    <div className="text-xs text-white/50">@{post.author.username}</div>
                  </div>
                </div>
                <button className="btn-secondary" type="button">
                  Seguir
                </button>
              </div>
              {videoUrl ? (
                <div className="mt-4 relative h-[calc(100vh-320px)] min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <video
                    data-autoplay="true"
                    src={videoUrl}
                    className={`h-full w-full object-cover ${post.paywalled ? "blur-lg scale-105" : ""}`}
                    muted={muted}
                    playsInline
                    loop
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-sm">
                    <div className="font-semibold">@{post.author.username}</div>
                    <p className="text-white/80">{post.body}</p>
                  </div>
                  {post.paywalled ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center text-sm">
                      <div className="font-semibold">Video exclusivo</div>
                      <div className="text-xs text-white/70">Suscríbete para desbloquear</div>
                      <button className="btn-primary mt-3">Suscribirme</button>
                    </div>
                  ) : null}
                  <button
                    className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs"
                    onClick={() => setMuted((m) => !m)}
                  >
                    {muted ? "Sonido" : "Silenciar"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!videos.length ? (
        <div className="card p-8 text-center text-white/70">
          <p className="text-lg font-semibold">Sube tu primer video</p>
          <p className="mt-2 text-sm text-white/50">Comparte reels verticales y gana suscriptores.</p>
          <button className="btn-primary mt-4" onClick={() => setModalOpen(true)}>
            Crear reel
          </button>
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-10" />

      <FloatingCreateButton onClick={() => setModalOpen(true)} />
      <CreatePostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load(1, "reset")}
        defaultMode="VIDEO"
      />
    </div>
  );
}
