import { createContext, useContext, useState, type ReactNode } from "react";

type BackgroundVariant = "default" | "calm" | "energetic" | "focused";

interface BackgroundContextType {
  variant: BackgroundVariant;
  setVariant: (variant: BackgroundVariant) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<BackgroundVariant>("default");

  return (
    <BackgroundContext.Provider value={{ variant, setVariant }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}
