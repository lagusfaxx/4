"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_URL } from "../../lib/api";

type MeResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    username: string;
    role: "USER" | "ADMIN";
    membershipExpiresAt: string | null;
    profileType: "VIEWER" | "CREATOR" | "PROFESSIONAL" | "SHOP";
    gender: string | null;
    preferenceGender: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    bio?: string | null;
    subscriptionPrice?: number | null;
    serviceCategory?: string | null;
    serviceDescription?: string | null;
    city?: string | null;
    address?: string | null;
    phone?: string | null;
    allowFreeMessages?: boolean | null;
  } | null;
};

type DashboardResponse = {
  active: boolean;
  membershipExpiresAt: string | null;
  shopTrialEndsAt: string | null;
  profileType?: string;
  subscriptionPrice?: number | null;
  coverUrl?: string | null;
  bio?: string | null;
};

type SubscriptionResponse = {
  subscription: { subscriptionId: string; status: string; redirectUrl?: string | null } | null;
};

type ServiceItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  media?: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
};

type NotificationItem = {
  id: string;
  type: string;
  data: any;
  readAt: string | null;
  createdAt: string;
};

type StatsResponse = {
  posts: number;
  messagesReceived: number;
  subscribers: number;
  services: number;
};

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse["subscription"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceCategoryName, setServiceCategoryName] = useState("");
  const [servicePrice, setServicePrice] = useState<number | "">("");
  const [serviceBody, setServiceBody] = useState("");
  const [serviceMediaFiles, setServiceMediaFiles] = useState<Record<string, FileList | null>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");

  const exp = useMemo(() => {
    if (!dashboard?.membershipExpiresAt) return null;
    const d = new Date(dashboard.membershipExpiresAt);
    return isNaN(d.getTime()) ? null : d;
  }, [dashboard]);
  const active = dashboard?.active ?? false;

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [preferenceGender, setPreferenceGender] = useState("ALL");
  const [gender, setGender] = useState("FEMALE");
  const [subscriptionPrice, setSubscriptionPrice] = useState(2500);
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [allowFreeMessages, setAllowFreeMessages] = useState(false);

  const handleImageSelection = (file: File | null, setter: (file: File | null) => void) => {
    if (!file) {
      setter(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes para este campo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen supera el tamaño máximo de 10MB.");
      return;
    }
    setter(file);
  };

  const addServiceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ item: ServiceItem }>("/services/items", {
        method: "POST",
        body: JSON.stringify({
          title: serviceTitle,
          description: serviceBody,
          category: serviceCategoryName,
          price: servicePrice === "" ? null : servicePrice
        })
      });
      setServiceItems((prev) => [res.item, ...prev]);
      setServiceTitle("");
      setServiceBody("");
      setServiceCategoryName("");
      setServicePrice("");
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el servicio");
    }
  };

  const deleteServiceItem = async (id: string) => {
    try {
      await apiFetch(`/services/items/${id}`, { method: "DELETE" });
      setServiceItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar el servicio");
    }
  };

  useEffect(() => {
    Promise.all([
      apiFetch<MeResponse>("/auth/me"),
      apiFetch<DashboardResponse>("/dashboard"),
      apiFetch<SubscriptionResponse>("/payments/subscription")
    ])
      .then(([m, d, s]) => {
        if (!m.user) {
          window.location.href = "/login";
          return;
        }
        setMe(m.user);
        setDashboard(d);
        setSubscription(s.subscription);
        setDisplayName(m.user.displayName || "");
        setUsername(m.user.username || "");
        setBio(m.user.bio || "");
        setPhone(m.user.phone || "");
        setAddress(m.user.address || "");
        setCity(m.user.city || "");
        setPreferenceGender(m.user.preferenceGender || "ALL");
        setGender(m.user.gender || "FEMALE");
        setSubscriptionPrice(m.user.subscriptionPrice || d.subscriptionPrice || 2500);
        setServiceCategory(m.user.serviceCategory || "");
        setServiceDescription(m.user.serviceDescription || "");
        setAllowFreeMessages(Boolean(m.user.allowFreeMessages));
      })
      .catch((e: any) => setError(e?.message || "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    apiFetch<{ items: ServiceItem[] }>(`/services/${me.id}/items`)
      .then((r) => setServiceItems(r.items))
      .catch(() => null);
  }, [me?.id]);

  useEffect(() => {
    apiFetch<{ notifications: NotificationItem[] }>("/notifications")
      .then((r) => setNotifications(r.notifications))
      .catch(() => null);
  }, []);

  useEffect(() => {
    apiFetch<StatsResponse>("/stats/me")
      .then((r) => setStats(r))
      .catch(() => null);
  }, []);

  async function startSubscription() {
    setError(null);
    try {
      const r = await apiFetch<{ paymentUrl: string }>("/billing/shop-plans/start", { method: "POST" });
      window.location.href = r.paymentUrl;
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar la suscripción");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName,
          username,
          bio,
          phone,
          address,
          city,
          gender,
          preferenceGender,
          subscriptionPrice,
          serviceCategory,
          serviceDescription,
          allowFreeMessages: allowFreeMessages ? "true" : "false"
        })
      });
      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        const res = await fetch(`${API_URL}/profile/avatar`, { method: "POST", credentials: "include", body: form });
        if (!res.ok) throw new Error("UPLOAD_FAILED");
      }
      if (coverFile) {
        const form = new FormData();
        form.append("file", coverFile);
        const res = await fetch(`${API_URL}/profile/cover`, { method: "POST", credentials: "include", body: form });
        if (!res.ok) throw new Error("UPLOAD_FAILED");
      }
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  const markNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    } catch {
      null;
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e: any) {
      setError(e?.message || "No se pudo cerrar sesión");
    }
  };

  const handleServiceMediaSelection = (id: string, files: FileList | null) => {
    setServiceMediaFiles((prev) => ({ ...prev, [id]: files }));
  };

  const uploadServiceMedia = async (itemId: string) => {
    const files = serviceMediaFiles[itemId];
    if (!files || !files.length) return;
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const res = await fetch(`${API_URL}/services/items/${itemId}/media`, { method: "POST", credentials: "include", body: form });
      if (!res.ok) throw new Error("UPLOAD_FAILED");
      const data = await res.json();
      setServiceItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, media: [...(item.media || []), ...data.media] } : item))
      );
      setServiceMediaFiles((prev) => ({ ...prev, [itemId]: null }));
    } catch (e: any) {
      setError(e?.message || "No se pudo subir media del servicio");
    }
  };

  const deleteServiceMedia = async (itemId: string, mediaId: string) => {
    try {
      await apiFetch(`/services/items/${itemId}/media/${mediaId}`, { method: "DELETE" });
      setServiceItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, media: (item.media || []).filter((m) => m.id !== mediaId) } : item
        )
      );
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar media del servicio");
    }
  };

  if (loading) return <div className="text-white/70">Cargando...</div>;
  if (error) return <div className="text-red-200">{error}</div>;
  if (!me || !dashboard) return null;

  const isCreator = me.profileType === "CREATOR";
  const isProfessional = me.profileType === "PROFESSIONAL";
  const canPost = isCreator || isProfessional;
  const isShop = me.profileType === "SHOP";
  const coverUrl = me.coverUrl || dashboard.coverUrl;
  const avatarUrl = me.avatarUrl;

  return (
    <div className="grid gap-6">
      <div className="card overflow-hidden">
        <div className="h-40 md:h-56 bg-gradient-to-r from-white/10 via-white/5 to-white/10 relative">
          {coverUrl ? (
            <img
              src={coverUrl.startsWith("http") ? coverUrl : `${API_URL}${coverUrl}`}
              alt="Portada"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border border-white/10 bg-white/10 overflow-hidden -mt-16">
                {avatarUrl ? (
                  <img
                    src={avatarUrl.startsWith("http") ? avatarUrl : `${API_URL}${avatarUrl}`}
                    alt={me.username}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Mi cuenta</h1>
                <p className="mt-1 text-sm text-white/70">Hola, {me.displayName || me.username}.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link className="btn-secondary" href="/feed">
                Inicio
              </Link>
              {canPost ? (
                <Link className="btn-secondary" href="/studio">
                  Gestionar publicaciones
                </Link>
              ) : null}
            </div>
          </div>

        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="card p-4 h-fit md:sticky md:top-6">
          <div className="grid gap-2">
            {[
              { id: "perfil", label: "Perfil" },
              { id: "publicaciones", label: "Publicaciones" },
              ...(isCreator || isShop ? [{ id: "planes", label: "Suscripciones/Planes" }] : []),
              ...(me.profileType === "PROFESSIONAL" || me.profileType === "SHOP"
                ? [{ id: "servicios", label: "Servicios" }]
                : []),
              { id: "estadisticas", label: "Estadísticas" },
              { id: "notificaciones", label: "Notificaciones" },
              { id: "seguridad", label: "Seguridad" }
            ].map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "btn-primary w-full justify-start" : "btn-secondary w-full justify-start"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          {activeTab === "perfil" ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Perfil público</h2>
              <form onSubmit={saveProfile} className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Nombre público</label>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Username</label>
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm text-white/70">Bio</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe tu estilo, servicios y lo que ofreces."
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Teléfono</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Ciudad/Comuna</label>
                  <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm text-white/70">Dirección</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                {isCreator ? (
                  <div className="grid gap-2">
                    <label className="text-sm text-white/70">Precio mensual</label>
                    <input
                      className="input"
                      type="number"
                      min={100}
                      max={20000}
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                    />
                    <p className="text-xs text-white/50">Entre $100 y $20.000 CLP.</p>
                  </div>
                ) : null}
                {isCreator ? (
                  <div className="grid gap-2">
                    <label className="text-sm text-white/70">Mensajes gratis</label>
                    <label className="flex items-center gap-2 text-sm text-white/70">
                      <input
                        type="checkbox"
                        checked={allowFreeMessages}
                        onChange={(e) => setAllowFreeMessages(e.target.checked)}
                      />
                      Permitir mensajes sin suscripción
                    </label>
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Género</label>
                  <select className="input select-dark" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="FEMALE">Mujer</option>
                    <option value="MALE">Hombre</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Preferencia de género</label>
                  <select className="input select-dark" value={preferenceGender} onChange={(e) => setPreferenceGender(e.target.value)}>
                    <option value="ALL">Todos</option>
                    <option value="FEMALE">Mujer</option>
                    <option value="MALE">Hombre</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                {me.profileType === "PROFESSIONAL" || me.profileType === "SHOP" ? (
                  <>
                    <div className="grid gap-2">
                      <label className="text-sm text-white/70">Categoría</label>
                      <input
                        className="input"
                        value={serviceCategory}
                        onChange={(e) => setServiceCategory(e.target.value)}
                        placeholder="Masajes, entretenimiento, sexshop..."
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm text-white/70">Descripción de servicios</label>
                      <textarea
                        className="input min-h-[120px]"
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Foto de perfil (solo imagen)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input"
                    onChange={(e) => handleImageSelection(e.target.files?.[0] || null, setAvatarFile)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Portada (solo imagen)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="file-input"
                    onChange={(e) => handleImageSelection(e.target.files?.[0] || null, setCoverFile)}
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <button className="btn-primary" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar perfil"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {activeTab === "publicaciones" ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Publicaciones</h2>
              <p className="mt-2 text-sm text-white/60">
                Publica fotos y reels para Inicio y la sección de Reels.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn-primary" href="/studio">
                  Crear publicación
                </Link>
                <Link className="btn-secondary" href="/videos">
                  Ver reels
                </Link>
              </div>
            </div>
          ) : null}

          {activeTab === "planes" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {isShop ? (
                <div className="card p-6">
                  <div className="text-sm text-white/60">Plan negocio</div>
                  <div className="mt-2 text-xl font-semibold">{active ? "Activo" : "Inactivo"}</div>
                  <div className="mt-1 text-sm text-white/70">
                    {exp ? `Renueva: ${exp.toLocaleString("es-CL")}` : "Plan mensual $20.000 CLP"}
                  </div>
                  {dashboard.shopTrialEndsAt ? (
                    <p className="mt-2 text-xs text-amber-200">
                      Prueba gratis hasta {new Date(dashboard.shopTrialEndsAt).toLocaleDateString("es-CL")}.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <button className="btn-primary" onClick={startSubscription}>
                      {subscription ? "Renovar plan" : "Activar plan $20.000/mes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-6">
                  <div className="text-sm text-white/60">Suscripciones</div>
                  <div className="mt-2 text-xl font-semibold">
                    {isCreator ? `$${subscriptionPrice.toLocaleString("es-CL")}/mes` : "Sin suscripciones"}
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    {isCreator
                      ? "Este es el precio mensual que verán tus seguidores."
                      : "Suscríbete a creadoras desde el feed."}
                  </div>
                </div>
              )}

              <div className="card p-6">
                <div className="text-sm text-white/60">Pagos</div>
                <div className="mt-3 flex gap-3 flex-wrap">
                  {isShop ? (
                    <button className="btn-secondary" onClick={startSubscription}>
                      {subscription ? "Renovar plan" : "Activar plan"}
                    </button>
                  ) : (
                    <span className="text-xs text-white/60">Gestiona tu suscripción desde esta sección.</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-white/50">
                  Revisaremos tus movimientos y el estado de tu plan desde aquí.
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "servicios" && (me.profileType === "PROFESSIONAL" || me.profileType === "SHOP") ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Catálogo y servicios</h2>
              <form onSubmit={addServiceItem} className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Nombre del servicio</label>
                  <input
                    className="input"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="Ej: Suite deluxe, masaje premium"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Categoría</label>
                  <input
                    className="input"
                    value={serviceCategoryName}
                    onChange={(e) => setServiceCategoryName(e.target.value)}
                    placeholder="Motel, sexshop, spa..."
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Precio (CLP)</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="20000"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm text-white/70">Descripción</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={serviceBody}
                    onChange={(e) => setServiceBody(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <button className="btn-primary" type="submit">
                    Agregar al catálogo
                  </button>
                </div>
              </form>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {serviceItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
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
                        {item.media.map((media) => (
                          <div key={media.id} className="relative">
                            {media.type === "IMAGE" ? (
                              <img
                                src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                                alt={item.title}
                                className="h-20 w-full rounded-lg object-cover"
                              />
                            ) : (
                              <video
                                src={media.url.startsWith("http") ? media.url : `${API_URL}${media.url}`}
                                className="h-20 w-full rounded-lg object-cover"
                                muted
                              />
                            )}
                            <button
                              className="absolute top-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px]"
                              onClick={() => deleteServiceMedia(item.id, media.id)}
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => handleServiceMediaSelection(item.id, e.target.files)}
                      />
                      <button className="btn-secondary" type="button" onClick={() => uploadServiceMedia(item.id)}>
                        Subir media
                      </button>
                    </div>
                    <div className="mt-3">
                      <button className="btn-secondary" type="button" onClick={() => deleteServiceItem(item.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {!serviceItems.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                    Agrega tu primer servicio para aparecer en el catálogo.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "estadisticas" ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Estadísticas</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-white/60">Publicaciones</div>
                  <div className="mt-2 text-xl font-semibold">{stats?.posts ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-white/60">Mensajes recibidos</div>
                  <div className="mt-2 text-xl font-semibold">{stats?.messagesReceived ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-white/60">Suscriptores activos</div>
                  <div className="mt-2 text-xl font-semibold">{stats?.subscribers ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-white/60">Servicios publicados</div>
                  <div className="mt-2 text-xl font-semibold">{stats?.services ?? 0}</div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "notificaciones" ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Notificaciones</h2>
              <div className="mt-4 grid gap-3">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {n.type === "MESSAGE_RECEIVED"
                            ? "Nuevo mensaje"
                            : n.type === "SUBSCRIPTION_STARTED"
                              ? "Nueva suscripción"
                              : n.type === "POST_PUBLISHED"
                                ? "Nuevo post publicado"
                                : "Evento"}
                        </div>
                        <div className="text-xs text-white/50">
                          {new Date(n.createdAt).toLocaleString("es-CL")}
                        </div>
                      </div>
                      {!n.readAt ? (
                        <button className="btn-secondary" onClick={() => markNotificationRead(n.id)}>
                          Marcar leído
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!notifications.length ? (
                  <div className="text-sm text-white/60">Aún no tienes notificaciones.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === "seguridad" ? (
            <div className="card p-6 md:p-8">
              <h2 className="text-lg font-semibold">Seguridad</h2>
              <p className="mt-2 text-sm text-white/60">Cierra tu sesión en otros dispositivos.</p>
              <div className="mt-4">
                <button className="btn-primary" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
