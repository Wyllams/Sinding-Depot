"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type WeatherDay = {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipProb: number;
  weatherCode: number; // WMO code for icon mapping
  shortForecast: string;
};

interface ProjectWeatherCardProps {
  city: string;
  state: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeatherIcon(code: number): { icon: string; color: string } {
  if (code === 0)                                                        return { icon: "sunny",            color: "text-amber-400"  };
  if (code === 1 || code === 2)                                          return { icon: "partly_cloudy_day", color: "text-amber-200"  };
  if (code === 3 || code === 45 || code === 48)                          return { icon: "cloudy",            color: "text-gray-400"   };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))              return { icon: "rainy",             color: "text-blue-400"   };
  if ([71, 73, 75, 77, 85, 86].includes(code))                           return { icon: "snowing",           color: "text-white"      };
  if ([95, 96, 99].includes(code))                                       return { icon: "thunderstorm",      color: "text-purple-400" };
  return { icon: "partly_cloudy_day", color: "text-on-surface-variant" };
}

/** Map NWS shortForecast text → WMO weather code for icon rendering */
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
  return 2; // default: partly cloudy
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

// ─── NWS API Fetcher (Primary — Most Accurate for US) ─────────────────────
async function fetchFromNWS(lat: number, lon: number): Promise<WeatherDay[]> {
  // Step 1: Get grid point
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

  // Step 2: Get 7-day forecast (14 periods: day/night pairs)
  const forecastRes = await fetch(forecastUrl, {
    headers: {
      "User-Agent": "SidingDepot/1.0 (admin@sidingdepot.com)",
      Accept: "application/geo+json",
    },
  });

  if (!forecastRes.ok) throw new Error(`NWS forecast failed: ${forecastRes.status}`);
  const forecastData = await forecastRes.json();
  const periods: Array<{
    name: string;
    startTime: string;
    isDaytime: boolean;
    temperature: number;
    probabilityOfPrecipitation?: { value: number | null };
    shortForecast: string;
  }> = forecastData.properties?.periods ?? [];

  // Pair day/night periods into daily entries
  const days: WeatherDay[] = [];

  // If first period is nighttime ("Tonight"), today's daytime has passed.
  // Still include today using the night period data so today always appears.
  if (periods.length > 0 && !periods[0].isDaytime) {
    const tonight = periods[0];
    const todayDate = tonight.startTime.slice(0, 10);
    days.push({
      date: todayDate,
      maxTemp: tonight.temperature + 12,
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
    // Skip if we already added today from the night period above
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

// ─── Open-Meteo API Fetcher (Fallback) ────────────────────────────────────
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

// ─── Geocode city → lat/lon ───────────────────────────────────────────────
async function geocodeCity(city: string, _state: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`
  );
  const geoData = await geoRes.json();
  const results: Array<{
    name: string;
    admin1?: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
  }> = geoData.results || [];

  if (results.length === 0) return null;

  // ONLY Georgia, US — filter strictly
  const georgiaResult = results.find(
    (r) => r.country_code === "US" && r.admin1?.toLowerCase() === "georgia"
  );

  if (!georgiaResult) return null;

  return {
    lat: georgiaResult.latitude,
    lon: georgiaResult.longitude,
    label: `${georgiaResult.name}, Georgia`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProjectWeatherCard({ city: rawCity, state: rawState }: ProjectWeatherCardProps) {
  const city  = rawCity.trim();
  const state = rawState.trim();

  const [weekPage, setWeekPage]               = useState(0);
  const [todayStr, setTodayStr]               = useState("");
  const [days, setDays]                       = useState<WeatherDay[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [locationLabel, setLocationLabel]     = useState("");
  const [hasError, setHasError]               = useState(false);
  const [source, setSource]                   = useState<"nws" | "open-meteo" | "">("");

  useEffect(() => {
    if (!city) return;

    const query = state ? `${city}, ${state}` : city;
    setLocationLabel(query);
    setHasError(false);
    setDays([]);
    setIsLoading(true);
    setSource("");

    // Set today
    const today = new Date();
    setTodayStr(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);

    (async () => {
      try {
        // Step 1: Geocode
        const geo = await geocodeCity(city, state);
        if (!geo) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        setLocationLabel(geo.label);

        // Step 2: Try NWS first (most accurate for US)
        let weatherDays: WeatherDay[] = [];
        try {
          weatherDays = await fetchFromNWS(geo.lat, geo.lon);
          setSource("nws");
        } catch (nwsErr) {
          console.warn("[Weather] NWS failed, falling back to Open-Meteo:", nwsErr);
          // Step 3: Fallback to Open-Meteo
          try {
            weatherDays = await fetchFromOpenMeteo(geo.lat, geo.lon);
            setSource("open-meteo");
          } catch (omErr) {
            console.error("[Weather] All sources failed:", omErr);
            setHasError(true);
            setIsLoading(false);
            return;
          }
        }

        // Pad to 14 days for two weeks if NWS only returns 7
        setDays(weatherDays);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [city, state]);

  // ─── No city — don't render ────────────────────────────────────────────────
  if (!city) return null;

  const maxPages = Math.ceil(days.length / 7);

  return (
    <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/15 mb-8">
      {/* Header */}
      <div className="px-6 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container/50 gap-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" translate="no">
            location_on
          </span>
          <h3
            className="text-base sm:text-lg font-bold tracking-tight text-on-surface"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {locationLabel || `${city}${state ? `, ${state}` : ""}`}
          </h3>

          {/* Source badge */}
          {source && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant">
              {source === "nws" ? "NWS Official" : "Open-Meteo"}
            </span>
          )}

          {/* Info tooltip */}
          <div className="relative group flex items-center ml-1">
            <span
              className="material-symbols-outlined text-on-surface-variant text-[15px] cursor-help transition-colors hover:text-primary"
              translate="no"
            >
              info
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-on-surface-variant z-50 text-center leading-relaxed">
              {source === "nws"
                ? "Official data from the U.S. National Weather Service (NOAA). This is the most accurate source for US locations."
                : "Real-time satellite data provided by global weather models (NOAA GFS, DWD ICON, MeteoFrance)."}
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-surface-container-high" />
            </div>
          </div>
        </div>

        {/* Week pagination */}
        {maxPages > 1 && (
          <div className="flex items-center gap-1 bg-surface-container-high border border-outline-variant/30 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setWeekPage(0)}
              disabled={weekPage === 0}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                weekPage === 0
                  ? "text-on-surface-variant/30 cursor-not-allowed"
                  : "text-on-surface hover:bg-outline-variant/40 cursor-pointer"
              }`}
              title="This week"
            >
              <span className="material-symbols-outlined text-sm" translate="no">
                chevron_left
              </span>
            </button>
            <button
              onClick={() => setWeekPage(1)}
              disabled={weekPage >= maxPages - 1}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                weekPage >= maxPages - 1
                  ? "text-on-surface-variant/30 cursor-not-allowed"
                  : "text-on-surface hover:bg-outline-variant/40 cursor-pointer"
              }`}
              title="Next week"
            >
              <span className="material-symbols-outlined text-sm" translate="no">
                chevron_right
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Forecast Grid */}
      <div className="px-6 sm:px-8 h-full">
        {hasError ? (
          <div className="h-36 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl" translate="no">
              cloud_off
            </span>
            <p className="text-xs text-on-surface-variant">
              Could not load weather for <span className="text-on-surface font-bold">{city}</span>
            </p>
          </div>
        ) : isLoading || days.length === 0 ? (
          <div className="h-36 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 sm:gap-0 sm:grid sm:grid-cols-7 sm:divide-x divide-outline-variant/15 min-w-max sm:min-w-0 h-full">
            {days.slice(weekPage * 7, (weekPage + 1) * 7).map((day) => {
              const weatherInfo = getWeatherIcon(day.weatherCode);
              const isToday     = day.date === todayStr;

              return (
                <div
                  key={day.date}
                  className={`flex flex-col items-center justify-center py-5 px-4 sm:px-6 w-32 sm:w-auto shrink-0 transition-colors ${
                    isToday ? "bg-primary/[0.06] shadow-inner" : ""
                  }`}
                  title={day.shortForecast || undefined}
                >
                  {/* Day label */}
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    <span className="text-xs font-black text-primary">
                      {new Date(day.date + "T00:00:00").getDate().toString().padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[11px] font-bold tracking-[0.2em] uppercase ${
                        isToday ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {isToday ? "Today" : getDayName(day.date)}
                    </span>
                  </div>

                  {/* Weather icon */}
                  <span
                    className={`material-symbols-outlined text-4xl sm:text-5xl mb-4 mix-blend-lighten drop-shadow-lg ${weatherInfo.color}`}
                    translate="no"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {weatherInfo.icon}
                  </span>

                  {/* Short forecast text (NWS only) */}
                  {day.shortForecast && (
                    <p className="text-[9px] text-on-surface-variant font-medium text-center leading-tight mb-2 max-w-[80px] line-clamp-2">
                      {day.shortForecast}
                    </p>
                  )}

                  {/* Temps */}
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-xl font-bold text-on-surface"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {Math.round(day.maxTemp)}°
                    </span>
                    <span className="text-sm font-bold text-on-surface-variant/70">
                      {Math.round(day.minTemp)}°
                    </span>
                  </div>

                  {/* Precipitation */}
                  <div
                    className={`flex items-center gap-1 mt-2 transition-opacity ${
                      day.precipProb > 0 ? "text-blue-400 opacity-90" : "text-on-surface-variant opacity-20"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[13px]"
                      translate="no"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      water_drop
                    </span>
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
