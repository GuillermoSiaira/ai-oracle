/**
 * Contratos de datos compartidos entre Abu Engine y Next.js frontend.
 * 
 * Estos tipos reflejan el contrato JSON documentado en docs/Analyze_Endpoint_Contract.md
 * y docs/Interpret_Flow.md.
 */

// ============================================================================
// Common types
// ============================================================================

export interface Location {
  lat: number;
  lon: number;
}

export interface Person {
  name?: string | null;
  question?: string;
}

// ============================================================================
// Chart types
// ============================================================================

export interface Dignity {
  domicile: boolean;
  exaltation: boolean;
  detriment: boolean;
  fall: boolean;
  peregrine: boolean;
  score: number;
}

export interface Planet {
  name: string;
  longitude: number;
  sign: string;
  degree_in_sign: number;
  formatted: string;
  dignity: Dignity;
  house: number | null;
}

export interface House {
  house: number; // 1..12
  start: number;
  end: number;
}

export interface HousesBlock {
  houses: House[];
  asc: number | null;
  mc: number | null;
}

export interface Aspect {
  planet: string;
  type: string;
  orb: number;
}

export interface LunarTransit {
  moon_position: number | null;
  aspects: Aspect[];
}

// ============================================================================
// Derived types
// ============================================================================

export interface FirdariaCurrent {
  major: string;
  sub: string;
  start: string;
  end: string;
}

export interface Firdaria {
  current: FirdariaCurrent | null;
}

export interface Profection {
  house: number | null;
}

export interface Derived {
  sect: "diurnal" | "nocturnal" | null;
  firdaria: Firdaria;
  profection: Profection;
  lunar_transit: LunarTransit;
}

// ============================================================================
// Life cycles types
// ============================================================================

export interface LifeCycleEvent {
  cycle: string;
  planet: string;
  angle: number;
  approx: string; // ISO date
}

export interface LifeCycles {
  events: LifeCycleEvent[];
}

export type LifeCyclesOrError = LifeCycles | { error: string };

// ============================================================================
// Forecast types
// ============================================================================

export interface ForecastPoint {
  t: string; // ISO date
  F: number;
}

export interface Peak {
  t: string; // ISO date
  F: number;
  kind: "peak" | "valley";
}

export interface Forecast {
  timeseries: ForecastPoint[];
  peaks: Peak[];
}

export type ForecastOrError = Forecast | { error: string };

// ============================================================================
// Analyze response (POST /analyze)
// ============================================================================

export interface AnalyzeResponse {
  person: Person;
  chart: {
    planets: Planet[];
    houses: HousesBlock;
  };
  derived: Derived;
  life_cycles: LifeCyclesOrError | null;
  forecast: ForecastOrError | null;
  question: string;
}

// ============================================================================
// Interpret response (POST /api/astro/interpret)
// ============================================================================

export interface AstroMetadata {
  source: "openai" | "fallback";
  language: string;
  events?: number;
  data_type?: string;
  [key: string]: any;
}

export interface InterpretResponse {
  headline: string;
  narrative: string;
  actions: string[];
  astro_metadata: AstroMetadata;
}

// ============================================================================
// Request types
// ============================================================================

export interface AnalyzeRequest {
  person?: Person;
  birth: {
    date: string; // ISO datetime
    lat: number;
    lon: number;
  };
  current: {
    lat: number;
    lon: number;
    date?: string; // ISO datetime, optional
  };
}

export interface InterpretRequest {
  birthDate: string; // ISO datetime
  lat: number;
  lon: number;
  language?: "es" | "en" | "pt" | "fr";
}

// ============================================================================
// Solar Return types
// ============================================================================

export interface SolarReturnPlanet {
  name: string;
  lon: number;
  sign: string;
  house: number | null;
}

export interface SolarReturnAspect {
  a: string;
  b: string;
  type: string;
  orb: number;
  angle: number;
}

export interface ScoreSummary {
  total_score: number;
  num_aspects: number;
  interpretation: string;
}

export interface SolarReturnResponse {
  solar_return_datetime: string;
  birth_date: string;
  location: Location;
  year: number;
  planets: SolarReturnPlanet[];
  aspects: SolarReturnAspect[];
  score_summary: ScoreSummary;
}
