import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MapView from "./components/MapView";
import PopupPortal from "./components/PopupPortal";
import { showPopup } from "./utils/popup";
import { isProbablyHardwareAccelerated } from "./utils/hardwareUtils";
import "./App.css";

function App() {
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("searching");
  const [mapType, setMapType] = useState(() => {
    return localStorage.getItem("mapType") || "satellite";
  });

  // Save mapType to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  // Watch position for live location updates
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("off");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        setLocationStatus("active");
      },
      (error) => {
        // Location denied or unavailable
        setLocationStatus("off");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Warn if hardware acceleration/WebGL falls back to software
  useEffect(() => {
    if (!isProbablyHardwareAccelerated()) {
      showPopup(
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected.",
        "failure",
        { duration: 6000 }
      );
    }
  }, []);

  return (
    <div className="app">
      <Navbar mapType={mapType} />
      <MapView
        location={location}
        locationStatus={locationStatus}
        mapType={mapType}
        setMapType={setMapType}
      />
      <PopupPortal />
    </div>
  );
}

export default App;
