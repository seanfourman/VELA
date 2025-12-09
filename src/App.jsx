import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MapView from "./components/MapView";
import "./App.css";

function App() {
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("searching");
  const [mapType, setMapType] = useState("dark");

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

  return (
    <div className="app">
      <Navbar mapType={mapType} />
      <MapView
        location={location}
        locationStatus={locationStatus}
        mapType={mapType}
        setMapType={setMapType}
      />
    </div>
  );
}

export default App;
