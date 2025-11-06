# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import os
import warnings
from core.llm import generate_interpretation, Language
from core.assistants import generate_interpretation_assistants
from core.context_manager import save_context

class AstroData(BaseModel):
    events: Optional[List[Dict[str, Any]]] = None
    transits: Optional[List[Dict[str, Any]]] = None
    planets: Optional[List[Dict[str, Any]]] = None
    aspects: Optional[List[Dict[str, Any]]] = None
    timeseries: Optional[List[Dict[str, Any]]] = None
    peaks: Optional[List[Dict[str, Any]]] = None
    language: Optional[str] = "es"  # es, en, pt, fr
    question: Optional[str] = None  # Optional user question for language detection
    tone: Optional[str] = None      # Optional tone/style override

class InterpretResponse(BaseModel):
    abu_line: Optional[str] = None
    lilly_line: Optional[str] = None
    headline: str
    narrative: str
    actions: List[str]
    reasoning: Optional[str] = None
    astro_metadata: Dict[str, Any]

app = FastAPI(title="Lilly Engine - Interpretación Astrológica")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load archetypes from JSON file
archetypes = {}
try:
    archetypes_path = os.path.join(os.path.dirname(__file__), "archetypes.json")
    with open(archetypes_path, encoding="utf-8") as f:
        archetypes = json.load(f)
except Exception:
    archetypes = {}

@app.post(
    "/api/ai/interpret",
    response_model=InterpretResponse,
    responses={
        400: {"description": "Invalid input data"},
        200: {
            "description": "Astrological interpretation",
            "content": {
                "application/json": {
                    "example": {
                        "headline": "Learning and Growth Period",
                        "narrative": "Generated interpretation based on events.",
                        "actions": ["Action 1", "Action 2", "Action 3"],
                        "astro_metadata": {
                            "events": 5,
                            "source": "openai"
                        }
                    }
                }
            }
        }
    }
)
def interpret_astro_data(data: AstroData):
    """
    Interprets astrological data using OpenAI if available, falling back to archetypes.
    Includes source information in all responses.
    """
    try:
        num_events = len(data.events) if data.events else 0
        
        # Try OpenAI if we have an API key and some meaningful data
        use_assistants = os.getenv('USE_ASSISTANTS', 'false').lower() == 'true'
        if (api_key := os.getenv('OPENAI_API_KEY')) and (
            (data.events and len(data.events) > 0)
            or (data.transits and len(data.transits) > 0)
            or (data.planets and len(data.planets) > 0)
            or (data.aspects and len(data.aspects) > 0)
            or (data.timeseries and len(data.timeseries) > 0)
            or (data.peaks and len(data.peaks) > 0)
        ):
            try:
                # Map language to Language enum (support es, en, pt, fr)
                lang_map = {
                    "es": Language.ES,
                    "en": Language.EN,
                    "pt": Language.PT,
                    "fr": Language.FR
                }
                lang = lang_map.get(data.language, Language.ES)
                
                # Prefer events; fallback to transits; otherwise include other signals
                payload = (
                    data.events if (data.events and len(data.events) > 0)
                    else data.transits if (data.transits and len(data.transits) > 0)
                    else data.aspects if (data.aspects and len(data.aspects) > 0)
                    else data.planets if (data.planets and len(data.planets) > 0)
                    else data.timeseries if (data.timeseries and len(data.timeseries) > 0)
                    else data.peaks if (data.peaks and len(data.peaks) > 0) else []
                )

                # Map life-cycle style events (with 'cycle') into LLM Event schema
                # Expected by LLM Event dataclass: {"type", "planet", "to", "angle?", "peak?"}
                if isinstance(payload, list) and payload and isinstance(payload[0], dict) and 'cycle' in payload[0]:
                    mapped = []
                    for e in payload:
                        cycle = (e.get('cycle') or '').lower()
                        planet = e.get('planet') or 'Unknown'
                        # Derive a simple event type and target
                        if 'return' in cycle:
                            etype = 'return'
                            target = planet
                        elif 'opposition' in cycle:
                            etype = 'opposition'
                            target = planet
                        elif 'square' in cycle:
                            etype = 'square'
                            target = planet
                        else:
                            etype = cycle.replace(' ', '_') or 'event'
                            target = planet
                        mapped.append({
                            'type': etype,
                            'planet': planet,
                            'to': target,
                            'angle': e.get('angle'),
                            'peak': e.get('approx')
                        })
                    payload = mapped

                # Extract a simple chart summary from planets (if available)
                chart_summary = {}
                if data.planets:
                    try:
                        sun = next((p for p in data.planets if p.get("name") == "Sun"), None)
                        moon = next((p for p in data.planets if p.get("name") == "Moon"), None)
                        chart_summary = {
                            "sun": (sun or {}).get("sign"),
                            "moon": (moon or {}).get("sign"),
                            "asc": None
                        }
                    except Exception:
                        chart_summary = {}
                
                if use_assistants:
                    # Use Assistants API path with tool-calling to Abu
                    llm_response = generate_interpretation_assistants(
                        events=payload,
                        language=data.language or "es",
                        question=data.question,
                        tone=data.tone or "psicológico"
                    )
                else:
                    # Classic Chat Completions path
                    llm_response = generate_interpretation(
                        payload,
                        lang=lang,
                        user_name="anonymous",
                        chart_data=chart_summary or None,
                        question=data.question,
                        tone=data.tone or "psicológico"
                    )
                
                if llm_response:
                    # Preserve source if provided by the LLM path; otherwise set based on mode
                    src = llm_response.get("astro_metadata", {}).get("source")
                    if not src:
                        llm_response.setdefault("astro_metadata", {})["source"] = "assistants" if use_assistants else "openai"
                    return llm_response
                    
            except Exception as e:
                warnings.warn(f"OpenAI API error: {str(e)}. Falling back to archetypes.")
        
        # Fallback to archetype-based interpretation
        matched = None
        if data.events:
            for event in data.events:
                cycle = event.get("cycle")
                if cycle and cycle in archetypes:
                    matched = archetypes[cycle]
                    break
        
        # If we found a matching archetype, use it
        if matched:
            result = {
                "headline": matched["theme"],
                "narrative": f"Keywords: {', '.join(matched['keywords'])}. Tone: {matched['tone']}",
                "actions": [f"Reflect on: {kw}" for kw in matched["keywords"]],
                "astro_metadata": {
                    "events": num_events,
                    "matched_cycle": cycle,
                    "tone": matched["tone"],
                    "source": "fallback",
                    "data_type": "archetype"
                }
            }
            # Save to context memory as well
            try:
                save_context(
                    user="anonymous",
                    entry={
                        "language": data.language or "es",
                        "headline": result["headline"],
                        "narrative": result["narrative"],
                        "chart_summary": {}
                    }
                )
            except Exception:
                pass
            return result
        
        # Default response if no match found
        data_type = (
            "events" if (data.events and len(data.events) > 0)
            else "transits" if (data.transits and len(data.transits) > 0)
            else "chart" if data.planets
            else "forecast" if data.timeseries
            else "unknown"
        )
        
        result = {
            "headline": "Period of Learning and Growth",
            "narrative": f"Identified {num_events} significant astrological events suggesting a period of transformation.",
            "actions": [
                "Keep a personal reflection journal",
                "Explore new areas of knowledge",
                "Cultivate meaningful relationships"
            ],
            "astro_metadata": {
                "events": num_events,
                "data_type": data_type,
                "source": "fallback"
            }
        }
        # Save to context memory (generic fallback)
        try:
            save_context(
                user="anonymous",
                entry={
                    "language": data.language or "es",
                    "headline": result["headline"],
                    "narrative": result["narrative"],
                    "chart_summary": {}
                }
            )
        except Exception:
            pass
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def root():
    return {"message": "Lilly Engine is running correctly!"}


