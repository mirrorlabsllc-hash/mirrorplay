import { createRoot } from "react-dom/client";
import App from "./App";
import { supabase } from "@/lib/supabase";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in DOM. Bootstrap failed.");
}

if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}

createRoot(rootEl).render(<App />);
