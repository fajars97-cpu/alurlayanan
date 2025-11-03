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

// Back-compat helper: bentuk lama (category, action, label, value, params)
// Akan dikonversi ke event_name: "<category>_<action>"
export const trackEvent = (category, action, label, value, params = {}) => {
  try {
    const name = `${category}_${action}`.toLowerCase(); // contoh: "navigation_select_poli"
    const payload = {};
    if (label !== undefined) payload.label = label;
    if (value !== undefined) payload.value = value;
    ReactGA.event(name, { ...payload, ...params });
  } catch {}
};

// Catat durasi (ms) sebagai event GA4
export const trackTiming = (name, ms, extra = {}) => {
  try { ReactGA.event(name, { value: ms, ...extra }); } catch {}
};