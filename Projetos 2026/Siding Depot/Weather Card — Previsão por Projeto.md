---
tags:
  - siding-depot
  - projects
  - weather
  - open-meteo
  - componentes
created: 2026-04-21
updated: 2026-04-21
---

# 🌤️ Weather Card — Previsão por Projeto

> Voltar para [[Projects]] | [[🏗️ Siding Depot — Home]]

---

## O que é

Card de previsão do tempo exibido na página de detalhes de cada projeto (`/projects/[id]`), posicionado **entre o KPI Strip e as Tabs**, mostrando a previsão das **próximas 2 semanas** para a **cidade do projeto** automaticamente.

---

## Posicionamento na UI

```
┌────────────────────────────────────────────────────┐
│  [START DATE]  [END DATE]  [BLOCKERS]  [PEND. COs] │  ← KPI Strip
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│  📍 Marietta, Georgia                   [ < ] [ > ]│
│  ┌───┬───┬───┬───┬───┬───┬───┐                    │
│  │MON│TUE│WED│THU│FRI│SAT│SUN│  ← Weather Card    │
│  └───┴───┴───┴───┴───┴───┴───┘                    │
└────────────────────────────────────────────────────┘
┌──────────────────────────────────────┐
│  [OVERVIEW]  [CREWS]  [DOCUMENTS]    │  ← Tabs
└──────────────────────────────────────┘
```

---

## Localização dos Arquivos

| Arquivo | Papel |
|---------|-------|
| `web/components/ProjectWeatherCard.tsx` | Componente isolado e reutilizável |
| `web/app/(shell)/projects/[id]/page.tsx` | Página onde o card é usado |

---

## Como funciona (Fluxo técnico)

### 1. Fonte da Cidade

A cidade **não é digitada** — ela vem direto do banco de dados:

```typescript
// Tabela: jobs
// Colunas usadas: city (text), state (text)

// Na page.tsx, já carregado no fetchJob():
const mapped: JobDetail = {
  city:  j.city ?? "",
  state: j.state ?? "",
  ...
};
```

### 2. Geocoding (cidade → lat/lon)

Usa a **API de Geocoding do Open-Meteo** (gratuita, sem API Key):

```
GET https://geocoding-api.open-meteo.com/v1/search
  ?name=Marietta
  &count=5
  &language=en
  &format=json
```

**Lógica de seleção do resultado:**
- Prioriza resultado com `country_code === "US"` cujo `admin1` começa com o `state` do projeto
- Fallback: primeiro resultado da lista

### 3. Previsão do Tempo (14 dias)

Usa a **API Forecast do Open-Meteo** (gratuita, sem API Key):

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=33.9526
  &longitude=-84.5499
  &daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max
  &timezone=auto
  &temperature_unit=fahrenheit
  &past_days=7
  &forecast_days=14
```

**Por que `past_days=7`?**
O parâmetro `past_days=7` retorna 7 dias passados + hoje + 14 dias futuros.
Isso permite calcular o início correto da semana atual (segunda-feira) e exibir sempre semanas completas.

### 4. Alinhamento da Semana

```typescript
const currentToday = daily.time[7]; // índice 7 = hoje
const todayDate    = new Date(currentToday + "T12:00:00");
const dayOfWeek    = todayDate.getDay() || 7;  // 1=Seg ... 7=Dom
const startIdx     = 7 - (dayOfWeek - 1);      // índice da segunda-feira atual

