"use client"; // reads/sets the active theme via next-themes, and the icon
// shown depends on browser state - can't be rendered on the server.

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

// next-themes only knows the persisted theme after the browser has
// hydrated (it reads localStorage), so the server always renders as
// "not mounted yet". useSyncExternalStore is the React-recommended way to
// express "true on the client, false during SSR" without the classic
// `useEffect(() => setMounted(true))` trick, which triggers an extra
// render pass.
const subscribeNever = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) return <div className="size-8" aria-hidden="true" />;

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
