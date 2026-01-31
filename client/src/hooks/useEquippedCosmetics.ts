import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { CosmeticItem, EquippedItem } from "@shared/schema";

type EquippedWithItem = EquippedItem & { item: CosmeticItem };

interface CosmeticMetadata {
  type?: string;
  colors?: string[];
  particles?: boolean;
  nebula?: boolean;
  primary?: string;
  secondary?: string;
  accent?: string;
  neon?: string;
}

export function useEquippedCosmetics() {
  const { data: equipped } = useQuery<EquippedWithItem[]>({
    queryKey: ["/api/inventory/equipped"],
  });

  const equippedBackground = equipped?.find(e => e.item.category === "backgrounds");
  const equippedTheme = equipped?.find(e => e.item.category === "themes");

  const backgroundColors = (equippedBackground?.item.metadata as CosmeticMetadata)?.colors;
  const themeColors = equippedTheme?.item.metadata as CosmeticMetadata;

  useEffect(() => {
    if (!themeColors) return;
    
    const root = document.documentElement;
    
    if (themeColors.primary) {
      root.style.setProperty("--cosmetic-primary", themeColors.primary);
    }
    if (themeColors.secondary) {
      root.style.setProperty("--cosmetic-secondary", themeColors.secondary);
    }
    if (themeColors.accent) {
      root.style.setProperty("--cosmetic-accent", themeColors.accent);
    }
    if (themeColors.neon) {
      root.style.setProperty("--cosmetic-neon", themeColors.neon);
    }

    return () => {
      root.style.removeProperty("--cosmetic-primary");
      root.style.removeProperty("--cosmetic-secondary");
      root.style.removeProperty("--cosmetic-accent");
      root.style.removeProperty("--cosmetic-neon");
    };
  }, [themeColors]);

  return {
    equipped,
    equippedBackground,
    equippedTheme,
    backgroundColors,
    themeColors,
    hasEquippedBackground: !!equippedBackground,
    hasEquippedTheme: !!equippedTheme,
  };
}