// Fatia 14 dias a partir da segunda-feira desta semana
setWeather({
  time: daily.time.slice(startIdx, startIdx + 14),
  ...
});
```

### 5. Paginação de Semanas

O usuário pode navegar com `< >`:
- **Página 0** = semana atual (Seg → Dom)
- **Página 1** = próxima semana (Seg → Dom)

```typescript
const [weekPage, setWeekPage] = useState(0);
// Renderização:
weather.time.slice(weekPage * 7, (weekPage + 1) * 7)
```

---

## Props do Componente

```typescript
interface ProjectWeatherCardProps {
  city:  string;  // Ex: "Marietta"
  state: string;  // Ex: "GA"
}
```

**Uso na página:**
```tsx
<ProjectWeatherCard city={job.city ?? ""} state={job.state ?? ""} />
```

---

## Ícones de Clima (WMO Weather Code)

| Código WMO | Condição | Ícone Material | Cor |
|------------|----------|----------------|-----|
| `0` | Céu limpo | `sunny` | `text-amber-400` |
| `1`, `2` | Parcialmente nublado | `partly_cloudy_day` | `text-amber-200` |
| `3`, `45`, `48` | Nublado / Neblina | `cloudy` | `text-gray-400` |
| `51`–`82` | Chuva / Garoa / Aguaceiro | `rainy` | `text-blue-400` |
| `71`–`86` | Neve | `snowing` | `text-white` |
| `95`, `96`, `99` | Tempestade | `thunderstorm` | `text-purple-400` |

---

## Comportamento de Erro

| Situação | Comportamento |
|----------|---------------|
| Cidade vazia (`""`) | Componente não renderiza (retorna `null`) |
| Geocoding sem resultado | Exibe mensagem: "Could not load weather for [city]" com ícone `cloud_off` |
| Erro de rede | `console.error` + estado `geocodeError = true` → mensagem amigável |
| Loading | Spinner animado (`border-t-[#aeee2a]`) enquanto carrega |

---

## APIs Utilizadas

| API | URL Base | Custo | API Key |
|-----|----------|-------|---------|
| Open-Meteo Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | **Gratuita** | ❌ Não precisa |
| Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | **Gratuita** | ❌ Não precisa |

> **Limites**: Até 10.000 requests/dia. Para uso interno (admin only) o limite nunca será atingido.

---

## Decisões de Design

| Decisão | Motivo |
|---------|--------|
| **Sem campo de busca** | Cidade vem do projeto — busca manual causaria inconsistência |
| **Cada projeto tem seu próprio card** | O card é montado com `useEffect` na cidade do `job`, sem estado global |
| **Sem localStorage** | Ao contrário do `WeeklyWeather.tsx` global (que salva cidade), este é por projeto |
| **Componente separado** | Mantém a `page.tsx` limpa e permite reutilização futura em outros contextos |
| **Fahrenheit** | Padrão americano para uso na Georgia (EUA) |

---

## Diferença do WeeklyWeather.tsx (Componente Global)

| Feature | `WeeklyWeather.tsx` | `ProjectWeatherCard.tsx` |
|---------|---------------------|--------------------------|
| **Localização** | Dashboard/Home geral | Página de detalhes do projeto |
| **Cidade** | Salva em `localStorage`, usuário pode buscar | Fixo — vem do `job.city` no banco |
| **Campo de busca** | ✅ Sim | ❌ Não |
| **Por projeto** | ❌ Não (global) | ✅ Sim (isolado por job) |
| **Persistência** | `localStorage` | Sem estado persistido — refetch a cada abertura |

---

## Observações para Manutenção

> [!WARNING]
> Se o campo `city` do job estiver vazio ou com valor inválido (ex: "Pendente"), o geocoding retornará erro graciosamente. **Não quebra a página.**

> [!TIP]
> Para adicionar novos campos de clima (umidade, vento), basta adicionar os parâmetros na query `daily=` da API Forecast. Consulte: [open-meteo.com/en/docs](https://open-meteo.com/en/docs)

> [!NOTE]
> O componente usa `useEffect` com dependências `[city, state]` — se o admin editar o campo City na seção "Project Address" e salvar, o card **não** recarrega automaticamente (seria necessário refresh da página). Isso é intencional para evitar re-fetches desnecessários.

---

## Relacionados
- [[Projects]]
- [[Banco de Dados]]
- [[Design System]]
