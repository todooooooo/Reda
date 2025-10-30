import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Map, View, Feature } from 'ol';
import { Group as LayerGroup, Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Point, LineString } from 'ol/geom';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Icon, Stroke, Circle, Fill } from 'ol/style';
import Overlay from 'ol/Overlay';
import * as olms from 'ol-mapbox-style';
import { X, Phone, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const isValidCoordinate = (coord) => {
    return Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number' && !isNaN(coord[0]) && !isNaN(coord[1]);
};

const createIconStyle = (svg, color = '#ff0000', circleColor = 'white') => {
    const coloredSvg = svg.replace(/currentColor/g, color);
    return new Style({
        image: new Circle({
            radius: 20,
            fill: new Fill({ color: circleColor }),
            stroke: new Stroke({ color: color, width: 2 }),
        }),
    });
};

const userIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const restaurantIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 21v-8h6v8"/><path d="M9 7h6"/></svg>`;
const driverIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M19 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M2 18h.14c.86 0 1.63-.56 1.9-1.4l3.1-6.2a2 2 0 0 1 1.9-1.4H12"/><path d="M17 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/></svg>`;
const pickerIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const Popup = ({ feature, onClose }) => {
    const navigate = useNavigate();
    if (!feature) return null;

    const properties = feature.getProperties();
    const { type, name, address, phone, id } = properties;

    const handleCall = () => {
        if (phone) {
            window.location.href = `tel:${phone}`;
        }
    };

    const handleViewMenu = () => {
        if (id) {
            navigate(`/menu/${id}`);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg w-64 overflow-hidden">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg mb-1">{name}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={18} /></button>
                </div>
                {address && <p className="text-sm text-gray-600 mb-3">{address}</p>}
                
                <div className="flex flex-col space-y-2">
                    {type === 'restaurant' && (
                        <Button onClick={handleViewMenu} size="sm" className="w-full">
                            <Utensils className="mr-2 h-4 w-4" /> View Menu
                        </Button>
                    )}
                    {phone && (type === 'driver' || type === 'user') && (
                        <Button onClick={handleCall} size="sm" className="w-full">
                            <Phone className="mr-2 h-4 w-4" /> Call
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const OpenLayersWrapper = ({ 
  center, 
  zoom, 
  onPositionChange, 
  isPicker = false, 
  markerPosition,
  restaurantMarkers = [],
  userMarker,
  driverMarker,
  allDriversMarkers = [],
  showRouteToRestaurant = false,
  showRouteToCustomer = false,
}) => {
  const mapRef = useRef();
  const popupRef = useRef();
  const [map, setMap] = useState(null);
  const [vectorSource] = useState(new VectorSource());
  const [routeSource] = useState(new VectorSource());
  const [popupContent, setPopupContent] = useState(null);
  const [popupOverlay, setPopupOverlay] = useState(null);
  const orsApiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

  useEffect(() => {
    const overlay = new Overlay({
        element: popupRef.current,
        autoPan: { animation: { duration: 250 } },
    });
    setPopupOverlay(overlay);

    const openfreemap = new LayerGroup();
    const vectorLayer = new VectorLayer({ source: vectorSource, zIndex: 10 });
    const routeLayer = new VectorLayer({ source: routeSource, zIndex: 5 });

    const initialMap = new Map({
      layers: [openfreemap, routeLayer, vectorLayer],
      overlays: [overlay],
      view: new View({
        center: fromLonLat(center || [13.388, 52.517]),
        zoom: zoom || 9.5,
      }),
      controls: [],
    });

    olms.apply(openfreemap, 'https://tiles.openfreemap.org/styles/liberty');
    
    setMap(initialMap);

    return () => {
      if (initialMap) {
        initialMap.setTarget(undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (map && mapRef.current) {
      map.setTarget(mapRef.current);
    }
  }, [map]);

  useEffect(() => {
    if (!map || !popupOverlay) return;

    const handleMapClick = (event) => {
      if (isPicker && onPositionChange) {
        const coords = toLonLat(map.getCoordinateFromPixel(event.pixel));
        onPositionChange({ lat: coords[1], lng: coords[0] });
        return;
      }

      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f);
      if (feature && feature.get('type')) {
        setPopupContent(feature);
        popupOverlay.setPosition(feature.getGeometry().getCoordinates());
      } else {
        setPopupContent(null);
        popupOverlay.setPosition(undefined);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.un('click', handleMapClick);
    };
  }, [map, isPicker, onPositionChange, popupOverlay]);

  useEffect(() => {
    if (!map) return;
    vectorSource.clear();
    const features = [];

    const addFeature = (coords, type, properties, svg, color, circleColor) => {
        if (isValidCoordinate(coords)) {
            const feature = new Feature(new Point(fromLonLat(coords)));
            feature.setProperties({ type, ...properties });
            
            const style = createIconStyle(svg, color, circleColor);
            const icon = new Icon({
                anchor: [0.5, 0.5],
                src: `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/currentColor/g, color))}`,
                scale: 0.7,
            });
            style.setImage(new Circle({
                radius: 16,
                fill: new Fill({ color: circleColor }),
                stroke: new Stroke({ color: color, width: 2 }),
            }));
            const imageStyle = new Style({ image: icon });
            feature.setStyle([style, imageStyle]);

            features.push(feature);
        }
    };

    if (isPicker && isValidCoordinate(markerPosition)) {
        addFeature(markerPosition, 'picker', {}, pickerIconSvg, '#ef4444', 'white');
    }
    if (userMarker && isValidCoordinate(userMarker.position)) {
        addFeature(userMarker.position, 'user', { name: userMarker.name, phone: userMarker.phone }, userIconSvg, '#3b82f6', 'white');
    }
    if (driverMarker && isValidCoordinate(driverMarker.position)) {
        addFeature(driverMarker.position, 'driver', { name: driverMarker.name, phone: driverMarker.phone }, driverIconSvg, '#8b5cf6', 'white');
    }
    restaurantMarkers.forEach(marker => {
        addFeature([marker.longitude, marker.latitude], 'restaurant', { id: marker.id, name: marker.name, address: marker.address }, restaurantIconSvg, '#e11d48', 'white');
    });
    allDriversMarkers.forEach(marker => {
        addFeature([marker.longitude, marker.latitude], 'driver', { name: marker.full_name || 'Driver', phone: marker.phone }, driverIconSvg, '#6b7280', 'white');
    });

    vectorSource.addFeatures(features);

    if (features.length > 0 && !isPicker) {
        map.getView().fit(vectorSource.getExtent(), { padding: [80, 80, 120, 80], maxZoom: 15, duration: 500 });
    } else if (isPicker && isValidCoordinate(markerPosition)) {
        map.getView().animate({ center: fromLonLat(markerPosition), duration: 500 });
    }

  }, [map, vectorSource, isPicker, markerPosition, userMarker, driverMarker, restaurantMarkers, allDriversMarkers]);

  const restaurantCoord = useMemo(() => {
    const validMarkers = restaurantMarkers.filter(marker => isValidCoordinate([marker.longitude, marker.latitude]));
    if (validMarkers.length > 0) {
      return [validMarkers[0].longitude, validMarkers[0].latitude];
    }
    return null;
  }, [restaurantMarkers]);

  useEffect(() => {
    routeSource.clear();
    if (!map || !orsApiKey) return;

    const fetchRoute = async (start, end, color) => {
        if (!isValidCoordinate(start) || !isValidCoordinate(end)) return;
        
        try {
            const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                    'Content-Type': 'application/json',
                    'Authorization': orsApiKey
                },
                body: JSON.stringify({ "coordinates": [start, end] })
            });
            if (!response.ok) throw new Error('Failed to fetch route');
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const routeCoords = data.features[0].geometry.coordinates.map(coord => fromLonLat(coord));
                const routeFeature = new Feature({
                    geometry: new LineString(routeCoords),
                });
                routeFeature.setStyle(new Style({
                    stroke: new Stroke({
                        color: color,
                        width: 6,
                    }),
                }));
                routeSource.addFeature(routeFeature);
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    };

    if (showRouteToRestaurant && driverMarker?.position && restaurantCoord) {
        fetchRoute(driverMarker.position, restaurantCoord, '#8b5cf6');
    }
    if (showRouteToCustomer && driverMarker?.position && userMarker?.position) {
        fetchRoute(driverMarker.position, userMarker.position, '#22c55e');
    }
  }, [map, routeSource, showRouteToRestaurant, showRouteToCustomer, driverMarker, userMarker, restaurantCoord, orsApiKey]);

  return (
    <div className="relative w-full h-full">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="bg-muted" />
        <div ref={popupRef}>
            {popupContent && <Popup feature={popupContent} onClose={() => { setPopupContent(null); popupOverlay.setPosition(undefined); }} />}
        </div>
    </div>
  );
};

export default OpenLayersWrapper;
