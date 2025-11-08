# API Examples (Abu Engine)

Practical examples of requests and responses for main endpoints.

**💡 Full interactive documentation**: Visit `/docs` (Swagger UI) or `/redoc` (ReDoc) on the server to see inline examples, detailed fields, and test requests.

## Quick Reference
| Endpoint | Method | Use | Notes |
|----------|--------|-----|-------|
| `/analyze` | POST | Aggregated analysis | Uses birth + current; includes examples in /docs |
| `/analyze/contract` | GET | JSON Schema contract | UI validation |
| `/api/astro/interpret` | POST | Calculation + LLM orchestration | Fallback if Lilly down; see /docs for multi-language |
| `/api/astro/solar-return` | GET | Solar Return chart | Optional year |
| `/api/astro/forecast` | GET | Time series + peaks | Requires date range |
| `/api/astro/life-cycles` | GET | Major events (Saturn Return, etc.) | Only birthDate |

---
## 1. POST /analyze
**🔗 See full documentation in `/docs` with real examples from Buenos Aires (July 5 1978, 18:15)**

Minimal request:
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
Response (truncated):
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

### Common Errors
| Code | Reason |
|--------|--------|
| 400 | Missing parameters |
| 422 | Invalid date (format) |
| 500 | Internal error (individual block) |

---
## 2. GET /analyze/contract
**🔗 See full documentation in `/docs` with usage explanations (Zod, TypeScript, validation)**

Describes the exact JSON shape expected from `/analyze`.
```bash
curl http://localhost:8000/analyze/contract
```
Response (summary):
```json
{
  "title": "AnalyzeResponse",
  "type": "object",
  "required": ["chart", "derived"],
  "properties": { "chart": {"type":"object"}, "derived": {"type":"object"}, "life_cycles": {}, "forecast": {} }
}
```
Use this schema for frontend validation (Zod if desired).

---
## 3. POST /api/astro/interpret
**🔗 See full documentation in `/docs` with multi-language examples (es/en/pt/fr) and fallback behavior**

Minimal request:
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
Response (fallback example):
```json
{
  "headline": "Claridad y enfoque",
  "narrative": "La semana trae oportunidad de estructurar...",
  "actions": ["Organiza prioridades", "Revisa compromisos"],
  "astro_metadata": {"source": "fallback", "language": "es"}
}
```
### Errors
| Code | Reason |
|--------|--------|
| 422 | Invalid date |
| 502 | Lilly unavailable |

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
## 7. Cache Notes
- Planetary positions cache: TTL 12h (key by rounded minute + lat/lon).
- Firdaria cache: TTL 12h (key by birth_date day + query_date day + sect).
- `Cache hit/miss` logs visible if `ABU_VERBOSE=1`.

## 8. Frontend Integration (Quick Example)
```typescript
import { analyze } from "@/clients/abu";
const data = await analyze({
  birth: { date: "1990-01-01T12:00:00Z", lat: -34.6037, lon: -58.3816 },
  current: { lat: -34.6037, lon: -58.3816 }
});
console.log(data.derived.sect);
```

## 9. Troubleshooting
| Problem | Cause | Solution |
|----------|-------|----------|
| 422 in /analyze | Malformed date | Ensure Z suffix or offset | 
| 502 in /interpret | Lilly down | Check logs and OPENAI_API_KEY |
| Empty fields | Incomplete input | Send birth and current |
| No performance improvement | Cold cache | Repeat call to warm up |

---
## 10. Logging (Structured / Verbose)

Abu supports structured JSON logging when the environment variable `ABU_VERBOSE=1` is exported.

Format per line:
```json
{"ts":"2025-11-07T12:34:56.123456+00:00","level":"INFO","event":"analyze.blocks","meta":{"dur_ms":42.7,"chart_ms":3.1,"houses_ms":5.4,"positions_ms":8.2,"firdaria_ms":4.7,"profection_ms":1.9,"lunar_ms":2.3,"cycles_ms":6.0,"forecast_ms":10.8}}
```

Key events:
- `request`: Every HTTP request (path, method, status, dur_ms)
- `analyze.blocks`: Internal durations per calculation block
- `interpret.pipeline`: Times for analyze vs Lilly call
- Cache (hit/miss) already shown in verbose mode

Activate (PowerShell / Windows):
```powershell
$env:ABU_VERBOSE=1; uvicorn abu_engine.main:app --reload --port 8000
```

Deactivate:
```powershell
Remove-Item Env:ABU_VERBOSE; uvicorn abu_engine.main:app --reload --port 8000
```

Filter events with `jq`:
```bash
uvicorn abu_engine.main:app --port 8000 | jq 'select(.event=="analyze.blocks")'
```

Example filtering slow requests (>300 ms):
```bash
uvicorn abu_engine.main:app --port 8000 | jq 'select(.event=="request" and .meta.dur_ms>300)'
```

Production usage: collect only JSON and send to aggregator (Elastic, Loki, etc.). Format is line-oriented for easy parsing.

---
## References
- `docs/Analyze_Endpoint_Contract.md`
- `docs/Interpret_Flow.md`
- `next_app/types/contracts.ts`
