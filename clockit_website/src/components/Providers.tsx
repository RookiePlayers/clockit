"use client";

import { SnackbarProvider } from "notistack";
import { useAuthState } from "react-firebase-hooks/auth";
import ThemeProvider from "./ThemeProvider";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import { auth } from "@/lib/firebase";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);

  return (
    <ThemeProvider>
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <FeatureFlagsProvider userId={user?.uid}>
          {children}
        </FeatureFlagsProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
