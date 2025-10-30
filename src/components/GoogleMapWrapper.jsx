import React, { useCallback, useState } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const libraries = ['places'];

const GoogleMapWrapper = ({ center, zoom, onPositionChange, isPicker = false, markerPosition }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [map, setMap] = useState(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((event) => {
    if (isPicker && onPositionChange) {
      onPositionChange({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    }
  }, [isPicker, onPositionChange]);

  if (loadError) return <div>Error loading maps. Please check the API key and billing settings.</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  const defaultCenter = { lat: 31.6295, lng: -7.9811 }; // Default to Marrakech if no center is provided

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center ? { lat: center[1], lng: center[0] } : defaultCenter}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {markerPosition && (
        <Marker
          position={{ lat: markerPosition[1], lng: markerPosition[0] }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleMapWrapper;
