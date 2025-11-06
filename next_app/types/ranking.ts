export interface RankingBreakdown {
  dignities: { total: number };
  angularity: { total: number };
  solar_conditions: { total: number };
  aspects_reception: { total: number };
  sect: { total: number };
}

export interface CityRanking {
  city: string;
  coordinates: { lat: number; lon: number };
  total_score: number;
  breakdown: RankingBreakdown;
  chart_summary: {
    asc_sign: string;
    mc_sign: string;
    solar_return_datetime: string;
  };
}

export interface RankingResponse {
  top_recommendations: string[];
  rankings: CityRanking[];
  criteria: string[];
  cities_analyzed: number;
  year: number;
}
