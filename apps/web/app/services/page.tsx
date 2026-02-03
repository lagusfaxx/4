"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "../../components/Avatar";
import dynamic from "next/dynamic";
import { apiFetch, resolveMediaUrl } from "../../lib/api";

type ServiceProfile = {
  id: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  serviceCategory: string | null;
  serviceDescription: string | null;
  profileType: string;
  distance: number | null;
};

type ServiceResponse = { profiles: ServiceProfile[] };
type MapResponse = { profiles: ServiceProfile[] };

const ServicesMap = dynamic(() => import("../../components/ServicesMap"), { ssr: false });

const typeFilters = [
  { label: "Profesionales", value: "PROFESSIONAL" },
  { label: "Tiendas/Moteles/Sexshop", value: "SHOP" }
];

export default function ServicesPage() {
  const [profiles, setProfiles] = useState<ServiceProfile[]>([]);
  const [mapProfiles, setMapProfiles] = useState<ServiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>(typeFilters[0].value);
  const [center, setCenter] = useState<[number, number]>([-33.4489, -70.6693]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (activeType) params.set("types", activeType);
    if (userLocation) {
      params.set("lat", String(userLocation[0]));
      params.set("lng", String(userLocation[1]));
    }
    return params.toString();
  }, [search, activeType, userLocation]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(coords);
          setUserLocation(coords);
        },
        () => null
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch<ServiceResponse>(`/services?${queryString}`),
      apiFetch<MapResponse>(`/map?${queryString}`)
    ])
      .then(([list, map]) => {
        setProfiles(list.profiles);
        setMapProfiles(map.profiles);
      })
      .catch((e: any) => setError(e?.message || "Error"))
      .finally(() => setLoading(false));
  }, [queryString]);

  if (loading) return <div className="text-white/70">Cargando servicios...</div>;
  return (
    <div className="grid gap-6">
      {error ? (
        <div className="card p-4 text-sm text-red-200 border-red-500/30 bg-red-500/10">
          {error}
        </div>
      ) : null}
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Servicios</h1>
        <p className="mt-2 text-sm text-white/70">
          Encuentra profesionales, tiendas, moteles y sexshops cerca de ti. Coordina por chat interno.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-xs text-white/60">Buscar</span>
            <input
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="@usuario, nombre, categoría, comuna"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {typeFilters.map((f) => {
              const active = activeType === f.value;
              return (
                <button
                  key={f.value}
                  className={active ? "btn-primary" : "btn-secondary"}
                  onClick={() => setActiveType(f.value)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Mapa</h2>
        <p className="mt-2 text-sm text-white/60">
          Visualiza profesionales y negocios activos. Toca un pin para abrir el perfil o iniciar chat.
        </p>
        <div className="mt-4">
          <ServicesMap profiles={mapProfiles} center={center} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                {p.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(p.avatarUrl) || ""}
                    alt={p.username}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div>
                <div className="font-semibold">{p.displayName || p.username}</div>
                <div className="text-xs text-white/50">@{p.username}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              {p.profileType === "SHOP" ? "Negocio" : "Profesional"} • {p.serviceCategory || "Servicios"} • {p.distance ? `${p.distance.toFixed(1)} km` : "Distancia N/D"}
            </div>
            <p className="mt-3 text-sm text-white/70">{p.serviceDescription || p.bio || "Perfil activo con atención personalizada."}</p>
            <div className="mt-4 flex gap-2">
              <Link className="btn-secondary" href={`/perfil/${p.username}`}>
                Ver perfil
              </Link>
              <Link className="btn-primary" href={`/chats/${p.id}`}>
                Abrir chat
              </Link>
            </div>
          </div>
        ))}
        {!profiles.length ? (
          <div className="card p-8 text-center text-white/70">
            <p className="text-lg font-semibold">No hay perfiles activos</p>
            <p className="mt-2 text-sm text-white/50">
              Ajusta los filtros o vuelve más tarde para ver nuevos servicios.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
