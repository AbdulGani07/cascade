import { useEffect, useState } from "react";
import { fetchAnalysis, type AnalysisResult } from "../lib/api";

/**
 * Loads dashboard analysis data and exposes loading/error state.
 */
export function useGraphData(): {
  data: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis()
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}