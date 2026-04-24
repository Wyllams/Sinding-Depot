"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type GeoResult = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
};

type WeatherDay = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipProb: number;
  weatherCode: number;
  shortForecast: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeatherIcon(code: number): { icon: string; color: string } {
  if (code === 0)                                                        return { icon: "sunny",            color: "text-amber-400"  };
  if (code === 1 || code === 2)                                          return { icon: "partly_cloudy_day", color: "text-amber-200"  };
  if (code === 3 || code === 45 || code === 48)                          return { icon: "cloudy",            color: "text-gray-400"   };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))              return { icon: "rainy",             color: "text-blue-400"   };
  if ([71, 73, 75, 77, 85, 86].includes(code))                           return { icon: "snowing",           color: "text-white"      };
  if ([95, 96, 99].includes(code))                                       return { icon: "thunderstorm",      color: "text-purple-400" };
  return { icon: "partly_cloudy_day", color: "text-[#ababa8]" };
}

function nwsForecastToWmoCode(shortForecast: string): number {
  const txt = shortForecast.toLowerCase();
  if (txt.includes("thunder") || txt.includes("tstorm"))   return 95;
  if (txt.includes("snow") || txt.includes("blizzard"))    return 73;
  if (txt.includes("sleet") || txt.includes("ice"))        return 77;
  if (txt.includes("rain") && txt.includes("heavy"))       return 65;
  if (txt.includes("rain") || txt.includes("showers"))     return 61;
  if (txt.includes("drizzle"))                             return 51;
  if (txt.includes("fog"))                                 return 45;
  if (txt.includes("overcast") || txt.includes("cloudy"))  return 3;
  if (txt.includes("partly"))                              return 2;
  if (txt.includes("mostly sunny") || txt.includes("mostly clear")) return 1;
  if (txt.includes("sunny") || txt.includes("clear"))      return 0;
  return 2;
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

// ─── NWS Fetcher ──────────────────────────────────────────────────────────
async function fetchFromNWS(lat: number, lon: number): Promise<WeatherDay[]> {
  const pointRes = await fetch(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
    {
      headers: {
        "User-Agent": "SidingDepot/1.0 (admin@sidingdepot.com)",
        Accept: "application/geo+json",
      },
    }
  );
  if (!pointRes.ok) throw new Error(`NWS points failed: ${pointRes.status}`);
  const pointData = await pointRes.json();
  const forecastUrl: string = pointData.properties?.forecast;
  if (!forecastUrl) throw new Error("NWS forecast URL not found");

  const forecastRes = await fetch(forecastUrl, {
    headers: {
      "User-Agent": "SidingDepot/1.0 (admin@sidingdepot.com)",
      Accept: "application/geo+json",
    },
  });
  if (!forecastRes.ok) throw new Error(`NWS forecast failed: ${forecastRes.status}`);
  const forecastData = await forecastRes.json();
  const periods: Array<{
    startTime: string;
    isDaytime: boolean;
    temperature: number;
    probabilityOfPrecipitation?: { value: number | null };
    shortForecast: string;
  }> = forecastData.properties?.periods ?? [];

  const days: WeatherDay[] = [];

  if (periods.length > 0 && !periods[0].isDaytime) {
    const tonight = periods[0];
    const todayDate = tonight.startTime.slice(0, 10);
    days.push({
      date: todayDate,
      maxTemp: tonight.temperature + 12, // Night temp + estimate for max
      minTemp: tonight.temperature,
      precipProb: tonight.probabilityOfPrecipitation?.value ?? 0,
      weatherCode: nwsForecastToWmoCode(tonight.shortForecast),
      shortForecast: tonight.shortForecast,
    });
  }

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (!p.isDaytime) continue;
    const dateStr = p.startTime.slice(0, 10);
    if (days.length > 0 && days[0].date === dateStr) continue;
    const nightP = periods[i + 1];
    days.push({
      date: dateStr,
      maxTemp: p.temperature,
      minTemp: nightP?.temperature ?? p.temperature - 15,
      precipProb: p.probabilityOfPrecipitation?.value ?? 0,
      weatherCode: nwsForecastToWmoCode(p.shortForecast),
      shortForecast: p.shortForecast,
    });
  }
  return days;
}

