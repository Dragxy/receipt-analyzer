import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface Ctx {
  dark: boolean;
  toggle: () => void;
}

const DarkModeContext = createContext<Ctx>({ dark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  return (
    <DarkModeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export const useDarkMode = () => useContext(DarkModeContext);
