import { useQuery } from "@tanstack/react-query";

export function useImportSources() {
  return useQuery({
    queryKey: ["import-sources"],
    queryFn: async () => {
      const response = await fetch("/api/import/sources");
      if (!response.ok) {
        throw new Error("Failed to fetch import sources");
      }
      const data = await response.json();
      return data.sources as string[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - sources don't change often
  });
}
