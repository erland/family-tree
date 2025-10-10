export {};
declare global {
  interface Window {
    genealogyAPI: {
      exportIndividualsExcel: () => Promise<{ success: boolean; path?: string }>;
      exportRelationshipsExcel: () => Promise<{ success: boolean; path?: string }>;
      exportGedcom: () => Promise<{ success: boolean; path?: string }>;
      importExcel: (filePath: string) => Promise<{ count: number; relCount: number }>;
      importGedcom: (filePath: string) => Promise<{ count: number; relCount: number }>;
      // Add more as your preload exposes them; keeping this minimal avoids drift.
    };
  }
}