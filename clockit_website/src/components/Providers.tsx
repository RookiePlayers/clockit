"use client";

import { SnackbarProvider } from "notistack";
import ThemeProvider from "./ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  );
}
