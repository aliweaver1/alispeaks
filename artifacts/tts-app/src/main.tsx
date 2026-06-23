import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// On Railway (or any env where frontend and API are separate services),
// set VITE_API_BASE_URL to the API service's public URL.
// Locally the shared proxy handles /api/* so no base URL is needed.
if (import.meta.env.VITE_API_BASE_URL) {
  setBaseUrl(import.meta.env.VITE_API_BASE_URL as string);
}

createRoot(document.getElementById("root")!).render(<App />);
