// src/ga.js
import ReactGA from "react-ga4";

export const initGA = () => {
  const GA_ID = import.meta.env.VITE_GA_ID;
  if (GA_ID) {
    ReactGA.initialize(GA_ID, { send_page_view: false });
    console.log("Google Analytics initialized:", GA_ID);
  } else {
    console.warn("GA ID not found in .env");
  }
};

export const trackPage = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

// GA4: helper event bernama (native)
export const gaEvent = (name, params = {}) => {
  try { ReactGA.event(name, params); } catch {}
};

export const trackEvent = (category, action, label, value, params = {}) => {
  try {
    const name = `${category}_${action}`.toLowerCase(); // "navigation_select_poli"
    const payload = {};
    if (label !== undefined) payload.label = label;
    if (value !== undefined) payload.value = value;

    // FIX: gunakan spread, bukan ".payload"
    ReactGA.event(name, { ...payload, ...params });
  } catch (e) {
    console.warn("trackEvent error", e);
  }
};

// Timing helper
export const trackTiming = (name, ms, extra = {}) => {
  try {
    // FIX: pakai spread
    const payload = { ...extra };

    if (name === "view_service_ms") {
      payload.view_ms = ms;   // dipakai untuk custom metric "View Duration"
    } else {
      payload.ms = ms;        // timing lain → "ms"
    }

    ReactGA.event(name, payload);
  } catch (e) {
    console.warn("trackTiming error", e);
  }
};