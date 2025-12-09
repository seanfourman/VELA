import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MapView from "./components/MapView";
import "./App.css";

function App() {
  const [location, setLocation] = useState(null);

  // Try to get location silently in the background
  useEffect(() => {
    if (!navigator.geolocation) {
      return; // Exit if geolocation is not supported
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        // Location denied or unavailable - that's fine, map will show world view
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return (
    <div className="app">
      <Navbar />
      <MapView location={location} isVisible={true} isLoading={false} />
    </div>
  );
}

export default App;
