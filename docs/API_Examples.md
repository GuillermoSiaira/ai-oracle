# API Examples (Abu Engine)

Ejemplos prácticos de requests y responses para los endpoints principales.

## Tabla rápida
| Endpoint | Método | Uso | Notas |
|----------|--------|-----|-------|
| `/analyze` | POST | Análisis agregado | Usa birth + current |
| `/analyze/contract` | GET | JSON Schema del contrato | Validación UI |
| `/api/astro/interpret` | POST | Orquestación cálculo + LLM | Fallback si Lilly cae |
| `/api/astro/solar-return` | GET | Carta de Revolución Solar | Año opcional |
| `/api/astro/forecast` | GET | Serie temporal + picos | Requiere rango fechas |
| `/api/astro/life-cycles` | GET | Eventos mayores (Saturn Return, etc.) | Sólo birthDate |

---
## 1. POST /analyze
Request mínimo:
```json
{
  "birth": { "date": "1990-01-01T12:00:00Z", "lat": -34.6037, "lon": -58.3816 },
  "current": { "lat": -34.6037, "lon": -58.3816 }
}
```
Curl:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"birth":{"date":"1990-01-01T12:00:00Z","lat":-34.6037,"lon":-58.3816},"current":{"lat":-34.6037,"lon":-58.3816}}'
```
Respuesta (recortada):
```json
{
  "chart": {
    "planets": [ { "name": "Sun", "lon": 280.12, "sign": "Capricorn" } ],
    "houses": [ { "number": 1, "cusp_lon": 120.55, "sign": "Cancer" } ]
  },
  "derived": {
    "sect": "diurnal",
    "firdaria": {"current": {"major": "Sun", "minor": "Venus", "start": "2024-01-01", "end": "2026-01-01"}},
    "profection": {"age": 35, "house": 12, "sign": "Pisces", "lord": "Jupiter"},
    "lunar_transit": {"moon_sign": "Gemini", "moon_house": 3}
  },
  "life_cycles": {"events": [ {"cycle": "Saturn Return", "planet": "Saturn", "angle": 0, "approx": "2024-07-15"} ]},
  "forecast": {"peaks": [ {"date": "2025-01-02T00:00:00Z", "score": 0.82, "type": "high"} ] }
}
```

### Errores comunes
| Código | Motivo |
|--------|--------|
| 400 | Parámetros faltantes |
| 422 | Fecha inválida (formato) |
| 500 | Error interno (bloque individual) |

---
## 2. GET /analyze/contract
Describe la forma exacta del JSON esperado de `/analyze`.
```bash
curl http://localhost:8000/analyze/contract
```
Respuesta (resumen):
```json
{
  "title": "AnalyzeResponse",
  "type": "object",
  "required": ["chart", "derived"],
  "properties": { "chart": {"type":"object"}, "derived": {"type":"object"}, "life_cycles": {}, "forecast": {} }
}
```
Usar este schema para validar en frontend (Zod si se desea).

---
## 3. POST /api/astro/interpret
Request mínimo:
```json
{
  "birthDate": "1990-01-01T12:00:00Z",
  "lat": -34.6037,
  "lon": -58.3816,
  "language": "es"
}
```
Curl:
```bash
curl -X POST http://localhost:8000/api/astro/interpret \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1990-01-01T12:00:00Z","lat":-34.6037,"lon":-58.3816,"language":"es"}'
```
Respuesta (fallback ejemplo):
```json
{
  "headline": "Claridad y enfoque",
  "narrative": "La semana trae oportunidad de estructurar...",
  "actions": ["Organiza prioridades", "Revisa compromisos"],
  "astro_metadata": {"source": "fallback", "language": "es"}
}
```
### Errores
| Código | Motivo |
|--------|--------|
| 422 | Fecha inválida |
| 502 | Lilly no disponible |

---
## 4. GET /api/astro/solar-return
Ejemplo:
```bash
curl "http://localhost:8000/api/astro/solar-return?birthDate=1990-01-01T12:00:00Z&lat=-34.6037&lon=-58.3816&year=2025"
```
Respuesta (recortada):
```json
{
  "solar_return_datetime": "2025-01-01T11:55:42Z",
  "planets": [ {"name": "Sun", "lon": 280.10, "sign": "Capricorn"} ],
  "aspects": [ {"a": "Sun", "b": "Moon", "type": "trine"} ],
  "score_summary": {"total_score": 2.4, "num_aspects": 5, "interpretation": "favorable"}
}
```

---
## 5. GET /api/astro/forecast
```bash
curl "http://localhost:8000/api/astro/forecast?birthDate=1990-01-01T12:00:00Z&lat=-34.6037&lon=-58.3816&start=2025-01-01T00:00:00Z&end=2025-02-01T00:00:00Z&step=1d"
```
Respuesta (recortada):
```json
{
  "timeseries": [ {"date": "2025-01-01T00:00:00Z", "score": 0.12} ],
  "peaks": [ {"date": "2025-01-12T00:00:00Z", "score": 0.77, "type": "high"} ]
}
```

---
## 6. GET /api/astro/life-cycles
```bash
curl "http://localhost:8000/api/astro/life-cycles?birthDate=1990-01-01T12:00:00Z"
```
Respuesta:
```json
{
  "events": [
    {"cycle": "Saturn Return", "planet": "Saturn", "angle": 0, "approx": "2024-07-15"},
    {"cycle": "Uranus Opposition", "planet": "Uranus", "angle": 180, "approx": "2030-03-12"}
  ]
}
```

---
## 7. Notas sobre Caché
- Planetary positions cache: TTL 12h (clave por minuto redondeado + lat/lon).
- Firdaria cache: TTL 12h (clave por birth_date día + query_date día + secta).
- Logs `Cache hit/miss` visibles si `ABU_VERBOSE=1`.

## 8. Integración Frontend (Ejemplo rápido)
```typescript
import { analyze } from "@/clients/abu";
const data = await analyze({
  birth: { date: "1990-01-01T12:00:00Z", lat: -34.6037, lon: -58.3816 },
  current: { lat: -34.6037, lon: -58.3816 }
});
console.log(data.derived.sect);
```

## 9. Troubleshooting
| Problema | Causa | Solución |
|----------|-------|----------|
| 422 en /analyze | Fecha mal formateada | Asegurar sufijo Z o offset | 
| 502 en /interpret | Lilly caído | Revisar logs y OPENAI_API_KEY |
| Campos vacíos | Input incompleto | Enviar birth y current |
| No mejora performance | Cache frío | Repetir llamada para calentar |

---
## Referencias
- `docs/Analyze_Endpoint_Contract.md`
- `docs/Interpret_Flow.md`
- `next_app/types/contracts.ts`
