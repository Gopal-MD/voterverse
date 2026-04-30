import { useState, useEffect, useRef } from 'react';

const MOCK_BOOTHS = [
  { id: 1, name: 'Government School, Sector 15', address: 'Sector 15, Noida, UP', lat: 28.5855, lng: 77.3100 },
  { id: 2, name: 'Community Hall, Nehru Place', address: 'Nehru Place, New Delhi', lat: 28.5491, lng: 77.2533 },
  { id: 3, name: 'Municipal Ward Office, Connaught Place', address: 'CP, New Delhi', lat: 28.6315, lng: 77.2167 },
  { id: 4, name: 'Primary School, Sarojini Nagar', address: 'Sarojini Nagar, New Delhi', lat: 28.5744, lng: 77.2001 },
  { id: 5, name: 'Government College, Lajpat Nagar', address: 'Lajpat Nagar, New Delhi', lat: 28.5693, lng: 77.2432 },
];

export default function PollingBoothFinder() {
  const [mapsKey, setMapsKey] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.mapsApiKey) {
          setMapsKey(cfg.mapsApiKey);
          loadMapsScript(cfg.mapsApiKey);
        }
      })
      .catch(() => {});
  }, []);

  const loadMapsScript = (key) => {
    if (window.google?.maps) { setMapLoaded(true); initMap(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&callback=initVVMap`;
    script.async = true;
    window.initVVMap = () => { setMapLoaded(true); initMap(); };
    document.head.appendChild(script);
  };

  const initMap = () => {
    try {
      if (!mapRef.current || !window.google?.maps) return;
      const center = userLocation || { lat: 28.6139, lng: 77.2090 };
      const map = new window.google.maps.Map(mapRef.current, {
        center, zoom: 12, mapId: 'voterverse-map',
        styles: [{ featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }],
      });
      mapInstanceRef.current = map;
      MOCK_BOOTHS.forEach(booth => {
        const marker = new window.google.maps.Marker({ position: { lat: booth.lat, lng: booth.lng }, map, title: booth.name });
        marker.addListener('click', () => setSelectedBooth(booth));
      });
    } catch (err) {
      console.error('Map init failed:', err);
      setMapLoaded(false);
      setMapsKey(''); // Trigger list-view fallback if init fails
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      if (mapInstanceRef.current) mapInstanceRef.current.panTo(loc);
    });
  };

  const getDirections = (booth) => {
    const dest = `${booth.lat},${booth.lng}`;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    window.open(`https://www.google.com/maps/dir/${origin}/${dest}`, '_blank');
  };

  const filtered = MOCK_BOOTHS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <section className="hero">
        <h2>🗺️ Polling Booth Finder</h2>
        <p>Find your nearest polling station and get directions</p>
      </section>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <label htmlFor="booth-search" className="form-label" style={{ width: '100%' }}>Search by name or area</label>
        <input id="booth-search" type="text" className="form-input" placeholder="Enter constituency or area..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-primary" onClick={getUserLocation}>📍 Use My Location</button>
      </div>

      {mapsKey ? (
        <div role="region" aria-label="Polling Booth Map" className="map-container" ref={mapRef}>
          {!mapLoaded && <p className="loading-pulse" style={{ padding: 20 }}>Loading map...</p>}
        </div>
      ) : (
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>📍 Map unavailable — showing list view</p>
        </div>
      )}

      {selectedBooth && (
        <div className="glass-card" style={{ marginTop: 20 }} aria-live="polite">
          <h3>{selectedBooth.name}</h3>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>{selectedBooth.address}</p>
          <button className="btn btn-accent btn-sm" onClick={() => getDirections(selectedBooth)}>🧭 Get Directions</button>
        </div>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 16 }}>Nearby Polling Stations</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(booth => (
          <div key={booth.id} className="glass-card" style={{ cursor: 'pointer' }}
            onClick={() => setSelectedBooth(booth)} tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') setSelectedBooth(booth); }}
            role="button" aria-label={`Select ${booth.name}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h4 style={{ fontSize: '0.95rem' }}>{booth.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{booth.address}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); getDirections(booth); }}>
                🧭 Directions
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
