---
tags:
  - siding-depot
  - projects
  - weather
  - nws
  - componentes
created: 2026-04-21
updated: 2026-04-22
---

# 🌤️ Weather Card — Previsão por Projeto

> Voltar para [[Projects]] | [[🏗️ Siding Depot — Home]]

---

## O que é

Card de previsão do tempo exibido na página de detalhes de cada projeto (`/projects/[id]`) e no dashboard global, mostrando a previsão de **7 dias** para a **cidade do projeto** automaticamente.

---

## Fonte de Dados — NWS (National Weather Service) ✅

A partir de 22/04/2026, a fonte primária é o **NWS** — serviço oficial de meteorologia do governo americano (NOAA). É a mesma fonte usada por Weather.com e AccuWeather.

| Aspecto | NWS (Primário) | Open-Meteo (Fallback) |
|---------|----------------|----------------------|
| **Fonte** | Estações locais + radares NOAA | Modelos globais (ECMWF/GFS) |
| **Precisão** | **Máxima para EUA** | Boa |
| **Custo** | Gratuito | Gratuito |
| **API Key** | ❌ Não precisa | ❌ Não precisa |
| **Texto descritivo** | ✅ Ex: "Partly Cloudy" | ❌ Só código WMO |
| **Cobertura** | Somente EUA | Global |

> [!IMPORTANT]
> Se o NWS falhar (ex: timeout, manutenção), o sistema automaticamente usa Open-Meteo como fallback. O badge no header indica qual fonte está sendo usada: **"NWS Official"** ou **"Open-Meteo"**.

---

## Restrição Geográfica: Georgia Only 🍑

Todas as buscas de cidades são filtradas para **somente Georgia, US**:

```typescript
// Geocoding — filtro estrito
const georgiaResult = results.find(
  (r) => r.country_code === "US" && r.admin1?.toLowerCase() === "georgia"
);
```

**Motivo:** Siding Depot opera exclusivamente na Georgia. Isso evita resultados de outros estados ou países (ex: Marietta, México).

---

## Componentes

### 1. `ProjectWeatherCard.tsx` — Projeto Individual

| Feature | Detalhes |
|---------|----------|
| **Localização** | Página de detalhes do projeto (`/projects/[id]`) |
| **Cidade** | Fixa — vem de `job.city` e `job.state` do banco |
| **Busca** | ❌ Sem campo de busca (automático) |
| **Persistência** | Sem estado persistido — refetch a cada abertura |
| **Previsão** | 7 dias |
| **Texto descritivo** | ✅ Mostra "Partly Cloudy", "Chance Showers" (NWS) |

```tsx
// Uso na page.tsx:
<ProjectWeatherCard city={job.city ?? ""} state={job.state ?? ""} />
```

### 2. `WeeklyWeather.tsx` — Dashboard Global

| Feature | Detalhes |
|---------|----------|
| **Localização** | Dashboard/Home (`/(shell)/page.tsx`) |
| **Cidade** | Default: Marietta, GA — usuário pode buscar outra |
| **Busca** | ✅ Com autocomplete (filtrado para Georgia) |
| **Persistência** | `localStorage` (mantém cidade selecionada) |
| **Previsão** | 7 dias |

---

## Fluxo Técnico

### 1. Geocoding (cidade → coordenadas)

API: **Open-Meteo Geocoding** (gratuita)

```
GET https://geocoding-api.open-meteo.com/v1/search
  ?name=Marietta
  &count=10
  &language=en
  &format=json
```

Resultado filtrado: `country_code === "US"` && `admin1 === "Georgia"`

### 2. NWS Forecast (coordenadas → previsão)

**Passo 1 — Grid Point:**
```
GET https://api.weather.gov/points/33.9526,-84.5499
Headers: User-Agent: SidingDepot/1.0 (admin@sidingdepot.com)
```

**Passo 2 — Forecast:**
```
GET {properties.forecast}  // URL retornada pelo passo 1
```

Retorna 14 períodos (7 dias × day/night), incluindo:
- `temperature` (já em Fahrenheit)
- `shortForecast` (texto descritivo)
- `probabilityOfPrecipitation`

### 3. Fallback: Open-Meteo

Se NWS falhar:
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=33.9526
  &longitude=-84.5499
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
  &timezone=auto
  &temperature_unit=fahrenheit
  &forecast_days=7
```

---

## Mapeamento NWS → Ícones

O NWS retorna texto (`shortForecast`), não códigos numéricos. A função `nwsForecastToWmoCode()` converte:

| NWS Text (contém) | WMO Code | Ícone | Cor |
|-------------------|----------|-------|-----|
| "sunny", "clear" | `0` | `sunny` | `text-amber-400` |
| "mostly sunny" | `1` | `partly_cloudy_day` | `text-amber-200` |
| "partly" | `2` | `partly_cloudy_day` | `text-amber-200` |
| "cloudy", "overcast" | `3` | `cloudy` | `text-gray-400` |
| "fog" | `45` | `cloudy` | `text-gray-400` |
| "drizzle" | `51` | `rainy` | `text-blue-400` |
| "rain", "showers" | `61` | `rainy` | `text-blue-400` |
| "heavy rain" | `65` | `rainy` | `text-blue-400` |
| "snow", "blizzard" | `73` | `snowing` | `text-white` |
| "thunder", "tstorm" | `95` | `thunderstorm` | `text-purple-400` |

---

## Comportamento de Erro

| Situação | Comportamento |
|----------|---------------|
| Cidade vazia (`""`) | Componente não renderiza (retorna `null`) |
| Cidade não encontrada na Georgia | Exibe "Could not load weather" com ícone `cloud_off` |
| NWS falha | Fallback automático para Open-Meteo |
| Ambas APIs falham | Mensagem de erro amigável |
| Loading | Spinner animado |

---

## Decisões de Design

| Decisão | Motivo |
|---------|--------|
| **NWS como primário** | Fonte oficial mais precisa para EUA |
| **Open-Meteo como fallback** | Gratuito e confiável para quando NWS estiver fora |
| **Georgia only** | Empresa opera exclusivamente na Georgia |
| **Badge de fonte** | Transparência sobre qual fonte está sendo usada |
| **7 dias** | NWS fornece max 7 dias; suficiente para planejamento |
| **Texto descritivo** | NWS fornece "Partly Cloudy" etc — mais útil que só ícone |
| **Fahrenheit** | Padrão americano |

---

## Observações para Manutenção

> [!WARNING]
> O NWS exige um header `User-Agent` em todas as requisições. Se removido, a API retorna 403.

> [!NOTE]
> Se o campo `city` do job estiver vazio ou com valor inválido, o geocoding retornará erro graciosamente. **Não quebra a página.**

> [!TIP]
> O NWS cache é de ~1 hora. Não faz sentido fazer request mais frequente que isso.

---

## Relacionados
- [[Projects]]
- [[Dashboard]]
- [[Banco de Dados]]
- [[Design System]]