class SolarReturnData(BaseModel):
    """Solar Return chart data for relocation analysis."""
    natal_chart: Dict[str, Any]
    solar_chart: Dict[str, Any]
    language: Optional[str] = "es"


class SolarReturnResponse(BaseModel):
    """Solar Return interpretation with relocation suggestions."""
    best_locations: List[str]
    location_details: List[Dict[str, Any]]
    reasoning: str
    natal_ascendant: Dict[str, Any]
    solar_ascendant: Dict[str, Any]
    astro_metadata: Dict[str, Any]


@app.post(
    "/api/ai/solar-return",
    response_model=SolarReturnResponse,
    responses={
        400: {"description": "Invalid chart data"},
        200: {
            "description": "Solar Return interpretation with relocation suggestions",
            "content": {
                "application/json": {
                    "example": {
                        "best_locations": ["Lisbon", "Rio de Janeiro", "Venice"],
                        "location_details": [
                            {
                                "city": "Lisbon",
                                "coordinates": {"lat": 38.7223, "lon": -9.1393},
                                "element": "water",
                                "region": "Europe",
                                "compatibility": "high"
                            }
                        ],
                        "reasoning": "El Ascendente natal... suggests favorable energies.",
                        "natal_ascendant": {"sign": "Cancer", "element": "water"},
                        "solar_ascendant": {"sign": "Pisces", "element": "water"},
                        "astro_metadata": {
                            "source": "heuristic",
                            "model": None,
                            "language": "es",
                            "cities_analyzed": 16
                        }
                    }
                }
            }
        }
    }
)
def interpret_solar_return_endpoint(data: SolarReturnData):
    """
    Interprets a Solar Return chart and suggests favorable relocation options.
    
    Compares natal and solar return Ascendants, analyzing elements and modes.
    Returns 2-3 geographic locations where the solar return chart would be
    more favorable based on Ascendant shifts.
    
    Args:
        data: Solar return data including natal_chart, solar_chart, and language
    
    Returns:
        Solar return interpretation with best_locations and reasoning
    """
    try:
        from lilly_engine.core.solar_return import interpret_solar_return
        
        result = interpret_solar_return(
            natal_chart=data.natal_chart,
            solar_chart=data.solar_chart,
            language=data.language
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error interpreting solar return: {str(e)}"
        )