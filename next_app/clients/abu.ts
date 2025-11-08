/**
 * TypeScript client for Abu Engine (astrological calculations).
 * 
 * Provides type-safe functions to interact with Abu endpoints:
 * - analyze(): Get comprehensive natal analysis
 * - interpret(): Get LLM interpretation (via Abu → Lilly)
 * - getSolarReturn(): Get solar return chart
 * - getChart(): Get basic natal chart
 * 
 * Configuration:
 * - Base URL from env: NEXT_PUBLIC_ABU_URL (default: http://localhost:8000)
 * 
 * All functions throw on network errors or non-2xx responses.
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  InterpretRequest,
  InterpretResponse,
  SolarReturnResponse,
} from "@/types/contracts";

const ABU_BASE_URL = process.env.NEXT_PUBLIC_ABU_URL || "http://localhost:8000";

/**
 * Custom error class for Abu API errors.
 */
export class AbuApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = "AbuApiError";
  }
}

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchAbu<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${ABU_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new AbuApiError(
        errorBody.detail || `Abu API error: ${response.status}`,
        response.status,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AbuApiError) {
      throw error;
    }
    throw new AbuApiError(
      `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
      0
    );
  }
}

/**
 * Get comprehensive natal analysis (chart + derived + life_cycles + forecast).
 * 
 * @param payload - Analysis request with birth data and current location
 * @returns Complete analysis payload
 * @throws AbuApiError on validation or network errors
 * 
 * @example
 * ```ts
 * const analysis = await analyze({
 *   birth: {
 *     date: "1990-01-01T12:00:00Z",
 *     lat: -34.6037,
 *     lon: -58.3816
 *   },
 *   current: {
 *     lat: -34.6037,
 *     lon: -58.3816
 *   }
 * });
 * ```
 */
export async function analyze(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {
  return fetchAbu<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Get LLM interpretation of natal chart (Abu → Lilly flow).
 * 
 * This endpoint orchestrates the full calculation + interpretation flow internally.
 * Returns structured JSON with headline, narrative, and action items.
 * 
 * @param request - Birth data and optional language
 * @returns Interpretation with headline, narrative, actions, and metadata
 * @throws AbuApiError (502 if Lilly is unreachable)
 * 
 * @example
 * ```ts
 * const interpretation = await interpret({
 *   birthDate: "1990-01-01T12:00:00Z",
 *   lat: -34.6037,
 *   lon: -58.3816,
 *   language: "es"
 * });
 * 
 * console.log(interpretation.headline);
 * console.log(interpretation.narrative);
 * interpretation.actions.forEach(action => console.log(`- ${action}`));
 * ```
 */
export async function interpret(
  request: InterpretRequest
): Promise<InterpretResponse> {
  return fetchAbu<InterpretResponse>("/api/astro/interpret", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get Solar Return chart for a specific year.
 * 
 * @param birthDate - Birth datetime (ISO format)
 * @param lat - Latitude for Solar Return calculation
 * @param lon - Longitude for Solar Return calculation
 * @param year - Year for Solar Return (optional, defaults to current year)
 * @returns Solar Return chart with planets, aspects, and score
 * @throws AbuApiError on validation or calculation errors
 * 
 * @example
 * ```ts
 * const sr = await getSolarReturn(
 *   "1990-07-05T12:00:00Z",
 *   40.7128,
 *   -74.0060,
 *   2025
 * );
 * 
 * console.log(`Solar Return: ${sr.solar_return_datetime}`);
 * console.log(`Score: ${sr.score_summary.total_score}`);
 * ```
 */
export async function getSolarReturn(
  birthDate: string,
  lat: number,
  lon: number,
  year?: number
): Promise<SolarReturnResponse> {
  const params = new URLSearchParams({
    birthDate,
    lat: lat.toString(),
    lon: lon.toString(),
    ...(year && { year: year.toString() }),
  });

  return fetchAbu<SolarReturnResponse>(
    `/api/astro/solar-return?${params.toString()}`
  );
}

/**
 * Get basic natal chart (positions + aspects).
 * 
 * @param date - Chart datetime (ISO format)
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Chart with planets and aspects
 * @throws AbuApiError on validation errors
 * 
 * @example
 * ```ts
 * const chart = await getChart(
 *   "2026-07-05T12:00:00Z",
 *   -34.6,
 *   -58.4
 * );
 * 
 * chart.planets.forEach(p => {
 *   console.log(`${p.name}: ${p.formatted}`);
 * });
 * ```
 */
export async function getChart(
  date: string,
  lat: number,
  lon: number
): Promise<any> {
  const params = new URLSearchParams({
    date,
    lat: lat.toString(),
    lon: lon.toString(),
  });

  return fetchAbu<any>(`/api/astro/chart?${params.toString()}`);
}

/**
 * Search cities for location autocomplete.
 * 
 * @param query - Search term (city or country name)
 * @returns List of matching cities with coordinates
 * @throws AbuApiError on network errors
 * 
 * @example
 * ```ts
 * const cities = await searchCities("Buenos");
 * // [{ city: "Buenos Aires", country: "Argentina", lat: -34.6, lon: -58.4 }]
 * ```
 */
export async function searchCities(
  query: string
): Promise<Array<{ city: string; country: string; lat: number; lon: number }>> {
  const params = new URLSearchParams({ q: query });
  return fetchAbu<any>(`/api/cities/search?${params.toString()}`);
}

/**
 * Health check for Abu Engine.
 * 
 * @returns Health status object
 */
export async function healthCheck(): Promise<{
  status: string;
  service: string;
  version: string;
  timestamp: string;
}> {
  return fetchAbu<any>("/health");
}
