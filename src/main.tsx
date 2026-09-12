import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider } from "@fluentui/react-components";
import { darkTheme } from "./ui/theme";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FluentProvider theme={darkTheme} style={{ background: "transparent" }}>
      <App />
    </FluentProvider>
  </StrictMode>,
);
