import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootElement = document.getElementById("connpass-schedule-root");

if (!rootElement) {
  throw new Error("Missing connpass-schedule-root element");
}

createRoot(rootElement).render(<App />);
