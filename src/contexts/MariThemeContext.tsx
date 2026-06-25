import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type MariTheme = "dark" | "light";
const KEY = "mari-theme";

interface Ctx {
  theme: MariTheme;
  toggle: () => void;
  setTheme: (t: MariTheme) => void;
}

const MariThemeContext = createContext<Ctx | null>(null);

export function MariThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MariTheme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as MariTheme) || "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (t: MariTheme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return (
    <MariThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </MariThemeContext.Provider>
  );
}

export function useMariTheme() {
  const ctx = useContext(MariThemeContext);
  if (!ctx) return { theme: "dark" as MariTheme, toggle: () => {}, setTheme: () => {} };
  return ctx;
}
