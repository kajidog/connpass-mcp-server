import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootElement = document.getElementById("connpass-events-root");

if (!rootElement) {
  throw new Error("Missing connpass-events-root element");
}

createRoot(rootElement).render(<App />);
