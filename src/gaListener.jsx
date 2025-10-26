// src/GAListener.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPage } from "./ga";

export default function GAListener() {
  const location = useLocation();

  useEffect(() => {
    trackPage(location.pathname + location.search);
  }, [location]);

  return null;
}
