// Must stay first: in demo mode it patches fetch before the Supabase client is created.
import "./dev/demoFetch";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
