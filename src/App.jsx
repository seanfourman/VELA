import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import MapView from "./components/MapView";
import "./App.css";

function App() {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState("pending");

  // Request geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      setPermissionStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Location obtained:", latitude, longitude);
        setLocation({ lat: latitude, lng: longitude });
        setPermissionStatus("granted");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setPermissionStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Check for existing permission and request location
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            requestLocation();
          } else if (result.state === "prompt") {
            requestLocation();
          } else {
            setPermissionStatus("denied");
          }
        })
        .catch(() => {
          requestLocation();
        });
    } else {
      requestLocation();
    }
  }, [requestLocation]);

  return (
    <div className="app">
      <Navbar />

      {/* Map View */}
      <MapView
        location={location}
        isVisible={true}
        isLoading={permissionStatus === "pending"}
      />

      {/* Permission denied message */}
      {permissionStatus === "denied" && (
        <div className="permission-denied">
          <div className="denied-content">
            <span className="denied-icon">🌍</span>
            <h3>Location Access Required</h3>
            <p>Please enable location services to explore your area</p>
            <button onClick={requestLocation} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