// ─── Open-Meteo Fetcher (Fallback) ────────────────────────────────────────
async function fetchFromOpenMeteo(lat: number, lon: number): Promise<WeatherDay[]> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&temperature_unit=fahrenheit&forecast_days=7`
  );
  if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`);
  const data = await res.json();
  const daily = data.daily;
  if (!daily?.time) throw new Error("Open-Meteo: no daily data");

  return daily.time.map((date: string, i: number) => ({
    date,
    maxTemp: daily.temperature_2m_max[i],
    minTemp: daily.temperature_2m_min[i],
    precipProb: daily.precipitation_probability_max?.[i] ?? 0,
    weatherCode: daily.weather_code[i],
    shortForecast: "",
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MobileWeatherWidget() {
  const [search, setSearch]             = useState("");
  const [results, setResults]           = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [todayStr, setTodayStr]         = useState("");

  const [location, setLocation] = useState<{ name: string; lat: number; lon: number }>({
    name: "Marietta, Georgia",
    lat: 33.9526,
    lon: -84.5499,
  });

  const [days, setDays] = useState<WeatherDay[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [source, setSource] = useState<"nws" | "open-meteo" | "">("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedLocation = localStorage.getItem("siding_depot_field_weather_city");
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("siding_depot_field_weather_city", JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const today = new Date();
    setTodayStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    const fetchCities = async (): Promise<void> => {
      if (search.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=10&language=en&format=json`);
        const data = await res.json();
        const georgiaOnly = (data.results || []).filter(
          (r: GeoResult) => r.country_code === "US" && r.admin1?.toLowerCase() === "georgia"
        );
        setResults(georgiaOnly);
      } catch (err) {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const timer = setTimeout(fetchCities, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchWeather = async (): Promise<void> => {
      setIsLoadingWeather(true);
      setSource("");

      try {
        let weatherDays: WeatherDay[] = [];
        try {
          weatherDays = await fetchFromNWS(location.lat, location.lon);
          setSource("nws");
        } catch (nwsErr) {
          try {
            weatherDays = await fetchFromOpenMeteo(location.lat, location.lon);
            setSource("open-meteo");
          } catch (omErr) {
            setDays([]);
            return;
          }
        }
        // Limit to 7 days for mobile
        setDays(weatherDays.slice(0, 7));
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [location.lat, location.lon]);

  const selectCity = (city: GeoResult): void => {
    setLocation({
      name: `${city.name}, ${city.admin1 ? city.admin1 : city.country}`,
      lat: city.latitude,
      lon: city.longitude,
    });
    setSearch("");
    setShowDropdown(false);
  };

  return (
    <div className="bg-[#121412] rounded-3xl overflow-hidden border border-white/5 relative">
      {/* Header */}
      <div className="px-5 py-4 flex flex-col gap-3 bg-[#181a18]/50 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">location_on</span>
            <h3 className="text-base font-bold tracking-tight text-[#faf9f5]">
              {location.name}
            </h3>
          </div>
          {source && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-[#242624] border border-[#474846]/30 text-[#ababa8]">
              {source === "nws" ? "NWS" : "O-M"}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full z-10" ref={dropdownRef}>
          <div className="flex items-center bg-[#1e201e] border border-white/5 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-zinc-500 text-sm mr-2" translate="no">search</span>
            <input
              type="text"
              placeholder="Search city..."
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
          </div>

          {/* Dropdown */}
          {showDropdown && search.trim().length > 1 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1e201e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50">
              {isSearching ? (
                <div className="px-4 py-3 text-xs text-zinc-400 flex justify-center">Searching...</div>
              ) : results.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {results.map((city) => (
                    <li
                      key={city.id}
                      className="px-4 py-2 text-xs text-white hover:bg-[#aeee2a]/10 cursor-pointer flex flex-col"
                      onClick={() => selectCity(city)}
                    >
                      <span className="font-bold">{city.name}</span>
                      <span className="text-[9px] text-zinc-500">{city.admin1 ? `${city.admin1}, ` : ""}{city.country}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-xs text-zinc-400 text-center">No locations found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Weather Carousel - 2 items visible at a time (w-1/2) */}
      <div className="px-2 pb-2 pt-2">
        {isLoadingWeather || days.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
             <div className="animate-spin w-6 h-6 rounded-full border-2 border-[#aeee2a]/20 border-t-[#aeee2a]"></div>
          </div>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
            {days.map((day) => {
              const weatherInfo = getWeatherIcon(day.weatherCode);
              const isToday = day.date === todayStr;

              return (
                <div
                  key={day.date}
                  className="w-1/2 shrink-0 snap-center p-2"
                >
                  <div className={`h-full flex flex-col items-center justify-center p-4 rounded-2xl transition-colors ${isToday ? "bg-[#aeee2a]/[0.08]" : "bg-transparent"}`}>
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-[10px] font-black text-[#aeee2a]">
                        {new Date(day.date + "T00:00:00").getDate().toString().padStart(2, '0')}
                      </span>
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${isToday ? "text-[#aeee2a]" : "text-zinc-500"}`}>
                        {isToday ? "TODAY" : getDayName(day.date)}
                      </span>
                    </div>
                    
                    <span 
                      className={`material-symbols-outlined text-4xl mb-2 drop-shadow-md ${weatherInfo.color}`} 
                      translate="no"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {weatherInfo.icon}
                    </span>

                    {day.shortForecast && (
                      <p className="text-[9px] text-zinc-400 font-medium text-center leading-tight mb-2 h-6 line-clamp-2">
                        {day.shortForecast}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-white">
                        {Math.round(day.maxTemp)}°
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {Math.round(day.minTemp)}°
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 mt-1 transition-opacity ${day.precipProb > 0 ? 'text-blue-400 opacity-90' : 'text-zinc-500 opacity-30'}`}>
                      <span className="material-symbols-outlined text-[11px]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                      <span className="text-[9px] font-bold">{day.precipProb}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
