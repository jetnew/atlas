"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ReportContextType {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  regenerate: (() => void) | null;
  setRegenerate: (fn: (() => void) | null) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerate, setRegenerateInternal] = useState<(() => void) | null>(null);

  const setRegenerate = useCallback((fn: (() => void) | null) => {
    setRegenerateInternal(() => fn);
  }, []);

  return (
    <ReportContext.Provider
      value={{
        isGenerating,
        setIsGenerating,
        regenerate,
        setRegenerate,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
}
