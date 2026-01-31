import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-theme-toggle"
        >
          <Sun className={`h-5 w-5 transition-all ${resolvedTheme === "dark" ? "scale-0 rotate-90" : "scale-100 rotate-0"}`} />
          <Moon className={`absolute h-5 w-5 transition-all ${resolvedTheme === "dark" ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="menu-theme-options">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={theme === "light" ? "bg-accent" : ""}
          data-testid="menuitem-theme-light"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={theme === "dark" ? "bg-accent" : ""}
          data-testid="menuitem-theme-dark"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={theme === "system" ? "bg-accent" : ""}
          data-testid="menuitem-theme-system"
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="relative"
      data-testid="button-theme-toggle-simple"
    >
      <Sun className={`h-5 w-5 transition-all ${resolvedTheme === "dark" ? "scale-0 rotate-90" : "scale-100 rotate-0"}`} />
      <Moon className={`absolute h-5 w-5 transition-all ${resolvedTheme === "dark" ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
