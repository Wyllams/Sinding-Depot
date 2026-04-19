"use client";

import { useState, useEffect, useRef } from "react";

type GeoResult = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
};

type WeatherDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
};

export function WeeklyWeather() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [weekPage, setWeekPage] = useState(0);
  const [todayStr, setTodayStr] = useState<string>("");

  // Default to Marietta, GA (Siding Depot HQ), overwritten by localStorage if exists
  const [location, setLocation] = useState<{ name: string; lat: number; lon: number }>({
    name: "Marietta, Georgia",
    lat: 33.9526,
    lon: -84.5499,
  });

  const [weather, setWeather] = useState<WeatherDaily | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load location from localStorage on mount (Client-side hydration)
  useEffect(() => {
    const savedLocation = localStorage.getItem("siding_depot_weather_city");
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch (err) {
        console.error("Failed to load saved city location");
      }
    }
  }, []);

  // Save location to localStorage when it changes, but only after initial load
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

  // Debounced Geocoding Search
  useEffect(() => {
    const fetchCities = async () => {
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

  // Fetch Weather Forecast
  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&temperature_unit=fahrenheit&past_days=7&forecast_days=14`
        );
        const data = await res.json();
        const daily = data.daily;
        
        if (daily && daily.time && daily.time.length >= 21) {
          const currentToday = daily.time[7];
          setTodayStr(currentToday);
          
          const todayDate = new Date(currentToday + "T12:00:00");
          const dayOfWeek = todayDate.getDay() || 7; // 1 = Monday, 7 = Sunday
          const startIdx = 7 - (dayOfWeek - 1);
          
          setWeather({
            time: daily.time.slice(startIdx, startIdx + 14),
            weather_code: daily.weather_code.slice(startIdx, startIdx + 14),
            temperature_2m_max: daily.temperature_2m_max.slice(startIdx, startIdx + 14),
            temperature_2m_min: daily.temperature_2m_min.slice(startIdx, startIdx + 14),
            precipitation_probability_max: daily.precipitation_probability_max ? daily.precipitation_probability_max.slice(startIdx, startIdx + 14) : [],
          });
        } else {
          setWeather(daily);
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
  }, [location.lat, location.lon]);

  const selectCity = (city: GeoResult) => {
    setLocation({
      name: `${city.name}, ${city.admin1 ? city.admin1 : city.country}`,
      lat: city.latitude,
      lon: city.longitude,
    });
    setWeekPage(0);
    setSearch("");
    setShowDropdown(false);
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return { icon: "sunny", color: "text-amber-400" };
    if (code === 1 || code === 2) return { icon: "partly_cloudy_day", color: "text-amber-200" };
    if (code === 3 || code === 45 || code === 48) return { icon: "cloudy", color: "text-gray-400" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: "rainy", color: "text-blue-400" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "snowing", color: "text-white" };
    if ([95, 96, 99].includes(code)) return { icon: "thunderstorm", color: "text-purple-400" };
    return { icon: "partly_cloudy_day", color: "text-[#ababa8]" };
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00"); // Add time to prevent timezone shift issues
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  };

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
          
          <div className="relative group flex items-center ml-1">
             <span className="material-symbols-outlined text-[#ababa8] text-[16px] cursor-help transition-colors hover:text-[#aeee2a]" translate="no">info</span>
             
             {/* Tooltip Hover */}
             <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-[#1e201e] border border-[#474846]/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-[#ababa8] z-50 text-center leading-relaxed">
               Real-time satellite data provided by global weather models (NOAA GFS, DWD ICON, MeteoFrance).
               <div className="absolute left-1/2 -top-2 -translate-x-1/2 border-x-8 border-x-transparent border-b-8 border-b-[#1e201e]"></div>
             </div>
          </div>
        </div>

        {/* City Search & Pagination */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
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
              disabled={weekPage === 1}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${weekPage === 1 ? 'text-[#ababa8]/30 cursor-not-allowed' : 'text-[#faf9f5] hover:bg-[#474846]/40 cursor-pointer'}`}
              title="Next week"
            >
               <span className="material-symbols-outlined text-sm" translate="no">chevron_right</span>
            </button>
          </div>

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
        {isLoadingWeather || !weather ? (
          <div className="h-40 flex items-center justify-center">
             <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#aeee2a]/20 border-t-[#aeee2a]"></div>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 sm:gap-0 sm:grid sm:grid-cols-7 sm:divide-x divide-[#474846]/15 min-w-max sm:min-w-0 h-full">
            {/* Show 7 days based on weekPage */}
            {weather.time.slice(weekPage * 7, (weekPage + 1) * 7).map((date, relativeIdx) => {
              const idx = (weekPage * 7) + relativeIdx;
              const code = weather.weather_code[idx];
              const maxTemp = weather.temperature_2m_max[idx];
              const minTemp = weather.temperature_2m_min[idx];
              const precipProb = weather.precipitation_probability_max ? weather.precipitation_probability_max[idx] : 0;
              const weatherInfo = getWeatherIcon(code);
              
              const isToday = date === todayStr;

              return (
                <div key={date} className={`flex flex-col items-center justify-center py-6 px-4 sm:px-6 w-32 sm:w-auto shrink-0 transition-colors ${isToday ? "bg-[#aeee2a]/[0.06] shadow-inner" : ""}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-4">
                    <span className="text-xs font-black text-[#aeee2a]">
                      {new Date(date + "T00:00:00").getDate().toString().padStart(2, '0')}
                    </span>
                    <span className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isToday ? "text-[#aeee2a]" : "text-[#ababa8]"}`}>
                      {isToday ? "Today" : getDayName(date)}
                    </span>
                  </div>
                  
                  <span 
                    className={`material-symbols-outlined text-4xl sm:text-5xl mb-4 mix-blend-lighten drop-shadow-lg ${weatherInfo.color}`} 
                    translate="no"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {weatherInfo.icon}
                  </span>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xl font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                      {Math.round(maxTemp)}°
                    </span>
                    <span className="text-sm font-bold text-[#ababa8]/70">
                      {Math.round(minTemp)}°
                    </span>
                  </div>

                  {/* Precipitation Probability */}
                  <div className={`flex items-center gap-1 mt-2 transition-opacity ${precipProb > 0 ? 'text-blue-400 opacity-90' : 'text-[#ababa8] opacity-20'}`}>
                    <span className="material-symbols-outlined text-[13px]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
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
