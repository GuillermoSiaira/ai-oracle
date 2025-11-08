# Flujo de Interpretación: Abu → Lilly

Este documento explica cómo se orquesta la interpretación astrológica end-to-end usando Abu Engine (cálculo) y Lilly Engine (LLM).

## Arquitectura

```
Usuario/Frontend
      ↓
POST /api/astro/interpret (Abu)
      ↓
POST /analyze (Abu interno)
      ↓ (payload consolidado)
core.interpreter_llm.interpret_analysis
      ↓ (HTTP POST)
POST /api/ai/interpret (Lilly)
      ↓ (JSON: headline, narrative, actions, astro_metadata)
Response → Usuario/Frontend
```

## Endpoints

### 1) POST /api/astro/interpret (Abu Engine)

**Objetivo**: Endpoint único para obtener interpretación directa desde datos natales.

**Input**:
```json
{
  "birthDate": "1990-01-01T12:00:00Z",
  "lat": -34.6037,
  "lon": -58.3816,
  "language": "es"  // opcional (default: "es")
}
```

**Flujo interno**:
1. Valida parámetros (400 si faltan, 422 si fecha inválida).
2. Construye payload vía POST /analyze interno (chart + derived + life_cycles + forecast).
3. Llama a `core.interpreter_llm.interpret_analysis(payload, language)`.
4. Devuelve el JSON de Lilly tal cual.

**Respuesta (200)**:
```json
{
  "headline": "Ciclo de aprendizaje y transformación",
  "narrative": "La configuración actual sugiere un periodo de crecimiento personal...",
  "actions": [
    "Mantén un diario de reflexión personal",
    "Explora nuevas áreas de conocimiento",
    "Cultiva relaciones significativas"
  ],
  "astro_metadata": {
    "source": "openai",  // o "fallback" si no hay LLM
    "language": "es",
    "events": 3
  }
}
```

**Errores**:
- 400: Missing birthDate/lat/lon
- 422: Invalid date format
- 502: Lilly unreachable (timeout/conexión) o error interno de Lilly

**Logging**: Registra duración total del flujo en ms.

---

### 2) POST /analyze (Abu Engine, interno)

**Objetivo**: Componer todos los cálculos astrológicos en un único payload.

**Input**:
```json
{
  "person": { "name": null, "question": "" },
  "birth": { "date": "1990-01-01T12:00:00Z", "lat": -34.6037, "lon": -58.3816 },
  "current": { "lat": -34.6037, "lon": -58.3816, "date": null }
}
```

**Output** (extendido con life_cycles y forecast):
```json
{
  "person": { "name": null, "question": "" },
  "chart": {
    "planets": [ { "name": "Sun", "longitude": 280.95, "sign": "Capricorn", ... } ],
    "houses": { "houses": [...], "asc": 320.49, "mc": 224.96 }
  },
  "derived": {
    "sect": "nocturnal",
    "firdaria": { "current": { "major": "Mars", "sub": "South Node", ... } },
    "profection": { "house": 12 },
    "lunar_transit": { "moon_position": 65.74, "aspects": [...] }
  },
  "life_cycles": {
    "events": [
      { "cycle": "Saturn Return", "planet": "Saturn", "angle": 0, "approx": "2019-03-22" }
    ]
  },
  "forecast": {
    "timeseries": [ { "t": "2025-11-07", "F": 0.23 }, ... ],
    "peaks": [ { "t": "2026-08-12", "F": 0.89, "kind": "peak" }, ... ]
  },
  "question": ""
}
```

**Manejo de errores por bloque**:
- Si un bloque falla (ej: pyswisseph no disponible), devuelve `{"error": "module not available"}` en ese bloque y continúa con los demás.

---

### 3) POST /api/ai/interpret (Lilly Engine)

**Objetivo**: Generar interpretación narrativa en JSON a partir del payload de Abu.

**Input**:
```json
{
  "chart": {...},
  "derived": {...},
  "life_cycles": {...},
  "forecast": {...},
  "language": "es"
}
```

**Output**:
```json
{
  "headline": "...",
  "narrative": "...",
  "actions": ["...", "...", "..."],
  "astro_metadata": { "source": "openai" | "fallback", "language": "es", ... }
}
```

**Configuración**:
- Variable de entorno `OPENAI_API_KEY` en Lilly para usar GPT-4.
- Sin clave o con `USE_ASSISTANTS=false`, Lilly retorna fallback desde `archetypes.json`.

---

## Cliente interno: `core.interpreter_llm.interpret_analysis`

**Ubicación**: `abu_engine/core/interpreter_llm.py`

**Función**:
```python
def interpret_analysis(payload: Dict[str, Any], language: str = "es") -> Dict[str, Any]:
    """
    Envía el payload agregado de Abu a Lilly y devuelve la interpretación JSON.
    
    Args:
        payload: Output de /analyze (chart, derived, life_cycles, forecast).
        language: Idioma de la interpretación ("es", "en", "pt", "fr").
    
    Returns:
        dict con claves: headline, narrative, actions, astro_metadata.
        
    Raises:
        RuntimeError: si la respuesta de Lilly no cumple el contrato.
        
    Devuelve {"error": "Lilly unreachable"} si hay timeout/conexión.
    """
```

