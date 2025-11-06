# Cálculos Clave para Abu (Astrología Persa)
**Objetivo:** documentar los cómputos que vuelven a Abu una app de **astrología persa** (clásica/medieval) y su mapeo a endpoints.

## 1) Dignidades y Debilidades (Esenciales)
- **Domicilio, Exaltación, Exilio, Caída** por signo y grado (tablas clásicas).  
- **Puntaje** por planeta según dignidad esencial (configurable).  
- **Salida JSON:** `planet.dignity = { kind, score }`

## 2) Casas y Ejes (ASC/MC)
- Cálculo de **ASC/MC** y **casas** (Placidus/otro), con `pyswisseph`.  
- Asignación de **casa** a cada planeta y **lotes**.  
- **Salida:** `houses[1..12]`, `planet.house`

## 3) Aspectos y Relaciones
- Aspectos mayores (0, 60, 90, 120, 180) y menores (30, 45, 135, 150, opcional).  
- **Orbes por planeta/aspecto** y **aplicación/separación**.  
- **Recepción (mutua/unidireccional)** y **sección** (diurna/nocturna).  
- **Salida:** `aspects[] = {a, b, type, orb, applying, reception}`

## 4) Condiciones Solares (Óptica)
- **Combustión** (< 8° del Sol), **bajo rayos** (< 17°), **cazimi** (< 0°17').  
- **Salida:** `planet.solar_condition = { state, distance_deg }`

## 5) Lotes/Partes
- **Fortuna (Pars Fortunae)**, **Espíritu (Pars Spiritus)**, y secundarios (Eros, Némesis...).  
- Fórmulas diurna/nocturna (depende de secta).  
- **Salida:** `lots = [{name, longitude, sign, degree, house}]`

## 6) Profecciones
- Avance anual del **Ascendente por signo** (y mensual opcional).  
- Determinación del **regente anual**.  
- **Salida:** `profections = { year, sign, lord }`

## 7) Fardars (Firdaria) & Hilaj
- **Periodos mayores** y **subperíodos** por planeta (secta diurna/nocturna).  
- **Hilaj/Alcocoden** (vida): requiere casas y reglas tradicionales.  
- **Salida:** `fardars = [{major, start, end, sub: [...] }]`

## 8) Revolución Solar (RS) y Reubicación
- Instante exacto del **retorno del Sol** al grado/minuto natal.  
- Cálculo de **RS reubicada** por lat/lon/zonahoraria.  
- **Comparativa** con la natal (cambios de ejes, angularidades).  
- **Salida:** `solar_return = {datetime, asc, mc, houses, planets, notes}`

## 9) Mansiones Lunares
- División en **28 mansiones** (12°51' aprox.) por longitud lunar.  
- Uso electivo y simbólico.  
- **Salida:** `lunar_mansion = { index, name, start, end, notes }`

## 10) Estrellas Fijas
- Catálogo (magnitud, naturaleza) y **orbes por magnitud**.  
- Conjunciones y parans básicos.  
- **Salida:** `fixed_stars[] = { star, mag, long, match, orb }`

---

## Endpoints propuestos (resumen)
- `GET /api/astro/chart`  
- `GET /api/astro/transits?date=...`  
- `GET /api/astro/solar-return?year=...&lat=...&lon=...`  
- `GET /api/astro/profections?year=...`  
- `GET /api/astro/fardars`  
- `GET /api/astro/lots`  
- `GET /api/astro/lunar-mansions`  
- `GET /api/astro/fixed-stars`  

---

## Esquema de respuesta recomendado (fragmento)
```json
{
  "asc": "Gemini 14°",
  "mc": "Aquarius 22°",
  "houses": [{"num":1,"cusp":"Gem 14°"}, ...],
  "planets": [
    {"name":"Sun","sign":"Gemini","deg":21.2,"house":1,
     "dignity":{"kind":"domicile","score":+5},
     "solar_condition":{"state":"under_beams","distance_deg":12.3}
    }
  ],
  "aspects":[{"a":"Sun","b":"Saturn","type":"square","orb":3.2,"applying":true,"reception":"mutual"}],
  "lots":[{"name":"Fortuna","sign":"Leo","deg":18.1,"house":3}],
  "profections":{"year":41,"sign":"Cancer","lord":"Moon"},
  "fardars":[{"major":"Venus","start":"2024-01-01","end":"2028-12-31","sub":[...]}],
  "lunar_mansion":{"index":11,"name":"Al Zubrah","start":...,"end":...},
  "fixed_stars":[{"star":"Regulus","mag":1.4,"long":"Leo 29°","match":true,"orb":0.8}]
}
```