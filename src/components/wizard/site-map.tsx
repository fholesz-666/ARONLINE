"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Circle, CircleMarker, LayersControl, MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

export interface MapBuilding {
  id: string;
  footprint: [number, number][]; // [lon, lat]
  label?: string;
  include?: boolean;
}

function ClickHandler({ onPick, disabled }: { onPick: (lon: number, lat: number) => void; disabled?: boolean }) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), zoom));
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const toLatLng = (f: [number, number][]) => f.map(([lon, lat]) => [lat, lon] as [number, number]);

export default function SiteMap({
  location,
  main,
  neighbours,
  radiusM,
  onPick,
  onPickBuilding,
  disabled,
}: {
  location: { lon: number; lat: number } | null;
  main: MapBuilding | null;
  neighbours: MapBuilding[];
  radiusM?: number | null;
  onPick: (lon: number, lat: number) => void;
  onPickBuilding?: (id: string, lon: number, lat: number) => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-[420px] border border-line bg-line-soft" />;
  const center: [number, number] = location ? [location.lat, location.lon] : [49.8, 15.5];
  return (
    <MapContainer center={center} zoom={location ? 18 : 7} maxZoom={21} className="h-[420px] w-full border border-line" scrollWheelZoom>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Ortofoto ČÚZK">
          <TileLayer
            url="https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}"
            attribution="© ČÚZK"
            maxZoom={21}
            maxNativeZoom={20}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Základní mapa ČÚZK">
          <TileLayer
            url="https://ags.cuzk.gov.cz/arcgis1/rest/services/ZTM_WM/MapServer/tile/{z}/{y}/{x}"
            attribution="© ČÚZK"
            maxZoom={21}
            maxNativeZoom={17}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© přispěvatelé OpenStreetMap" maxZoom={21} maxNativeZoom={19} />
        </LayersControl.BaseLayer>
      </LayersControl>
      <ClickHandler onPick={onPick} disabled={disabled} />
      {location && <Recenter center={center} zoom={17} />}
      {neighbours.map((b) => (
        <Polygon
          key={b.id}
          positions={toLatLng(b.footprint)}
          pathOptions={{ color: b.include === false ? "#94a3b8" : "#f2b705", weight: 1.5, fillOpacity: 0.15, dashArray: b.include === false ? "4 4" : undefined }}
          eventHandlers={
            onPickBuilding && !disabled
              ? {
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    onPickBuilding(b.id, e.latlng.lng, e.latlng.lat);
                  },
                }
              : undefined
          }
        >
          {b.label && <Tooltip>{b.label}</Tooltip>}
        </Polygon>
      ))}
      {main && (
        <Polygon positions={toLatLng(main.footprint)} pathOptions={{ color: "#2563a8", weight: 2.5, fillOpacity: 0.25 }}>
          <Tooltip>Posuzovaný objekt</Tooltip>
        </Polygon>
      )}
      {main && radiusM ? (
        <Circle
          center={[
            main.footprint.reduce((s, p) => s + p[1], 0) / main.footprint.length,
            main.footprint.reduce((s, p) => s + p[0], 0) / main.footprint.length,
          ]}
          radius={radiusM}
          pathOptions={{ color: "#14213d", weight: 1, dashArray: "6 6", fill: false }}
        />
      ) : null}
      {location && <CircleMarker center={center} radius={4} pathOptions={{ color: "#b3261e", fillOpacity: 1 }} />}
    </MapContainer>
  );
}