**Configuración**:
- Variable de entorno `LILLY_API_URL` (default: `http://lilly_engine:8001` para Docker Compose).
- Timeout: 15 segundos.

**Validación**:
- Verifica que la respuesta contenga las llaves requeridas: `headline`, `narrative`, `actions`, `astro_metadata`.
- Levanta `RuntimeError` si falta alguna clave o el JSON es inválido.

---

## Configuración y Variables de Entorno

### Abu Engine

| Variable | Default | Descripción |
|----------|---------|-------------|
| `LILLY_API_URL` | `http://lilly_engine:8001` | URL base de Lilly Engine (sin trailing slash) |

### Lilly Engine

| Variable | Default | Descripción |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | Clave API de OpenAI para GPT-4 (opcional; si no existe, usa fallback) |
| `USE_ASSISTANTS` | `true` | Usar OpenAI Assistants API (si `false`, usa archetypes) |
| `ABU_URL` | `http://abu_engine:8000` | URL de Abu Engine (para llamadas inversas si fueran necesarias) |

---

## Flujo de Datos Detallado

1. **Usuario envía POST a /api/astro/interpret**
   - Body: `{ birthDate, lat, lon, language? }`

2. **Abu valida entrada**
   - 400 si faltan parámetros
   - 422 si birthDate es inválido

3. **Abu construye payload consolidado**
   - Llama internamente a `analyze()` para obtener:
     - chart (planets + houses)
     - derived (sect, firdaria, profection, lunar_transit)
     - life_cycles (eventos mayores)
     - forecast (timeseries + peaks)

4. **Abu invoca cliente interno**
   - `interpret_analysis(payload, language)` POST a `{LILLY_API_URL}/api/ai/interpret`

5. **Lilly procesa y responde**
   - Con OPENAI_API_KEY: usa GPT-4 para generar interpretación personalizada
   - Sin OPENAI_API_KEY: usa fallback desde `archetypes.json`
   - Retorna JSON con headline/narrative/actions/astro_metadata

6. **Abu devuelve respuesta a usuario**
   - 200 con el JSON de Lilly
   - 502 si Lilly no responde o devuelve error

---

## Tests

### `abu_engine/tests/test_interpret_contract.py`

- `test_interpret_contract_shape()`: Verifica que la respuesta tenga las llaves requeridas (headline, narrative, actions, astro_metadata) cuando Lilly responde 200.
- `test_interpret_missing_params()`: Verifica que retorne 400 si faltan birthDate/lat/lon.
- `test_interpret_invalid_date()`: Verifica que retorne 422 si birthDate es inválido.

**Ejecución**:
```powershell
D:/projects/AI_Oracle/venv/Scripts/python.exe -m pytest -q d:/projects/AI_Oracle/abu_engine/tests/test_interpret_contract.py
```

### `abu_engine/tests/test_analyze_contract.py`

- Verifica que POST /analyze retorne el shape esperado (ampliado con life_cycles y forecast).

---

## Ejemplo de Uso

### Con PowerShell

```powershell
$body = @{
  birthDate = "1990-01-01T12:00:00Z"
  lat = -34.6037
  lon = -58.3816
  language = "es"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/astro/interpret `
  -Method POST `
  -ContentType 'application/json' `
  -Body $body | ConvertTo-Json -Depth 8
```

### Con curl

```bash
curl -X POST http://127.0.0.1:8000/api/astro/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate": "1990-01-01T12:00:00Z",
    "lat": -34.6037,
    "lon": -58.3816,
    "language": "es"
  }'
```

---

## Troubleshooting

### Error 502: Lilly unreachable

**Causa**: Lilly no está corriendo o `LILLY_API_URL` apunta a una URL incorrecta.

**Solución**:
1. Verificar que Lilly esté corriendo:
   ```powershell
   docker compose ps
   ```
2. Verificar logs de Lilly:
   ```powershell
   docker compose logs lilly_engine
   ```
3. Verificar conectividad desde Abu:
   ```powershell
   docker exec abu_engine curl -I http://lilly_engine:8001/
   ```

### Respuesta con `"source": "fallback"`

**Causa**: Lilly no tiene configurada `OPENAI_API_KEY` o `USE_ASSISTANTS=false`.

**Solución**:
1. Agregar `OPENAI_API_KEY` en `.env` o `docker-compose.yml`:
   ```yaml
   environment:
     - OPENAI_API_KEY=sk-...
   ```
2. Reiniciar Lilly:
   ```powershell
   docker compose restart lilly_engine
   ```

### Tests fallan con "module not available"

**Causa**: Dependencias faltantes (pyswisseph, skyfield) o efemérides no cargadas.

**Solución**:
1. Verificar que `de440s.bsp` esté en `abu_engine/data/`.
2. Rebuildar Abu:
   ```powershell
   docker compose up -d --build abu_engine
   ```

---

## Próximos Pasos

- **Caché de payloads**: Evitar recalcular el mismo payload si birthDate/lat/lon no cambian.
- **Streaming**: Implementar SSE para respuestas progresivas de Lilly (si OpenAI soporta streaming).
- **Multi-idioma**: Expandir soporte a pt/fr/en con prompts específicos en Lilly.
- **Validación con Zod/Pydantic**: Agregar schemas estrictos para payloads de entrada/salida.
