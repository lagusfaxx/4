"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Link from "next/link";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type MapProfile = {
  id: string;
  displayName: string | null;
  username: string;
  profileType: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  serviceCategory: string | null;
  distance: number | null;
};

export default function ServicesMap({
  profiles,
  center
}: {
  profiles: MapProfile[];
  center: [number, number];
}) {
  const markers = profiles.filter((p) => p.latitude !== null && p.longitude !== null);

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-white/10">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((p) => (
          <Marker key={p.id} position={[p.latitude!, p.longitude!]} icon={markerIcon}>
            <Popup>
              <div className="grid gap-1 text-sm">
                <strong>{p.displayName || p.username}</strong>
                <span className="text-xs text-gray-600">
                  {p.profileType === "SHOP" ? "Negocio" : "Profesional"} • {p.serviceCategory || "Servicios"}
                </span>
                {p.distance ? <span className="text-xs text-gray-600">Aprox {p.distance.toFixed(1)} km</span> : null}
                <div className="mt-2 flex gap-2">
                  <Link className="text-blue-600" href={`/profile/${p.username}`}>
                    Ver perfil
                  </Link>
                  <Link className="text-blue-600" href={`/chat/${p.id}`}>
                    Abrir chat
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
