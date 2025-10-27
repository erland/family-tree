// src/hooks/useSearch.ts
import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../store";
import type { Individual } from "@core";
import type { Relationship } from "@core";
import {
  buildSearchEntries,
  createSearcher,
  type SearchResult,
} from "@core";

/**
 * Encapsulates all search logic (index building, Fuse config, debouncing).
 * The calling component only supplies the query and gets results/ids back.
 */
export function useSearch(
  query: string,
  {
    limit = 10,
    debounceMs = 200,
    onResults,
  }: {
    limit?: number;
    debounceMs?: number;
    onResults?: (ids: string[]) => void;
  } = {}
) {
  const individuals = useAppSelector((s) => s.individuals.items) as Individual[];
  const relationships = useAppSelector((s) => s.relationships.items) as Relationship[];

  const entries = useMemo(
    () => buildSearchEntries(individuals, relationships),
    [individuals, relationships]
  );

  const searcher = useMemo(() => createSearcher(entries), [entries]);

  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query?.trim()) {
      setResults([]);
      onResults?.([]);
      return;
    }
    const t = setTimeout(() => {
      const res = searcher.search(query, limit);
      setResults(res);
      onResults?.(res.map((r) => r.item.id));
    }, debounceMs);
    return () => clearTimeout(t);
  }, [query, searcher, limit, debounceMs, onResults]);

  return {
    results,
    ids: results.map((r) => r.item.id),
  };
}