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
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (!p.isDaytime) continue;
    const dateStr = p.startTime.slice(0, 10);
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
export function WeeklyWeather() {
  const [search, setSearch]             = useState("");
  const [results, setResults]           = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [weekPage, setWeekPage]         = useState(0);
  const [todayStr, setTodayStr]         = useState("");

  // Default to Marietta, GA (Siding Depot HQ)
  const [location, setLocation] = useState<{ name: string; lat: number; lon: number }>({
    name: "Marietta, Georgia",
    lat: 33.9526,
    lon: -84.5499,
  });

  const [days, setDays]                 = useState<WeatherDay[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [source, setSource]             = useState<"nws" | "open-meteo" | "">("");
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("siding_depot_weather_city");
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch {
        console.error("Failed to load saved city location");
      }
    }
  }, []);

  // Save location to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("siding_depot_weather_city", JSON.stringify(location));
  }, [location]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set today string
  useEffect(() => {
    const today = new Date();
    setTodayStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, []);

  // Debounced Geocoding Search
  useEffect(() => {
    const fetchCities = async (): Promise<void> => {
      if (search.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=5&language=en&format=json`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error("Geocoding fetch error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchCities, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Weather — NWS primary, Open-Meteo fallback
  useEffect(() => {
    const fetchWeather = async (): Promise<void> => {
      setIsLoadingWeather(true);
      setSource("");

      try {
        let weatherDays: WeatherDay[] = [];

        // Try NWS first (most accurate for US)
        try {
          weatherDays = await fetchFromNWS(location.lat, location.lon);
          setSource("nws");
        } catch (nwsErr) {
          console.warn("[Weather] NWS failed, falling back to Open-Meteo:", nwsErr);
          try {
            weatherDays = await fetchFromOpenMeteo(location.lat, location.lon);
            setSource("open-meteo");
          } catch (omErr) {
            console.error("[Weather] All sources failed:", omErr);
            setDays([]);
            return;
          }
        }

        setDays(weatherDays);
      } catch (err) {
        console.error("Weather fetch error:", err);
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
    setWeekPage(0);
    setSearch("");
    setShowDropdown(false);
  };

  const maxPages = Math.ceil(days.length / 7);

  return (
    <div className="bg-[#121412] rounded-3xl overflow-hidden border border-[#474846]/15 relative">
      <div className="px-6 py-4 sm:px-8 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#181a18]/50 gap-4 border-b border-[#474846]/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#aeee2a]" translate="no">location_on</span>
          <h3
            className="text-lg sm:text-xl font-bold tracking-tight text-[#faf9f5]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {location.name}
          </h3>
          
          {/* Source badge */}
          {source && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-[#242624] border border-[#474846]/30 text-[#ababa8]">
              {source === "nws" ? "NWS Official" : "Open-Meteo"}
            </span>
          )}

          <div className="relative group flex items-center ml-1">
             <span className="material-symbols-outlined text-[#ababa8] text-[16px] cursor-help transition-colors hover:text-[#aeee2a]" translate="no">info</span>
             <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-[#1e201e] border border-[#474846]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-[#ababa8] z-50 text-center leading-relaxed">
               {source === "nws"
                 ? "Official data from the U.S. National Weather Service (NOAA). Most accurate source for US locations."
                 : "Real-time satellite data provided by global weather models (NOAA GFS, DWD ICON, MeteoFrance)."}
               <div className="absolute left-1/2 -top-2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-[#1e201e]"></div>
             </div>
          </div>
        </div>

        {/* City Search & Pagination */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {maxPages > 1 && (
            <div className="flex items-center gap-1 bg-[#1e201e] border border-[#474846]/30 rounded-xl p-1 shadow-inner">
              <button 
                onClick={() => setWeekPage(0)} 
                disabled={weekPage === 0}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${weekPage === 0 ? 'text-[#ababa8]/30 cursor-not-allowed' : 'text-[#faf9f5] hover:bg-[#474846]/40 cursor-pointer'}`}
                title="Previous week"
              >
                 <span className="material-symbols-outlined text-sm" translate="no">chevron_left</span>
              </button>
              <button 
                onClick={() => setWeekPage(1)} 
                disabled={weekPage >= maxPages - 1}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${weekPage >= maxPages - 1 ? 'text-[#ababa8]/30 cursor-not-allowed' : 'text-[#faf9f5] hover:bg-[#474846]/40 cursor-pointer'}`}
                title="Next week"
              >
                 <span className="material-symbols-outlined text-sm" translate="no">chevron_right</span>
              </button>
            </div>
          )}

          <div className="relative w-full sm:w-64 z-10" ref={dropdownRef}>
            <div className="flex items-center bg-[#1e201e] border border-[#474846]/30 rounded-xl px-3 py-2 shadow-inner focus-within:border-[#aeee2a]/50 transition-colors">
              <span className="material-symbols-outlined text-[#ababa8] text-sm mr-2" translate="no">search</span>
              <input
                type="text"
                placeholder="Search city..."
                className="bg-transparent border-none outline-none text-sm text-[#faf9f5] w-full placeholder:text-[#ababa8]/50"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
            </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && search.trim().length > 1 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1e201e] border border-[#474846]/40 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-[#ababa8] flex items-center justify-center">
                   <div className="animate-spin w-4 h-4 rounded-full border-2 border-[#ababa8]/20 border-t-[#ababa8] mr-2"></div>
                   Searching...
                </div>
              ) : results.length > 0 ? (
                <ul className="divide-y divide-[#474846]/10">
                  {results.map((city) => (
                    <li
                      key={city.id}
                      className="px-4 py-3 text-sm text-[#faf9f5] hover:bg-[#aeee2a]/10 cursor-pointer transition-colors flex flex-col"
                      onClick={() => selectCity(city)}
                    >
                      <span className="font-bold">{city.name}</span>
                      <span className="text-[10px] text-[#ababa8] mt-0.5">
                        {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-[#ababa8] text-center">No locations found.</div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Forecast Grid */}
      <div className="px-6 sm:px-8 h-full">
        {isLoadingWeather || days.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
             <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#aeee2a]/20 border-t-[#aeee2a]"></div>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 sm:gap-0 sm:grid sm:grid-cols-7 sm:divide-x divide-[#474846]/15 min-w-max sm:min-w-0 h-full">
            {days.slice(weekPage * 7, (weekPage + 1) * 7).map((day) => {
              const weatherInfo = getWeatherIcon(day.weatherCode);
              const isToday = day.date === todayStr;

              return (
                <div
                  key={day.date}
                  className={`flex flex-col items-center justify-center py-6 px-4 sm:px-6 w-32 sm:w-auto shrink-0 transition-colors ${isToday ? "bg-[#aeee2a]/[0.06] shadow-inner" : ""}`}
                  title={day.shortForecast || undefined}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    <span className="text-xs font-black text-[#aeee2a]">
                      {new Date(day.date + "T00:00:00").getDate().toString().padStart(2, '0')}
                    </span>
                    <span className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isToday ? "text-[#aeee2a]" : "text-[#ababa8]"}`}>
                      {isToday ? "Today" : getDayName(day.date)}
                    </span>
                  </div>
                  
                  <span 
                    className={`material-symbols-outlined text-4xl sm:text-5xl mb-4 mix-blend-lighten drop-shadow-lg ${weatherInfo.color}`} 
                    translate="no"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {weatherInfo.icon}
                  </span>

                  {/* Short forecast text (NWS only) */}
                  {day.shortForecast && (
                    <p className="text-[9px] text-[#ababa8] font-medium text-center leading-tight mb-2 max-w-[80px] line-clamp-2">
                      {day.shortForecast}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xl font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                      {Math.round(day.maxTemp)}°
                    </span>
                    <span className="text-sm font-bold text-[#ababa8]/70">
                      {Math.round(day.minTemp)}°
                    </span>
                  </div>

                  {/* Precipitation */}
                  <div className={`flex items-center gap-1 mt-2 transition-opacity ${day.precipProb > 0 ? 'text-blue-400 opacity-90' : 'text-[#ababa8] opacity-20'}`}>
                    <span className="material-symbols-outlined text-[13px]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                    <span className="text-[11px] font-bold">{day.precipProb}%</span>
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
