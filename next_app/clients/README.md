# TypeScript Clients para AI Oracle

Clients type-safe para interactuar con Abu Engine (cálculos) y Lilly Engine (interpretación LLM).

## Instalación

```bash
cd next_app
npm install
```

## Configuración

Variables de entorno en `.env.local`:

```bash
NEXT_PUBLIC_ABU_URL=http://localhost:8000
NEXT_PUBLIC_LILLY_URL=http://localhost:8001
```

En Docker Compose, estos valores ya están configurados para usar los nombres de servicio.

## Uso

### Cliente Abu (Cálculos Astrológicos)

```typescript
import { analyze, interpret, getSolarReturn, searchCities } from "@/clients/abu";

// 1) Análisis completo (chart + derived + life_cycles + forecast)
const analysis = await analyze({
  birth: {
    date: "1990-01-01T12:00:00Z",
    lat: -34.6037,
    lon: -58.3816
  },
  current: {
    lat: -34.6037,
    lon: -58.3816
  }
});

console.log(analysis.chart.planets);
console.log(analysis.derived.sect); // "diurnal" | "nocturnal"
console.log(analysis.life_cycles?.events);
console.log(analysis.forecast?.peaks);

// 2) Interpretación end-to-end (cálculo + LLM en una sola llamada)
const interpretation = await interpret({
  birthDate: "1990-01-01T12:00:00Z",
  lat: -34.6037,
  lon: -58.3816,
  language: "es" // opcional: "es" | "en" | "pt" | "fr"
});

console.log(interpretation.headline);
console.log(interpretation.narrative);
interpretation.actions.forEach(action => console.log(`• ${action}`));

// 3) Solar Return
const solarReturn = await getSolarReturn(
  "1990-07-05T12:00:00Z",
  40.7128,
  -74.0060,
  2025
);

console.log(`Solar Return: ${solarReturn.solar_return_datetime}`);
console.log(`Score: ${solarReturn.score_summary.total_score}`);

// 4) Búsqueda de ciudades
const cities = await searchCities("Buenos");
// [{ city: "Buenos Aires", country: "Argentina", lat: -34.6, lon: -58.4 }]
```

### Cliente Lilly (Interpretación LLM directa)

**Nota**: Para la mayoría de los casos, usa `abu.interpret()` que orquesta todo el flujo. Este cliente es para casos avanzados donde ya tenés el payload calculado.

```typescript
import { analyze } from "@/clients/abu";
import { interpret } from "@/clients/lilly";

// Paso 1: Obtener análisis de Abu
const analysis = await analyze({
  birth: { date: "1990-01-01T12:00:00Z", lat: -34.6, lon: -58.4 },
  current: { lat: -34.6, lon: -58.4 }
});

// Paso 2: Enviar a Lilly para interpretación
const interpretation = await interpret(analysis, "es");

console.log(interpretation.headline);
```

## Manejo de Errores

Ambos clients lanzan errores tipados (`AbuApiError` / `LillyApiError`):

```typescript
import { interpret, AbuApiError } from "@/clients/abu";

try {
  const result = await interpret({
    birthDate: "1990-01-01T12:00:00Z",
    lat: -34.6,
    lon: -58.4
  });
  console.log(result.headline);
} catch (error) {
  if (error instanceof AbuApiError) {
    if (error.status === 502) {
      console.error("Lilly no está disponible");
    } else if (error.status === 422) {
      console.error("Formato de fecha inválido");
    } else {
      console.error(`Error de Abu: ${error.message}`);
    }
  } else {
    console.error("Error de red o desconocido");
  }
}
```

## Tipos TypeScript

Todos los tipos están en `types/contracts.ts`:

```typescript
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  InterpretRequest,
  InterpretResponse,
  SolarReturnResponse,
  Planet,
  House,
  LifeCycleEvent,
  Forecast,
} from "@/types/contracts";
```

### Tipos principales

- **AnalyzeResponse**: Respuesta completa de `/analyze`
  - `chart`: Planetas con dignidades + casas
  - `derived`: Secta, firdaria, profección, tránsito lunar
  - `life_cycles`: Eventos mayores (Saturn Return, etc.)
  - `forecast`: Serie temporal + picos

- **InterpretResponse**: Respuesta de `/api/astro/interpret`
  - `headline`: Título de la interpretación
  - `narrative`: Texto narrativo
  - `actions`: Lista de acciones sugeridas
  - `astro_metadata`: Metadata (source, language, etc.)

- **SolarReturnResponse**: Carta de Revolución Solar
  - `solar_return_datetime`: Momento exacto del retorno
  - `planets`: Posiciones planetarias
  - `aspects`: Aspectos entre planetas
  - `score_summary`: Score de favorabilidad

## Ejemplo: Componente React

```typescript
"use client";

import { useState } from "react";
import { interpret } from "@/clients/abu";
import type { InterpretResponse } from "@/types/contracts";

export function InterpretForm() {
  const [result, setResult] = useState<InterpretResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const interpretation = await interpret({
        birthDate: formData.get("birthDate") as string,
        lat: parseFloat(formData.get("lat") as string),
        lon: parseFloat(formData.get("lon") as string),
        language: "es"
      });
      
      setResult(interpretation);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input name="birthDate" type="datetime-local" required />
        <input name="lat" type="number" step="0.0001" required />
        <input name="lon" type="number" step="0.0001" required />
        <button type="submit" disabled={loading}>
          {loading ? "Calculando..." : "Interpretar"}
        </button>
      </form>

      {result && (
        <div>
          <h2>{result.headline}</h2>
          <p>{result.narrative}</p>
          <ul>
            {result.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Endpoints Disponibles

### Abu Engine (puerto 8000)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/analyze` | POST | Análisis completo (chart + derived + cycles + forecast) |
| `/api/astro/interpret` | POST | Interpretación end-to-end (cálculo + LLM) |
| `/api/astro/chart` | GET | Carta natal básica |
| `/api/astro/chart-detailed` | GET | Carta con dignidades y partes |
| `/api/astro/solar-return` | GET | Revolución Solar |
| `/api/astro/solar-return/ranking` | GET | Ranking de ciudades para RS |
| `/api/astro/forecast` | GET | Serie temporal de score |
| `/api/astro/life-cycles` | GET | Ciclos vitales mayores |
| `/api/cities/search` | GET | Búsqueda de ciudades |
| `/health` | GET | Health check |

### Lilly Engine (puerto 8001)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ai/interpret` | POST | Interpretación desde payload agregado |
| `/health` | GET | Health check |

## Próximos Pasos

1. **SWR/React Query**: Integrar con hooks para caché y revalidación automática
   ```bash
   npm install swr
   ```

2. **Zod schemas**: Agregar validación runtime de responses
   ```bash
   npm install zod
   ```

3. **Optimistic UI**: Mostrar loading states y manejar errores gracefully

4. **Retry logic**: Reintentar requests fallidos con backoff exponencial

## Referencias

- Documentación de contratos: `docs/Analyze_Endpoint_Contract.md`
- Flujo de interpretación: `docs/Interpret_Flow.md`
- Tipos compartidos: `next_app/types/contracts.ts`
