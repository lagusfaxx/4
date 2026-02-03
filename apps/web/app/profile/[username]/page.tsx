"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, API_URL } from "../../../lib/api";

type ProfilePost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isPublic: boolean;
  paywalled: boolean;
  preview: { id: string; type: "IMAGE" | "VIDEO"; url: string } | null;
  media: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
};

type ProfileData = {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  city: string | null;
  address: string | null;
  serviceCategory: string | null;
  serviceDescription: string | null;
  profileType: string;
  subscriptionPrice: number | null;
};

type ServiceItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  media?: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
};

type ProfileResponse = {
  profile: ProfileData;
  posts: ProfilePost[];
  isSubscribed: boolean;
  isOwner: boolean;
  subscriptionExpiresAt: string | null;
  serviceItems: ServiceItem[];
  gallery: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
};

const tabs = ["Publicaciones", "Fotos", "Videos", "Servicios"] as const;

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;
  const router = useRouter();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Publicaciones");
  const [selected, setSelected] = useState<ProfilePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    apiFetch<ProfileResponse>(`/profiles/${username}`)
      .then((r) => setData(r))
      .catch((e: any) => setError(e?.message || "No se pudo cargar el perfil"))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!data) return;
    const type = data.profile.profileType;
    if (type === "PROFESSIONAL" || type === "SHOP") {
      setTab("Servicios");
    } else {
      setTab("Publicaciones");
    }
  }, [data]);

  const filteredPosts = useMemo(() => {
    if (!data) return [];
    if (tab === "Fotos") {
      return data.posts.filter((p) => p.preview?.type === "IMAGE");
    }
    if (tab === "Videos") {
      return data.posts.filter((p) => p.preview?.type === "VIDEO");
    }
    return data.posts;
  }, [data, tab]);

  const filteredGallery = useMemo(() => {
    if (!data) return [];
    if (tab === "Fotos") return data.gallery.filter((m) => m.type === "IMAGE");
    if (tab === "Videos") return data.gallery.filter((m) => m.type === "VIDEO");
    return data.gallery;
  }, [data, tab]);

  const showServices = data?.profile.profileType === "PROFESSIONAL" || data?.profile.profileType === "SHOP";

  const handleSubscribe = async () => {
    if (!data) return;
    try {
      const res = await apiFetch<{ paymentUrl: string }>("/billing/creator-subscriptions/start", {
        method: "POST",
        body: JSON.stringify({ profileId: data.profile.id })
      });
      window.location.href = res.paymentUrl;
    } catch (e: any) {
      setError(e?.message || "No se pudo suscribir");
    }
  };

  const handleServiceChat = async (item: ServiceItem) => {
    if (!data) return;
    const price = item.price ? `$${item.price.toLocaleString("es-CL")}` : "precio a convenir";
    const body = `Hola, quiero ${item.title} por ${price}.`;
    try {
      await apiFetch(`/messages/${data.profile.id}`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      router.push(`/chats/${data.profile.id}`);
    } catch (e: any) {
      setError(e?.message || "No se pudo abrir el chat");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="card h-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-sm text-red-200 border-red-500/30 bg-red-500/10">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const { profile } = data;
  const coverUrl = profile.coverUrl ? (profile.coverUrl.startsWith("http") ? profile.coverUrl : `${API_URL}${profile.coverUrl}`) : null;
  const avatarUrl = profile.avatarUrl ? (profile.avatarUrl.startsWith("http") ? profile.avatarUrl : `${API_URL}${profile.avatarUrl}`) : null;
  const subscriptionPrice = profile.subscriptionPrice || 2500;
  const isCreator = profile.profileType === "CREATOR";
  const isProfessional = profile.profileType === "PROFESSIONAL";
  const isShop = profile.profileType === "SHOP";
  const galleryMedia = filteredGallery;

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden">
        <div className="relative h-44 md:h-60 bg-gradient-to-r from-white/10 via-white/5 to-white/10">
          {coverUrl ? <img src={coverUrl} alt="Portada" className="absolute inset-0 h-full w-full object-cover" /> : null}
        </div>
        <div className="p-6 md:p-8">
          <div className="-mt-16 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 rounded-full border border-white/10 bg-white/10 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt={profile.username} className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{profile.displayName || profile.username}</h1>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
                    {profile.profileType === "CREATOR"
                      ? "CREADOR"
                      : profile.profileType === "PROFESSIONAL"
                        ? "PRO"
                        : profile.profileType === "SHOP"
                          ? "NEGOCIO"
                          : "USUARIO"}
                  </span>
                </div>
                <div className="text-sm text-white/60">@{profile.username}</div>
                {profile.city ? <div className="mt-1 text-xs text-white/50">{profile.city}</div> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.isOwner ? (
                <Link className="btn-secondary" href="/dashboard">
                  Editar perfil
                </Link>
              ) : null}
              {!data.isOwner && isCreator ? (
                data.isSubscribed ? (
                  <button className="btn-secondary" type="button">
                    Suscripción activa
                  </button>
                ) : (
                  <button className="btn-primary" onClick={handleSubscribe}>
                    Suscribirme ${subscriptionPrice.toLocaleString("es-CL")}/mes
                  </button>
                )
              ) : null}
              {!data.isOwner && (isProfessional || isShop) ? (
                <>
                  <button className="btn-secondary" onClick={() => setTab("Servicios")}>
                    Ver servicios
                  </button>
                  <Link className="btn-primary" href={`/chats/${profile.id}`}>
                    Abrir chat
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-sm text-white/70">{profile.bio || "Perfil premium con contenido verificado y actualizaciones semanales."}</p>
              {profile.serviceDescription ? (
                <p className="mt-2 text-sm text-white/60">{profile.serviceDescription}</p>
              ) : null}
              {profile.serviceCategory ? (
                <p className="mt-2 text-xs text-white/50">{profile.serviceCategory}</p>
              ) : null}
              {isShop && profile.address ? <p className="mt-1 text-xs text-white/40">{profile.address}</p> : null}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">
                {isCreator ? "Suscripción mensual" : isProfessional ? "Coordinación" : "Servicios"}
              </div>
              <div className="mt-2 text-xl font-semibold">
                {isCreator
                  ? `$${subscriptionPrice.toLocaleString("es-CL")}/mes`
                  : isProfessional
                    ? "Agenda directa por chat"
                    : "Servicios y anuncios"}
              </div>
              {isCreator ? (
                <p className="mt-1 text-xs text-white/50">
                  {data.isSubscribed ? "Suscripción activa" : "Suscríbete para desbloquear contenido premium."}
                </p>
              ) : (
                <p className="mt-1 text-xs text-white/50">
                  {isProfessional ? "Coordina directamente con este perfil." : "Explora sus servicios y coordina por chat."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            if (t === "Servicios" && !showServices) return null;
            return (
              <button key={t} className={t === tab ? "btn-primary" : "btn-secondary"} onClick={() => setTab(t)}>
                {t}
              </button>
            );
          })}
        </div>

        {tab === "Servicios" && showServices ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.serviceItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      {item.category ? <div className="text-xs text-white/50">{item.category}</div> : null}
                    </div>
                    {item.price ? (
                      <span className="text-xs text-white/70">${item.price.toLocaleString("es-CL")}</span>
                    ) : null}
                  </div>
                  {item.description ? <p className="mt-2 text-sm text-white/70">{item.description}</p> : null}
                  {item.media?.length ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {item.media.slice(0, 3).map((media) =>
                        media.type === "IMAGE" ? (
                          <img
                            key={media.id}
                            src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                            alt={item.title}
                            className="h-20 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <video
                            key={media.id}
                            src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                            className="h-20 w-full rounded-lg object-cover"
                            muted
                          />
                        )
                      )}
                    </div>
                  ) : null}
                  {!data.isOwner ? (
                    <div className="mt-3">
                      <button className="btn-primary" onClick={() => handleServiceChat(item)} type="button">
                        Comprar/Coordinar
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            {!data.serviceItems.length ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                Este negocio aún no publica servicios. Vuelve pronto para ver el catálogo actualizado.
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {(tab === "Fotos" || tab === "Videos" ? galleryMedia : filteredPosts).map((entry) => {
                if ("preview" in entry) {
                  const preview = entry.preview
                    ? entry.preview.url.startsWith("http")
                      ? entry.preview.url
                      : `${API_URL}${entry.preview.url}`
                    : null;
                  return (
                    <button
                      key={entry.id}
                      className="relative aspect-square rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                      onClick={() => setSelected(entry)}
                    >
                      {preview ? (
                        entry.preview?.type === "IMAGE" ? (
                          <img src={preview} alt={entry.title} className={`h-full w-full object-cover ${entry.paywalled ? "blur-md" : ""}`} />
                        ) : (
                          <video
                            src={preview}
                            className={`h-full w-full object-cover ${entry.paywalled ? "blur-md" : ""}`}
                            muted
                            autoPlay
                            loop
                            playsInline
                          />
                        )
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-white/10 to-white/5" />
                      )}
                      {entry.paywalled ? (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                          Solo miembros
                        </span>
                      ) : null}
                    </button>
                  );
                }

                const mediaUrl = entry.url.startsWith("http") ? entry.url : `${API_URL}${entry.url}`;
                return entry.type === "IMAGE" ? (
                  <img
                    key={entry.id}
                    src={mediaUrl}
                    alt="Galería"
                    className="aspect-square rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <video
                    key={entry.id}
                    src={mediaUrl}
                    className="aspect-square rounded-xl border border-white/10 object-cover"
                    controls
                  />
                );
              })}
            </div>
            {tab === "Publicaciones" && !filteredPosts.length ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                Sin publicaciones disponibles por ahora.
              </div>
            ) : null}
            {(tab === "Fotos" || tab === "Videos") && !galleryMedia.length ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                Aún no hay contenido en la galería.
              </div>
            ) : null}
          </>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setSelected(null)}>
          <div
            className="max-w-3xl w-full rounded-2xl border border-white/10 bg-uzeed-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{selected.title}</h3>
                <p className="text-xs text-white/50">{new Date(selected.createdAt).toLocaleString("es-CL")}</p>
              </div>
              <button className="text-white/60" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
            <p className={`mt-4 ${selected.paywalled ? "text-white/60 blur-sm select-none" : "text-white/80"}`}>
              {selected.body}
            </p>
            <div className="mt-4 grid gap-3">
              {(selected.paywalled ? [selected.preview].filter(Boolean) : selected.media).map((media) =>
                media ? (
                  media.type === "IMAGE" ? (
                    <img
                      key={media.id}
                      src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                      alt="media"
                      className={`w-full rounded-xl border border-white/10 ${selected.paywalled ? "blur-md" : ""}`}
                    />
                  ) : (
                    <video
                      key={media.id}
                      src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                      controls={!selected.paywalled}
                      className={`w-full rounded-xl border border-white/10 ${selected.paywalled ? "blur-md" : ""}`}
                    />
                  )
                ) : null
              )}
            </div>
            {selected.paywalled ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-sm text-white/70">Suscríbete para desbloquear el contenido completo.</div>
                <button className="btn-primary" onClick={handleSubscribe}>
                  Suscribirme
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
