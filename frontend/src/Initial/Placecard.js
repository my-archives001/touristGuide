import React, { useState, useEffect } from 'react';
import placeholder from '../images/placeholder.png';
import config from '../config';

const API_BASE = config.apiURL;

const Placecard = ({ place }) => {
  // Prefer explicit imageUrl (DB-provided), else backend stream, else placeholder
  const primary = place.imageUrl || `${API_BASE}/api/places/${place._id}/image`;
  const fallback = `${API_BASE}/api/places/${place._id}/image`; // secondary
  const finalFallback = placeholder;

  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(place.imageUrl || `${API_BASE}/api/places/${place._id}/image`);
  }, [place._id, place.imageUrl, place.name]);

  const handleError = () => {
    // try fallback then placeholder
    if (src === fallback) {
      setSrc(finalFallback);
    } else if (src !== fallback) {
      setSrc(fallback);
    }
  };

  return (
    <div className="place-card">
      <div className="Box">
        <img
          src={src}
          alt={place.name}
          onError={handleError}
          style={{ width: '100%', height: '220px', objectFit: 'cover' }}
        />
        <p className="front-place-name">{place.name}</p>
      </div>

      <div className="details">
        <h3 className="place-name">{place.name}</h3>
        <h4 className="place-loc">{place.location}</h4>
        <p className="place-description">{place.description}</p>
      </div>
    </div>
  );
};

export default Placecard;
