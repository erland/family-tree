// src/hooks/useDashboardViewModel.ts
import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchIndividuals,
  clearIndividuals,
} from "../features/individualsSlice";
import {
  fetchRelationships,
  clearRelationships,
} from "../features/relationshipsSlice";
import type { Individual, Relationship } from "@core/domain";
import { buildDashboardStats } from "@core/viewModelBuilders/dashboard";

export function useDashboardViewModel() {
  const dispatch = useAppDispatch();

  // Raw data from store
  const individuals = useAppSelector(
    (s) => s.individuals.items
  ) as Individual[];

  const relationships = useAppSelector(
    (s) => s.relationships.items
  ) as Relationship[];

  // Derived counts (pure domain -> UI stats, now moved to builder)
  const { individualCount, marriageCount, familyCount } = useMemo(() => {
    return buildDashboardStats(individuals, relationships);
  }, [individuals, relationships]);

  // IMPORT: Excel
  const handleImportExcel = useCallback(async () => {
    const result = await (window as any).api.importExcel?.();
    if (result) {
      alert(
        `Importerade ${result.count} personer och ${result.relCount} relationer.`
      );
      await dispatch(fetchIndividuals());
      await dispatch(fetchRelationships());
    }
  }, [dispatch]);

  // IMPORT: GEDCOM
  const handleImportGedcom = useCallback(async () => {
    const result = await (window as any).api.importGedcom?.();
    if (result) {
      alert(
        `Importerade ${result.count} personer och ${result.relCount} relationer.`
      );
      await dispatch(fetchIndividuals());
      await dispatch(fetchRelationships());
    }
  }, [dispatch]);

  // EXPORT: Excel
  const handleExportExcel = useCallback(async () => {
    const res = await (window as any).api.exportIndividualsExcel?.();
    if (res?.success) {
      alert("Excel-export klar!");
    }
  }, []);

  // EXPORT: GEDCOM
  const handleExportGedcom = useCallback(async () => {
    const res = await (window as any).api.exportGedcom?.();
    if (res?.success) {
      alert("GEDCOM-export klar!");
    }
  }, []);

  // DB RESET helper (used by ResetDatabaseButton)
  const handleResetDatabase = useCallback(async () => {
    // The preload should expose a resetDatabase() that clears persistence.
    await (window as any).api.resetDatabase?.();

    // Clear redux state
    dispatch(clearIndividuals());
    dispatch(clearRelationships());

    // Force a full UI reload to ensure everything reflects empty state
    window.location.reload();
  }, [dispatch]);

  return {
    // stats for UI
    individualCount,
    marriageCount,
    familyCount,

    // actions for UI
    handleImportExcel,
    handleImportGedcom,
    handleExportExcel,
    handleExportGedcom,
    handleResetDatabase,
  };
}