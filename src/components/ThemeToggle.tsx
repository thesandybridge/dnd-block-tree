import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { Button } from "@thesandybridge/ui/components";

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" disabled />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleMode}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
    >
      {mode === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
