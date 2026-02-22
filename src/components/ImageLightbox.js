import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/ImageLightbox.css";

const ImageLightbox = ({ images = [], isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when lightbox opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(0);
  }, [isOpen]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % (images.length || 1));
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(
      (prev) => (prev - 1 + (images.length || 1)) % (images.length || 1),
    );
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // ✅ Safe early return AFTER hooks
  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <div className="lightbox-container">
        {/* Close Button */}
        <button className="lightbox-close" onClick={onClose}>
          <X size={28} />
        </button>

        {/* Main Image */}
        <div className="lightbox-image-wrapper">
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="lightbox-image"
            onError={(e) => {
              e.target.src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="20"%3EImage not available%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button className="lightbox-nav lightbox-prev" onClick={handlePrev}>
              <ChevronLeft size={32} />
            </button>
            <button className="lightbox-nav lightbox-next" onClick={handleNext}>
              <ChevronRight size={32} />
            </button>
          </>
        )}

        {/* Footer */}
        <div className="lightbox-footer">
          <div className="lightbox-info">
            <p className="lightbox-counter">
              {currentIndex + 1} / {images.length}
            </p>
            <p className="lightbox-filename">{currentImage.name}</p>
          </div>

          {images.length > 1 && (
            <div className="lightbox-thumbnails">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={`lightbox-thumbnail ${
                    index === currentIndex ? "active" : ""
                  }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img src={image.url} alt={`Thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
