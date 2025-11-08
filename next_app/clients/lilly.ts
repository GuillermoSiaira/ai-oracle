/**
 * TypeScript client for Lilly Engine (LLM interpretation).
 * 
 * Provides direct access to Lilly's interpretation endpoint.
 * For most cases, prefer using Abu's /api/astro/interpret which orchestrates
 * the full calculation + interpretation flow.
 * 
 * Configuration:
 * - Base URL from env: NEXT_PUBLIC_LILLY_URL (default: http://localhost:8001)
 */

import type { InterpretResponse } from "@/types/contracts";

const LILLY_BASE_URL =
  process.env.NEXT_PUBLIC_LILLY_URL || "http://localhost:8001";

/**
 * Custom error class for Lilly API errors.
 */
export class LillyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = "LillyApiError";
  }
}

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchLilly<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${LILLY_BASE_URL}${endpoint}`;

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
      throw new LillyApiError(
        errorBody.detail || `Lilly API error: ${response.status}`,
        response.status,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof LillyApiError) {
      throw error;
    }
    throw new LillyApiError(
      `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
      0
    );
  }
}

/**
 * Get LLM interpretation from aggregated astrological data.
 * 
 * NOTE: For most use cases, prefer using `abu.interpret()` which handles
 * both calculation and interpretation in one call.
 * 
 * @param payload - Aggregated astrological data (output of /analyze)
 * @param language - Interpretation language (default: "es")
 * @returns Interpretation with headline, narrative, actions, and metadata
 * @throws LillyApiError on validation or LLM errors
 * 
 * @example
 * ```ts
 * import { analyze } from "@/clients/abu";
 * import { interpret } from "@/clients/lilly";
 * 
 * // Get analysis from Abu
 * const analysis = await analyze({
 *   birth: { date: "1990-01-01T12:00:00Z", lat: -34.6, lon: -58.4 },
 *   current: { lat: -34.6, lon: -58.4 }
 * });
 * 
 * // Send to Lilly for interpretation
 * const interpretation = await interpret(analysis, "es");
 * ```
 */
export async function interpret(
  payload: any,
  language: "es" | "en" | "pt" | "fr" = "es"
): Promise<InterpretResponse> {
  return fetchLilly<InterpretResponse>("/api/ai/interpret", {
    method: "POST",
    body: JSON.stringify({ ...payload, language }),
  });
}

/**
 * Health check for Lilly Engine.
 * 
 * @returns Health status object
 */
export async function healthCheck(): Promise<{
  status: string;
  service: string;
  version?: string;
}> {
  return fetchLilly<any>("/health").catch(() => ({
    status: "unreachable",
    service: "Lilly Engine",
  }));
}
