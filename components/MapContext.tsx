"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface MapContextType {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  regenerate: (() => void) | null;
  setRegenerate: (fn: (() => void) | null) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerate, setRegenerateInternal] = useState<(() => void) | null>(null);

  const setRegenerate = useCallback((fn: (() => void) | null) => {
    setRegenerateInternal(() => fn);
  }, []);

  return (
    <MapContext.Provider
      value={{
        isGenerating,
        setIsGenerating,
        regenerate,
        setRegenerate,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
}
