import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("DOM CHECK", document.body.innerHTML.substring(0, 500));

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in DOM. Bootstrap failed.");
}

createRoot(rootEl).render(<App />);
