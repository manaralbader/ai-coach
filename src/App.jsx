import React from "react";
import PoseDetector from "./components/PoseDetector";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AI Coach - Multi-Exercise Form Tracker</h1>
        <p>Real-time form validation for bicep curls, front kicks, and squats</p>
      </header>
      <main>
        <PoseDetector />
      </main>
    </div>
  );
}

export default App;
