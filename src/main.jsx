import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>
);