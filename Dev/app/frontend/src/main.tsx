import React from "react";
import ReactDOM from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppRouter } from "./AppRouter.tsx";
import "./index.css";
import "./styles/design-system.css";
import "./App.css";
import "@/features/workspace/workspace.tokens.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <AppRouter />
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>,
);

