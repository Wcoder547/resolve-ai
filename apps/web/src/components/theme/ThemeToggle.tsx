"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string;
  size?: "icon" | "sm";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "icon" ? "icon" : "sm"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        size === "sm" && "gap-2 px-3",
        className,
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {size === "sm" ? (
        <span className="text-xs font-medium">{isDark ? "Light" : "Dark"}</span>
      ) : null}
    </Button>
  );
}
