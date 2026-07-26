import React, { useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import "./ChatMessage.css"; 
const ChatMessage = ({ role, text, imageUrls = [] }) => {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  return (
    <>
      <div className={`message ${role === "model" ? "bot" : "user"}-message`}>
        {role === "model" && <ChatbotIcon />}
        <div className="message-content">
          <p className="message-text">{text}</p>

          {imageUrls.length > 0 && (
            <div className="image-gallery">
              {imageUrls.slice(0, 4).map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`related ${idx}`}
                  className="thumb"
                  onClick={() => setLightboxUrl(url)}
                  onError={(e) => (e.currentTarget.style.opacity = 0.6)} // graceful fallback
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && (
        <div className="lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="preview" className="lightbox-img"/>
        </div>
      )}
    </>
  );
};

export default React.memo(ChatMessage);
