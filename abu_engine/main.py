# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import requests
import json
from pathlib import Path
from core.forecast import forecast_for_locations, forecast_timeseries, detect_peaks
from core.life_cycles import forecast_life_cycles
from core.chart import chart_json, ChartDTO, solar_return_chart, EphemerisSingleton
from core.extended_calc import (
    calculate_detailed_positions, 
    calculate_part_of_fortune,
    get_lunar_nodes,
    format_position,
    get_sign_name,
    normalize_lon
)
from core.solar_return_ranking import rank_solar_return_locations, RELOCATION_CITIES
import logging


def send_to_lilly(data: dict) -> dict:
    """Envía datos a Lilly Engine para interpretación."""
    try:
        response = requests.post(
            "http://lilly_engine:8001/api/ai/interpret",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        return response.json()
    except (requests.RequestException, ValueError):
        return {"error": "Lilly not available"}

app = FastAPI(title="Abu Engine")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # solo frontend local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"message": "Abu Engine is running correctly!"}


# Warm-up heavy resources on startup to avoid cold-start latency/errors
@app.on_event("startup")
async def warm_up():
    """Pre-carga efemérides y ejecuta cálculos ligeros para evitar 500 en primer hit."""
    try:
        logging.info("[Abu] Warm-up starting…")
        # Ensure SPICE kernel (de440s.bsp) is loaded
        EphemerisSingleton()

        # Run a tiny chart calculation to prime Skyfield internals
        from datetime import timezone
        sample_dt = datetime(1990, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        chart_json(-34.6, -58.4, sample_dt)

        # Also prime solar-return path (binary search + scoring)
        # Use a fixed year to keep it quick/predictable
        try:
            solar_return_chart(sample_dt, -34.6, -58.4, sample_dt.year + 1)
        except Exception:
            # If anything fails here, it's just warm-up; don't block startup
            pass
        logging.info("[Abu] Warm-up complete.")
    except Exception as e:
        logging.warning(f"[Abu] Warm-up failed: {e}")


@app.get(
    "/api/cities/search",
    response_model=None,
    responses={
        200: {
            "description": "Lista de ciudades que coinciden con la búsqueda",
            "content": {
                "application/json": {
                    "example": [
                        {"city": "Buenos Aires", "country": "Argentina", "lat": -34.6037, "lon": -58.3816},
                        {"city": "Madrid", "country": "España", "lat": 40.4168, "lon": -3.7038}
                    ]
                }
            }
        }
    }
)
def search_cities(q: str = Query("", description="Búsqueda de ciudad o país")):
    """
    Busca ciudades por nombre o país.
    Retorna hasta 20 resultados que coincidan con la query.
    """
    base_dir = Path(__file__).resolve().parent
    cities_file = base_dir / "data" / "cities.json"
    
    try:
        with open(cities_file, 'r', encoding='utf-8') as f:
            cities = json.load(f)
    except Exception as e:
        logging.error(f"[Abu] Error loading cities.json: {e}")
        return []
    
    if not q or len(q) < 2:
        # Return first 20 cities if no query
        return cities[:20]
    
    # Case-insensitive search in city or country name
    q_lower = q.lower()
    matches = [
        c for c in cities 
        if q_lower in c["city"].lower() or q_lower in c["country"].lower()
    ]
    
    return matches[:20]


@app.get(
    "/api/astro/forecast",
    response_model=None,
    responses={
        400: {"description": "Missing birthDate/lat/lon/start/end"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Serie temporal de pronóstico astrológico",
            "content": {
                "application/json": {
                    "example": {
                        "timeseries": [
                            {"t": "2026-01-01", "F": 0.23},
                            {"t": "2026-01-02", "F": 0.45}
                        ],
                        "peaks": [
                            {"t": "2026-08-12", "F": 0.89, "kind": "peak"},
                            {"t": "2027-03-04", "F": -0.72, "kind": "valley"}
                        ]
                    }
                }
            }
        }
    }
)
def forecast_timeseries_endpoint(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO (ej: 1990-01-01T12:00:00Z)"),
    lat: float = Query(..., description="Latitud en grados decimales"),
    lon: float = Query(..., description="Longitud en grados decimales"),
    start: str = Query(..., description="Fecha de inicio en formato ISO (ej: 2026-01-01T00:00:00Z)"),
    end: str = Query(..., description="Fecha de fin en formato ISO (ej: 2027-01-01T00:00:00Z)"),
    step: str = Query("1d", description="Paso temporal, por defecto 1d"),
    horizon: str = Query("year", description="Horizonte de pronóstico")
):
    """
    Serie temporal de pronóstico astrológico y detección de picos.
    """
    if not all([birthDate, lat, lon, start, end]):
        raise HTTPException(status_code=400, detail="Missing birthDate/lat/lon/start/end")
    try:
        birth_dt = datetime.fromisoformat(birthDate.replace("Z", "+00:00"))
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")
    result = forecast_timeseries(birth_dt, lat, lon, start_dt, end_dt, step, horizon)
    return result

@app.get(
    "/api/astro/life-cycles",
    responses={
        400: {"description": "Missing birthDate"},
        422: {"description": "Invalid date format"},
        500: {"description": "Cycle calculation error"},
        200: {
            "description": "Ciclos vitales planetarios",
            "content": {
                "application/json": {
                    "example": {
                        "events": [
                            {"cycle": "Saturn Return", "planet": "Saturn", "angle": 0, "approx": "2007-07-15"},
                            {"cycle": "Uranus Opposition", "planet": "Uranus", "angle": 180, "approx": "2020-03-12"}
                        ]
                    }
                }
            }
        }
    }
)
def life_cycles(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO (ej: 1990-01-01T12:00:00Z)")
):
    """
    Calcula los ciclos vitales mayores:
    - Saturn Return (~29, ~58 años)
    - Uranus Opposition (~42 años)
    - Neptune Square (~41 años)
    - Pluto Square (~37 años)
    - Chiron Return (~50 años)
    """
    if not birthDate:
        raise HTTPException(status_code=400, detail="Missing birthDate")
    try:
        # Calcular eventos astrológicos
        result = forecast_life_cycles(birthDate)
        
        # Obtener interpretación de Lilly
        lilly_response = send_to_lilly(result)
        
        # Devolver datos y su interpretación
        return {
            "astro_data": result,
            "interpretation": lilly_response
        }
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format")
    except Exception as e:
        raise HTTPException(status_code=500, detail="cycle calculation error")


@app.get(
    "/api/astro/chart",
    response_model=ChartDTO,
    responses={
        400: {"description": "Missing lat/lon/date"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Carta astral calculada",
            "content": {
                "application/json": {
                    "example": {
                        "datetime": "2026-07-05T12:00:00+00:00",
                        "location": {"lat": -34.6, "lon": -58.4},
                        "planets": [
                            {"name": "Sun", "lon": 103.12, "sign": "Cancer", "house": None},
                            {"name": "Mars", "lon": 92.0, "sign": "Cancer", "house": None}
                        ],
                        "aspects": [
                            {"a": "Sun", "b": "Mars", "type": "square", "orb": 1.2, "angle": 90}
                        ]
                    }
                }
            }
        }
    }
)
def get_chart(
    date: str = Query(..., description="Fecha y hora en formato ISO (ej: 2026-07-05T12:00:00Z)"),
    lat: float = Query(..., description="Latitud en grados decimales"),
    lon: float = Query(..., description="Longitud en grados decimales")
):
    """
    Obtiene la carta astral para una ubicación y fecha dadas.
    """
    if lat is None or lon is None or date is None:
        raise HTTPException(status_code=400, detail="Missing lat/lon/date")
    try:
        date_utc = datetime.fromisoformat(date.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")
    result = chart_json(lat, lon, date_utc)
    return result


@app.get(
    "/api/astro/chart-detailed",
    response_model=None,
    responses={
        400: {"description": "Missing lat/lon/date"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Carta astral con detalles completos: posiciones, dignidades, nodos, partes arábicas",
            "content": {
                "application/json": {
                    "example": {
                        "datetime": "2026-07-05T12:00:00+00:00",
                        "location": {"lat": -34.6, "lon": -58.4},
                        "planets": [
                            {
                                "name": "Sun",
                                "longitude": 103.12,
                                "sign": "Cancer",
                                "degree_in_sign": 13.12,
                                "formatted": "13°07' Cancer",
                                "house": 10,
                                "dignity": {
                                    "domicile": False,
                                    "exaltation": False,
                                    "detriment": False,
                                    "fall": False,
                                    "peregrine": True,
                                    "score": 0
                                }
                            }
                        ],
                        "aspects": [],
                        "arabic_parts": {
                            "part_of_fortune": {
                                "longitude": 245.67,
                                "sign": "Sagittarius",
                                "formatted": "25°40' Sagittarius"
                            }
                        },
                        "lunar_nodes": {
                            "north_node": {
                                "longitude": 123.45,
                                "sign": "Leo",
                                "formatted": "3°27' Leo"
                            },
                            "south_node": {
                                "longitude": 303.45,
                                "sign": "Aquarius",
                                "formatted": "3°27' Aquarius"
                            }
                        }
                    }
                }
            }
        }
    }
)
def get_chart_detailed(
    date: str = Query(..., description="Fecha y hora en formato ISO (ej: 2026-07-05T12:00:00Z)"),
    lat: float = Query(..., description="Latitud en grados decimales"),
    lon: float = Query(..., description="Longitud en grados decimales")
):
    """
    Obtiene la carta astral detallada con:
    - Posiciones exactas (grados, minutos)
    - Dignidades esenciales (domicilio, exaltación, caída, exilio)
    - Nodos lunares (Norte y Sur)
    - Partes arábicas (Parte de la Fortuna)
    - Asignación de casas (si houses están disponibles)
    """
    if lat is None or lon is None or date is None:
        raise HTTPException(status_code=400, detail="Missing lat/lon/date")
    try:
        date_utc = datetime.fromisoformat(date.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")
    
    # Get base chart (Skyfield positions and aspects)
    base_chart = chart_json(lat, lon, date_utc)

    # Build planets dict for extended calculations
    planets_dict = {p.name: p.lon for p in base_chart.planets}

    # Calculate lunar nodes (approximation in extended_calc)
    north_node_lon, south_node_lon = get_lunar_nodes(date_utc)
    planets_dict["North Node"] = north_node_lon
    planets_dict["South Node"] = south_node_lon

    # Calculate houses with pyswisseph (if available)
    houses_block = None
    asc_lon = None
    mc_lon = None
    try:
        from core.houses_swiss import calculate_houses, format_houses_output, HOUSE_SYSTEM_PLACIDUS
        houses_data = calculate_houses(date_utc, lat, lon, HOUSE_SYSTEM_PLACIDUS)
        houses_formatted = format_houses_output(houses_data)
        houses_block = houses_formatted
        asc_lon = houses_data["asc"]
        mc_lon = houses_data["mc"]
    except Exception as e:
        houses_block = {"note": f"Houses not available: {str(e)}"}

    # Get detailed positions (with dignities) and assign houses if available
    cusps = None
    if isinstance(houses_block, dict) and "houses" in houses_block:
        # houses_data["cusps"] is already a list of floats, not dicts
        cusps = houses_data.get("cusps")
    detailed_planets = calculate_detailed_positions(planets_dict, houses=cusps)

    # Calculate Part of Fortune with real Ascendant
    sun_lon = planets_dict.get("Sun", 0)
    moon_lon = planets_dict.get("Moon", 0)
    if asc_lon is None:
        asc_lon = 0.0
    # Determine sect (diurnal/nocturnal)
    try:
        from core.lots import is_diurnal
        is_day = is_diurnal(sun_lon, asc_lon)
    except Exception:
        is_day = True
    pof_lon = calculate_part_of_fortune(sun_lon, moon_lon, asc_lon, is_day_chart=is_day)

    response = {
        "datetime": base_chart.datetime,
        "location": base_chart.location,
        "planets": detailed_planets,
        "aspects": [a.dict() for a in base_chart.aspects],
        "arabic_parts": {
            "part_of_fortune": {
                "longitude": round(pof_lon, 4),
                "sign": get_sign_name(pof_lon),
                "formatted": format_position(pof_lon)
            }
        },
        "lunar_nodes": {
            "north_node": {
                "longitude": round(north_node_lon, 4),
                "sign": get_sign_name(north_node_lon),
                "formatted": format_position(north_node_lon)
            },
            "south_node": {
                "longitude": round(south_node_lon, 4),
                "sign": get_sign_name(south_node_lon),
                "formatted": format_position(south_node_lon)
            }
        }
    }
    if isinstance(houses_block, dict) and "houses" in houses_block:
        response["houses"] = houses_block["houses"]
        response["asc"] = houses_block["asc"]
        response["mc"] = houses_block["mc"]
        response["asc_longitude"] = asc_lon
        response["mc_longitude"] = mc_lon
    else:
        response["houses"] = houses_block
    return response


@app.get(
    "/api/astro/solar-return",
    response_model=None,
    responses={
        400: {"description": "Missing birthDate/lat/lon"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Solar Return chart calculated",
            "content": {
                "application/json": {
                    "example": {
                        "solar_return_datetime": "2025-07-05T14:23:45+00:00",
                        "birth_date": "1990-07-05T12:00:00+00:00",
                        "location": {"lat": 40.7128, "lon": -74.0060},
                        "year": 2025,
                        "planets": [
                            {"name": "Sun", "lon": 103.12, "sign": "Cancer", "house": None},
                            {"name": "Moon", "lon": 245.8, "sign": "Sagittarius", "house": None}
                        ],
                        "aspects": [
                            {"a": "Sun", "b": "Mars", "type": "trine", "orb": 2.1, "angle": 120}
                        ],
                        "score_summary": {
                            "total_score": 4.5,
                            "num_aspects": 3,
                            "interpretation": "favorable"
                        }
                    }
                }
            }
        }
    }
)
def get_solar_return(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO (ej: 1990-07-05T12:00:00Z)"),
    lat: float = Query(..., description="Latitud para el Solar Return"),
    lon: float = Query(..., description="Longitud para el Solar Return"),
    year: int = Query(None, description="Año del Solar Return (opcional, por defecto año actual)")
):
    """
    Calcula la carta de Solar Return (Revolución Solar).
    
    El Solar Return ocurre cuando el Sol transita regresa exactamente a su posición natal.
    Este endpoint calcula el momento preciso y genera la carta astral para ese instante.
    
    Ejemplo de request:
        GET /api/astro/solar-return?birthDate=1990-07-05T12:00:00Z&lat=40.7128&lon=-74.0060&year=2025
    
    Returns:
        JSON con:
        - solar_return_datetime: momento exacto del retorno solar
        - planets: posiciones planetarias en ese momento
        - aspects: aspectos entre planetas
        - score_summary: resumen de favorabilidad (total_score, num_aspects, interpretation)
    """
    if not birthDate or lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Missing birthDate/lat/lon")
    
    try:
        birth_dt = datetime.fromisoformat(birthDate.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid birthDate format")
    
    try:
        result = solar_return_chart(birth_dt, lat, lon, year)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solar return calculation error: {str(e)}")


@app.get(
    "/api/astro/solar-return/ranking",
    response_model=None,
    responses={
        400: {"description": "Missing birthDate"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Solar Return location ranking (Persian/Hellenistic astrology)",
            "content": {
                "application/json": {
                    "example": {
                        "top_recommendations": ["London", "Zurich", "Singapore"],
                        "rankings": [
                            {
                                "city": "London",
                                "coordinates": {"lat": 51.5074, "lon": -0.1278},
                                "region": "Europe",
                                "total_score": 67.5,
                                "breakdown": {
                                    "dignities": {"total": 28.0, "asc_ruler_dignity": {"planet": "Venus", "dignity": "domicile", "score": 10.0}},
                                    "angularity": {"total": 18.0, "angular_planets": [{"planet": "Jupiter", "house": 10, "score": 8}]},
                                    "solar_conditions": {"total": 10.0, "conditions": [{"planet": "Mercury", "state": "cazimi", "score": 10}]},
                                    "aspects_reception": {"total": 8.5, "aspects": []},
                                    "sect": {"total": 3.0, "sect": "diurnal", "jupiter_favorable": True}
                                },
                                "chart_summary": {
                                    "asc_sign": "Libra",
                                    "mc_sign": "Cancer",
                                    "solar_return_datetime": "2025-07-05T12:34:56+00:00"
                                }
                            }
                        ],
                        "criteria": "Persian/Hellenistic (dignities, angularity, sect, reception, solar conditions)",
                        "cities_analyzed": 16,
                        "year": 2025
                    }
                }
            }
        }
    }
)
def get_solar_return_ranking(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO (ej: 1990-07-05T12:00:00Z)"),
    year: int = Query(None, description="Año del Solar Return (opcional, por defecto año actual)"),
    cities: str = Query(None, description="Lista de ciudades separadas por comas (opcional, por defecto las 16 predefinidas)"),
    top_n: int = Query(3, description="Número de mejores recomendaciones a mostrar")
):
    """
    Ranking de ciudades para reubicación de Solar Return usando astrología persa.
    
    Calcula el Solar Return para cada ciudad candidata y las clasifica según:
    - **Dignidades esenciales (35%)**: domicilio, exaltación, destierro, caída de planetas clave
    - **Angularidad (25%)**: planetas benéficos en casas angulares (1, 4, 7, 10)
    - **Condiciones solares (15%)**: cazimi (+10), combustión (-10), bajo rayos (-5)
    - **Aspectos con recepción (15%)**: aspectos armónicos/tensos con recepción mutua
    - **Secta (10%)**: planetas sect en casas favorables
    
    Ciudades predefinidas (16 en total):
    - Fire: Dubai, Los Angeles, Barcelona, Sydney
    - Earth: Zurich, Singapore, Toronto, Copenhagen
    - Air: London, Amsterdam, San Francisco, Berlin
    - Water: Venice, Rio de Janeiro, Lisbon, Buenos Aires
    
    Ejemplo de request:
        GET /api/astro/solar-return/ranking?birthDate=1990-07-05T12:00:00Z&year=2025&cities=London,Paris,Tokyo&top_n=3
    
    Returns:
        JSON con:
        - top_recommendations: lista de nombres de ciudades mejor rankeadas
        - rankings: lista completa de ciudades con scores y breakdowns
        - criteria: descripción de criterios de clasificación
        - cities_analyzed: número total de ciudades analizadas
        - year: año del Solar Return
    """
    if not birthDate:
        raise HTTPException(status_code=400, detail="Missing birthDate")
    
    try:
        birth_dt = datetime.fromisoformat(birthDate.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid birthDate format")
    
    # Parse city names if provided
    city_names = None
    if cities:
        city_names = [c.strip() for c in cities.split(",")]
        # Validate that cities exist in our database
        invalid_cities = [c for c in city_names if c not in RELOCATION_CITIES]
        if invalid_cities:
            available = ", ".join(RELOCATION_CITIES.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid cities: {invalid_cities}. Available cities: {available}"
            )
    
    try:
        result = rank_solar_return_locations(birth_dt, year, city_names, top_n)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solar return ranking error: {str(e)}")


@app.get("/health")
def health_check():
    """
    Health check endpoint para monitoreo y orchestración.
    """
    return {
        "status": "healthy",
        "service": "Abu Engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get(
    "/api/astro/profections",
    response_model=None,
    responses={
        400: {"description": "Missing birthDate"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Profecciones anuales y mensuales",
            "content": {
                "application/json": {
                    "example": {
                        "year": 35,
                        "profected_sign": "Scorpio",
                        "time_lord": "Mars",
                        "sign_offset": 11,
                        "monthly": {
                            "month": 3,
                            "monthly_sign": "Aquarius",
                            "monthly_lord": "Saturn"
                        }
                    }
                }
            }
        }
    }
)
def get_profections(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO"),
    ascSign: str = Query(..., description="Signo del Ascendente natal (ej: Gemini, Leo, etc.)"),
    currentDate: str = Query(None, description="Fecha actual (opcional, por defecto hoy)")
):
    """
    Calcula las profecciones anuales y mensuales.
    
    La profección es un sistema de direcciones primarias donde el Ascendente
    avanza un signo por cada año de vida, determinando el "regente del año".
    """
    if not birthDate or not ascSign:
        raise HTTPException(status_code=400, detail="Missing birthDate or ascSign")
    
    try:
        birth_dt = datetime.fromisoformat(birthDate.replace("Z", "+00:00"))
        current_dt = None
        if currentDate:
            current_dt = datetime.fromisoformat(currentDate.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")
    
    try:
        from core.profections import calculate_annual_profection, calculate_monthly_profection
        
        annual = calculate_annual_profection(birth_dt, ascSign, current_dt)
        monthly = calculate_monthly_profection(birth_dt, ascSign, current_dt)
        
        return {
            **annual,
            "monthly": monthly
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profection calculation error: {str(e)}")


@app.get(
    "/api/astro/fardars",
    response_model=None,
    responses={
        400: {"description": "Missing birthDate"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Períodos de Fardars (Firdaria)",
            "content": {
                "application/json": {
                    "example": {
                        "fardars": [
                            {
                                "major": "Sun",
                                "years": 10,
                                "start": "1990-01-01T12:00:00",
                                "end": "2000-01-01T12:00:00",
                                "sub": [
                                    {"planet": "Sun", "start": "...", "end": "...", "duration_years": 1.33}
                                ]
                            }
                        ],
                        "current": {
                            "major": "Venus",
                            "sub": "Mercury",
                            "start": "...",
                            "end": "..."
                        }
                    }
                }
            }
        }
    }
)
def get_fardars(
    birthDate: str = Query(..., description="Fecha de nacimiento en formato ISO"),
    sunLon: float = Query(..., description="Longitud del Sol natal (para determinar secta)"),
    ascLon: float = Query(..., description="Longitud del Ascendente natal (para determinar secta)"),
    currentDate: str = Query(None, description="Fecha actual (opcional, por defecto hoy)")
):
    """
    Calcula los períodos de Fardars (Firdaria), un sistema de períodos planetarios persas.
    
    Cada planeta rige un período mayor (de 7 a 13 años), con subperíodos internos.
    La secuencia cambia según la carta sea diurna o nocturna.
    """
    if not birthDate or sunLon is None or ascLon is None:
        raise HTTPException(status_code=400, detail="Missing birthDate, sunLon, or ascLon")
    
    try:
        birth_dt = datetime.fromisoformat(birthDate.replace("Z", "+00:00"))
        current_dt = None
        if currentDate:
            current_dt = datetime.fromisoformat(currentDate.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")
    
    try:
        from core.fardars import calculate_fardars, get_current_fardar, is_diurnal_chart
        
        is_diurnal = is_diurnal_chart(sunLon, ascLon)
        fardars = calculate_fardars(birth_dt, is_diurnal)
        current = get_current_fardar(birth_dt, is_diurnal, current_dt)
        
        return {
            "fardars": fardars,
            "current": current,
            "is_diurnal": is_diurnal
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fardar calculation error: {str(e)}")


@app.get(
    "/api/astro/lots",
    response_model=None,
    responses={
        400: {"description": "Missing planet positions"},
        200: {
            "description": "Lotes (Partes) calculados",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "name": "Fortuna",
                            "longitude": 245.67,
                            "sign": "Sagittarius",
                            "degree": 25.7,
                            "house": 3
                        }
                    ]
                }
            }
        }
    }
)
def get_lots(
    sunLon: float = Query(..., description="Longitud del Sol"),
    moonLon: float = Query(..., description="Longitud de la Luna"),
    ascLon: float = Query(..., description="Longitud del Ascendente"),
    venusLon: float = Query(0, description="Longitud de Venus (opcional)"),
    mercuryLon: float = Query(0, description="Longitud de Mercurio (opcional)"),
    cusps: str = Query(None, description="Cúspides de casas (JSON array opcional)")
):
    """
    Calcula los Lotes (Partes) principales:
    - Fortuna (Pars Fortunae)
    - Espíritu (Pars Spiritus)
    - Eros
    - Necesidad (Némesis)
    """
    if sunLon is None or moonLon is None or ascLon is None:
        raise HTTPException(status_code=400, detail="Missing sunLon, moonLon, or ascLon")
    
    try:
        from core.lots import calculate_all_lots
        import json as json_lib
        
        planets = {
            "Sun": sunLon,
            "Moon": moonLon,
            "Venus": venusLon,
            "Mercury": mercuryLon
        }
        
        cusps_list = None
        if cusps:
            cusps_list = json_lib.loads(cusps)
        
        lots = calculate_all_lots(planets, ascLon, cusps_list)
        return lots
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lots calculation error: {str(e)}")


@app.get(
    "/api/astro/lunar-mansions",
    response_model=None,
    responses={
        400: {"description": "Missing moonLon"},
        200: {
            "description": "Mansión lunar calculada",
            "content": {
                "application/json": {
                    "example": {
                        "index": 11,
                        "name": "Al-Zubrah",
                        "start": 128.571,
                        "end": 141.428,
                        "nature": "fortunate",
                        "ruler": "Jupiter",
                        "position_in_mansion": 5.3
                    }
                }
            }
        }
    }
)
def get_lunar_mansion(
    moonLon: float = Query(..., description="Longitud de la Luna")
):
    """
    Determina la mansión lunar (Manzil árabe) según la posición de la Luna.
    
    Las 28 mansiones lunares dividen el zodíaco en segmentos de ~12°51'.
    """
    if moonLon is None:
        raise HTTPException(status_code=400, detail="Missing moonLon")
    
    try:
        from core.lunar_mansions import get_lunar_mansion, get_mansion_interpretation
        
        mansion = get_lunar_mansion(moonLon)
        interpretation = get_mansion_interpretation(mansion)
        
        return {
            **mansion,
            "interpretation": interpretation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lunar mansion calculation error: {str(e)}")


@app.get(
    "/api/astro/fixed-stars",
    response_model=None,
    responses={
        200: {
            "description": "Conjunciones con estrellas fijas",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "star": "Regulus",
                            "mag": 1.4,
                            "long": "Leo 29°",
                            "planet": "Sun",
                            "match": True,
                            "orb": 0.8,
                            "nature": "Mars-Jupiter",
                            "notes": "Corazón del León, realeza, honor, éxito"
                        }
                    ]
                }
            }
        }
    }
)
def get_fixed_stars(
    planets: str = Query(..., description="JSON array de planetas [{name, longitude}]")
):
    """
    Encuentra conjunciones con estrellas fijas principales.
    
    Catálogo incluye: Regulus, Aldebaran, Antares, Fomalhaut, Spica, Algol, Sirius, etc.
    Los orbes varían según la magnitud de la estrella.
    """
    try:
        from core.fixed_stars import get_all_fixed_star_contacts, format_fixed_stars_output
        import json as json_lib
        
        planets_list = json_lib.loads(planets)
        contacts = get_all_fixed_star_contacts(planets_list)
        formatted = format_fixed_stars_output(contacts)
        
        return formatted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fixed stars calculation error: {str(e)}")


@app.get(
    "/api/astro/transits",
    response_model=None,
    responses={
        400: {"description": "Missing parameters"},
        422: {"description": "Invalid date format"},
        200: {
            "description": "Tránsitos calculados",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "natal_planet": "Moon",
                            "transit_planet": "Saturn",
                            "aspect": "square",
                            "orb": 2.3,
                            "applying": True,
                            "exactness": "approaching"
                        }
                    ]
                }
            }
        }
    }
)
def get_transits(
    natalPlanets: str = Query(..., description="JSON array de planetas natales [{name, longitude}]"),
    date: str = Query(..., description="Fecha de los tránsitos en formato ISO"),
    lat: float = Query(..., description="Latitud"),
    lon: float = Query(..., description="Longitud"),
    includeMajorOnly: bool = Query(True, description="Filtrar solo planetas exteriores")
):
    """
    Calcula tránsitos comparando posiciones actuales con la carta natal.
    
    Detecta aspectos entre planetas en tránsito y planetas natales,
    indicando si son aplicativos o separativos.
    """
    if not natalPlanets or not date:
        raise HTTPException(status_code=400, detail="Missing natalPlanets or date")
    
    try:
        import json as json_lib
        natal_planets_list = json_lib.loads(natalPlanets)
        
        transit_dt = datetime.fromisoformat(date.replace("Z", "+00:00"))
        
        # Calcular posiciones de tránsito
        transit_chart = chart_json(lat, lon, transit_dt)
        transit_planets_list = [
            {
                "name": p.name,
                "longitude": p.lon,
                "speed": 0  # TODO: calcular velocidad real
            }
            for p in transit_chart.planets
        ]
        
        from core.transits import calculate_transits, filter_major_transits
        
        transits = calculate_transits(natal_planets_list, transit_planets_list)
        
        if includeMajorOnly:
            transits = filter_major_transits(transits, major_planets_only=True, max_orb=3.0)
        
        return transits
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transits calculation error: {str(e)}")
