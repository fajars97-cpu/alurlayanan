import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { HashRouter } from "react-router-dom";
import { initGA } from "./ga.js";
import GAListener from "./GAListener.jsx";

class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  render(){
    if(this.state.hasError){
      return <div style={{padding:16,fontFamily:"system-ui"}}>
        <h3>Terjadi error saat merender.</h3>
        <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.err)}</pre>
      </div>;
    }
    return this.props.children;
  }
}

initGA();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
<HashRouter>
      <GAListener />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </React.StrictMode>
);