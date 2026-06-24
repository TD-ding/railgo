"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { Button, Card, Header } from "@/components/ui";
import { upcomingDates } from "@/lib/format";
import type { City, Station } from "@/lib/types";

export default function SearchPage() {
  const router = useRouter();
  const dates = upcomingDates(14);
  const { data } = useQuery({
    queryKey: ["cities"],
    queryFn: () => api.get<{ cities: City[] }>("/api/cities"),
  });
  const cities = data?.cities ?? [];

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [fromStation, setFromStation] = useState("");
  const [toStation, setToStation] = useState("");
  const [date, setDate] = useState(dates[0].value);

  const fromC = cities.find((c) => c.id === fromCity);
  const toC = cities.find((c) => c.id === toCity);
  const fromStations = fromC?.stations ?? [];
  const toStations = toC?.stations ?? [];

  function pickCity(side: "from" | "to", cityId: string) {
    const code = cities.find((c) => c.id === cityId)?.stations[0]?.code ?? "";
    if (side === "from") {
      setFromCity(cityId);
      setFromStation(code);
    } else {
      setToCity(cityId);
      setToStation(code);
    }
  }

  function swap() {
    setFromCity(toCity);
    setToCity(fromCity);
    setFromStation(toStation);
    setToStation(fromStation);
  }

  const sameEnds = fromCity !== "" && fromCity === toCity;
  const canSearch = !!fromCity && !!toCity && !sameEnds;

  function search() {
    const f = fromStation || fromStations[0]?.code;
    const t = toStation || toStations[0]?.code;
    if (!f || !t || !canSearch) return;
    router.push(`/search?from=${f}&to=${t}&date=${date}`);
  }

  return (
    <div>
      <Header title="火车票预订" sub="说走就走，一键购票" />
      <div className="space-y-4 p-4">
        {/* Route block */}
        <Card className="!p-0 overflow-hidden">
          <div className="relative">
            <EndpointRow
              kind="from"
              city={fromC}
              cities={cities}
              stations={fromStations}
              stationCode={fromStation}
              onPickCity={(id) => pickCity("from", id)}
              onPickStation={setFromStation}
            />
            <div className="ml-5 border-t border-gray-100" />
            <EndpointRow
              kind="to"
              city={toC}
              cities={cities}
              stations={toStations}
              stationCode={toStation}
              onPickCity={(id) => pickCity("to", id)}
              onPickStation={setToStation}
            />
            {/* Swap button straddling the divider */}
            <button
              type="button"
              aria-label="对调出发与到达"
              onClick={swap}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-brand shadow-sm active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v16M7 4l-3 3M7 4l3 3" />
                <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
              </svg>
            </button>
          </div>
        </Card>

        {sameEnds && (
          <p className="px-1 text-xs text-red-500" role="alert">出发与到达城市不能相同。</p>
        )}

        {/* Date strip */}
        <div>
          <p className="mb-2 px-1 text-sm text-gray-600">出发日期</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dates.map((d) => {
              const active = d.value === date;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDate(d.value)}
                  className={`flex min-w-[68px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <span className={`text-xs ${active ? "text-white/80" : "text-gray-400"}`}>{d.label}</span>
                  <span className="text-base font-semibold">{d.md}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={search} disabled={!canSearch}>
          查询车票
        </Button>

        <p className="px-1 text-xs text-gray-400">
          演示线路：京沪、广深、沪杭、京宁等高铁车次（未来 14 天）。
        </p>
      </div>
    </div>
  );
}

function EndpointRow({
  kind,
  city,
  cities,
  stations,
  stationCode,
  onPickCity,
  onPickStation,
}: {
  kind: "from" | "to";
  city?: City;
  cities: City[];
  stations: Station[];
  stationCode: string;
  onPickCity: (id: string) => void;
  onPickStation: (code: string) => void;
}) {
  const isFrom = kind === "from";
  const stationName = stations.find((s) => s.code === stationCode)?.name;
  const multiStation = stations.length > 1;

  return (
    <div className="flex items-center gap-3 px-4 py-4 pr-16">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isFrom ? "bg-blue-50 text-brand" : "bg-orange-50 text-orange-600"
        }`}
      >
        {isFrom ? "始" : "终"}
      </span>
      <div className="min-w-0 flex-1">
        {/* City picker: styled row with invisible native select overlaid */}
        <div className="relative">
          <div className="flex items-baseline gap-2">
            <span className={`truncate text-lg font-semibold ${city ? "text-gray-900" : "text-gray-400"}`}>
              {city ? city.name : isFrom ? "选择出发城市" : "选择到达城市"}
            </span>
            <span className="text-xs text-gray-300">▾</span>
          </div>
          <select
            aria-label={isFrom ? "出发城市" : "到达城市"}
            value={city?.id ?? ""}
            onChange={(e) => onPickCity(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="" disabled>选择城市</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Station secondary line */}
        {city && (
          multiStation ? (
            <div className="relative mt-0.5 inline-block">
              <span className="text-sm text-gray-500">
                {stationName} <span className="text-gray-300">▾</span>
              </span>
              <select
                aria-label={isFrom ? "出发站" : "到达站"}
                value={stationCode}
                onChange={(e) => onPickStation(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-gray-500">{stationName}</p>
          )
        )}
      </div>
    </div>
  );
}
