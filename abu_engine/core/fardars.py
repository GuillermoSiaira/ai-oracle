"""
Fardars (Firdaria) - Períodos Planetarios Persas
Sistema de períodos mayores y subperíodos según secta (diurna/nocturna).
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict


# Secuencia de Fardars para carta DIURNA
DIURNAL_SEQUENCE = [
    ("Sun", 10),
    ("Venus", 8),
    ("Mercury", 13),
    ("Moon", 9),
    ("Saturn", 11),
    ("Jupiter", 12),
    ("Mars", 7),
    ("North Node", 3),
    ("South Node", 2),
]

# Secuencia de Fardars para carta NOCTURNA
NOCTURNAL_SEQUENCE = [
    ("Moon", 9),
    ("Saturn", 11),
    ("Jupiter", 12),
    ("Mars", 7),
    ("Sun", 10),
    ("Venus", 8),
    ("Mercury", 13),
    ("North Node", 3),
    ("South Node", 2),
]


def is_diurnal_chart(sun_longitude: float, asc_longitude: float) -> bool:
    """
    Determina si la carta es diurna o nocturna.
    Diurna: Sol sobre el horizonte.
    """
    sun_from_asc = (sun_longitude - asc_longitude) % 360
    return sun_from_asc < 180


def calculate_fardars(birth_date: datetime, is_diurnal: bool) -> List[Dict]:
    """
    Calcula los períodos de Fardars (75 años total).
    
    Args:
        birth_date: Fecha de nacimiento
        is_diurnal: True si es carta diurna, False si nocturna
    
    Returns:
        List[Dict]: [
            {
                "major": str (planeta),
                "years": int,
                "start": datetime,
                "end": datetime,
                "sub": [
                    {"planet": str, "start": datetime, "end": datetime},
                    ...
                ]
            },
            ...
        ]
    """
    sequence = DIURNAL_SEQUENCE if is_diurnal else NOCTURNAL_SEQUENCE
    
    fardars = []
    current_date = birth_date
    
    for major_planet, major_years in sequence:
        # Fecha de fin del período mayor
        end_date = current_date + timedelta(days=major_years * 365.25)
        
        # Calcular subperíodos
        sub_periods = calculate_sub_periods(
            major_planet, major_years, current_date, sequence
        )
        
        fardars.append({
            "major": major_planet,
            "years": major_years,
            "start": current_date.isoformat(),
            "end": end_date.isoformat(),
            "sub": sub_periods
        })
        
        current_date = end_date
    
    return fardars


def calculate_sub_periods(
    major_planet: str,
    major_years: int,
    start_date: datetime,
    sequence: List[tuple]
) -> List[Dict]:
    """
    Calcula los subperíodos dentro de un período mayor.
    
    Los subperíodos siguen la misma secuencia, empezando por el planeta mayor.
    La duración de cada subperíodo es proporcional a su duración normal.
    """
    # Crear secuencia rotada empezando por el planeta mayor
    major_index = next(i for i, (p, _) in enumerate(sequence) if p == major_planet)
    rotated = sequence[major_index:] + sequence[:major_index]
    
    # Total de años de todos los planetas (75)
    total_years = sum(years for _, years in sequence)
    
    sub_periods = []
    current_date = start_date
    
    for sub_planet, sub_base_years in rotated:
        # Duración proporcional del subperíodo
        sub_duration_years = (sub_base_years / total_years) * major_years
        sub_duration_days = sub_duration_years * 365.25
        
        end_date = current_date + timedelta(days=sub_duration_days)
        
        sub_periods.append({
            "planet": sub_planet,
            "start": current_date.isoformat(),
            "end": end_date.isoformat(),
            "duration_years": round(sub_duration_years, 2)
        })
        
        current_date = end_date
    
    return sub_periods


from core.cache import cache_firdaria


def get_current_fardar(
    birth_date: datetime,
    is_diurnal: bool,
    query_date: datetime = None
) -> Dict:
    """
    Obtiene el período de Fardar activo en una fecha dada.
    
    Args:
        birth_date: Fecha de nacimiento
        is_diurnal: True si es carta diurna
        query_date: Fecha a consultar (default: hoy)
    
    Returns:
        dict: {
            "major": str,
            "sub": str,
            "start": datetime,
            "end": datetime
        }
    """
    if query_date is None:
        query_date = datetime.utcnow()
    
    def _compute():
        fardars = calculate_fardars(birth_date, is_diurnal)
        for fardar in fardars:
            fardar_start = datetime.fromisoformat(fardar["start"])
            fardar_end = datetime.fromisoformat(fardar["end"])
            if fardar_start <= query_date < fardar_end:
                for sub in fardar["sub"]:
                    sub_start = datetime.fromisoformat(sub["start"])
                    sub_end = datetime.fromisoformat(sub["end"])
                    if sub_start <= query_date < sub_end:
                        return {
                            "major": fardar["major"],
                            "sub": sub["planet"],
                            "start": sub["start"],
                            "end": sub["end"],
                        }
        return {
            "major": "N/A",
            "sub": "N/A",
            "start": None,
            "end": None,
            "note": "Outside of 75-year Fardar cycle",
        }

    # Use caching wrapper
    return cache_firdaria(birth_date, query_date, is_diurnal, _compute)
