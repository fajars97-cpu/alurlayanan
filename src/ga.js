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

// Event utility (seragam di seluruh app)
export const trackEvent = (category, action, label, value) => {
 try {
    ReactGA.event({ category, action, label, value });
  } catch {}
};

// catat durasi (ms) sebagai event
export const trackTiming = (name, ms, extra = {}) => {
  try { ReactGA.event({ category: "Timing", action: name, value: ms, ...extra }); } catch {}
};