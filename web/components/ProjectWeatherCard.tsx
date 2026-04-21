"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type WeatherDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
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
  return { icon: "partly_cloudy_day", color: "text-[#ababa8]" };
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProjectWeatherCard({ city: rawCity, state: rawState }: ProjectWeatherCardProps) {
  const city  = rawCity.trim();
  const state = rawState.trim();

  const [weekPage, setWeekPage]                           = useState(0);
  const [todayStr, setTodayStr]                           = useState("");
  const [weather, setWeather]                             = useState<WeatherDaily | null>(null);
  const [isLoadingWeather, setIsLoadingWeather]           = useState(false);
  const [locationLabel, setLocationLabel]                 = useState("");
  const [geocodeError, setGeocodeError]                   = useState(false);

  // ── Step 1: Geocode city → lat/lon using Open-Meteo ─────────────────────
  useEffect(() => {
    if (!city) return;

    const query = state ? `${city}, ${state}` : city;
    setLocationLabel(query);
    setGeocodeError(false);
    setWeather(null);
    setIsLoadingWeather(true);

    (async () => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`
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

        if (results.length === 0) {
          setGeocodeError(true);
          setIsLoadingWeather(false);
          return;
        }

        // Prefer US result matching the state abbreviation (admin1 code or name comparison)
        const usResult =
          results.find(
            (r) =>
              r.country_code === "US" &&
              (r.admin1?.toLowerCase().startsWith(state.toLowerCase()) ||
                state === "")
          ) ?? results[0];

        setLocationLabel(`${usResult.name}, ${usResult.admin1 ?? usResult.country}`);

        // ── Step 2: Fetch 2-week forecast ─────────────────────────────────
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${usResult.latitude}&longitude=${usResult.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&temperature_unit=fahrenheit&past_days=7&forecast_days=14`
        );
        const weatherData = await weatherRes.json();
        const daily = weatherData.daily;

        if (daily && daily.time && daily.time.length >= 21) {
          const currentToday = daily.time[7];
          setTodayStr(currentToday);

          const todayDate = new Date(currentToday + "T12:00:00");
          const dayOfWeek = todayDate.getDay() || 7; // 1=Mon … 7=Sun
          const startIdx = 7 - (dayOfWeek - 1);

          setWeather({
            time:                        daily.time.slice(startIdx, startIdx + 14),
            weather_code:                daily.weather_code.slice(startIdx, startIdx + 14),
            temperature_2m_max:          daily.temperature_2m_max.slice(startIdx, startIdx + 14),
            temperature_2m_min:          daily.temperature_2m_min.slice(startIdx, startIdx + 14),
            precipitation_probability_max: daily.precipitation_probability_max
              ? daily.precipitation_probability_max.slice(startIdx, startIdx + 14)
              : [],
          });
        } else {
          // Fallback: just show what we got
          setTodayStr(daily?.time?.[7] ?? "");
          setWeather(daily);
        }
      } catch (err) {
        console.error("[ProjectWeatherCard] fetch error:", err);
        setGeocodeError(true);
      } finally {
        setIsLoadingWeather(false);
      }
    })();
  }, [city, state]);

  // ─── No city — don't render ────────────────────────────────────────────────
  if (!city) return null;

  return (
    <div className="bg-[#121412] rounded-3xl overflow-hidden border border-[#474846]/15 mb-8">
      {/* Header */}
      <div className="px-6 py-4 sm:px-8 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#181a18]/50 gap-4 border-b border-[#474846]/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#aeee2a]" translate="no">
            location_on
          </span>
          <h3
            className="text-base sm:text-lg font-bold tracking-tight text-[#faf9f5]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {locationLabel || `${city}${state ? `, ${state}` : ""}`}
          </h3>

          {/* Info tooltip */}
          <div className="relative group flex items-center ml-1">
            <span
              className="material-symbols-outlined text-[#ababa8] text-[15px] cursor-help transition-colors hover:text-[#aeee2a]"
              translate="no"
            >
              info
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-[#1e201e] border border-[#474846]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-[#ababa8] z-50 text-center leading-relaxed">
              Real-time satellite data provided by global weather models (NOAA GFS, DWD ICON, MeteoFrance).
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-[#1e201e]" />
            </div>
          </div>
        </div>

        {/* Week pagination only — no search */}
        <div className="flex items-center gap-1 bg-[#1e201e] border border-[#474846]/30 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setWeekPage(0)}
            disabled={weekPage === 0}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
              weekPage === 0
                ? "text-[#ababa8]/30 cursor-not-allowed"
                : "text-[#faf9f5] hover:bg-[#474846]/40 cursor-pointer"
            }`}
            title="This week"
          >
            <span className="material-symbols-outlined text-sm" translate="no">
              chevron_left
            </span>
          </button>
          <button
            onClick={() => setWeekPage(1)}
            disabled={weekPage === 1}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
              weekPage === 1
                ? "text-[#ababa8]/30 cursor-not-allowed"
                : "text-[#faf9f5] hover:bg-[#474846]/40 cursor-pointer"
            }`}
            title="Next week"
          >
            <span className="material-symbols-outlined text-sm" translate="no">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Forecast Grid */}
      <div className="px-6 sm:px-8 h-full">
        {geocodeError ? (
          <div className="h-36 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[#ababa8] text-3xl" translate="no">
              cloud_off
            </span>
            <p className="text-xs text-[#ababa8]">
              Could not load weather for <span className="text-[#faf9f5] font-bold">{city}</span>
            </p>
          </div>
        ) : isLoadingWeather || !weather ? (
          <div className="h-36 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#aeee2a]/20 border-t-[#aeee2a]" />
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 sm:gap-0 sm:grid sm:grid-cols-7 sm:divide-x divide-[#474846]/15 min-w-max sm:min-w-0 h-full">
            {weather.time.slice(weekPage * 7, (weekPage + 1) * 7).map((date, relativeIdx) => {
              const idx          = weekPage * 7 + relativeIdx;
              const code         = weather.weather_code[idx];
              const maxTemp      = weather.temperature_2m_max[idx];
              const minTemp      = weather.temperature_2m_min[idx];
              const precipProb   = weather.precipitation_probability_max?.[idx] ?? 0;
              const weatherInfo  = getWeatherIcon(code);
              const isToday      = date === todayStr;

              return (
                <div
                  key={date}
                  className={`flex flex-col items-center justify-center py-5 px-4 sm:px-6 w-32 sm:w-auto shrink-0 transition-colors ${
                    isToday ? "bg-[#aeee2a]/[0.06] shadow-inner" : ""
                  }`}
                >
                  {/* Day label */}
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    <span className="text-xs font-black text-[#aeee2a]">
                      {new Date(date + "T00:00:00").getDate().toString().padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[11px] font-bold tracking-[0.2em] uppercase ${
                        isToday ? "text-[#aeee2a]" : "text-[#ababa8]"
                      }`}
                    >
                      {isToday ? "Today" : getDayName(date)}
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

                  {/* Temps */}
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className="text-xl font-bold text-[#faf9f5]"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {Math.round(maxTemp)}°
                    </span>
                    <span className="text-sm font-bold text-[#ababa8]/70">
                      {Math.round(minTemp)}°
                    </span>
                  </div>

                  {/* Precipitation */}
                  <div
                    className={`flex items-center gap-1 mt-2 transition-opacity ${
                      precipProb > 0 ? "text-blue-400 opacity-90" : "text-[#ababa8] opacity-20"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[13px]"
                      translate="no"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      water_drop
                    </span>
                    <span className="text-[11px] font-bold">{precipProb}%</span>
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
