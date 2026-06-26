import React, { useState, useEffect } from 'react';

/**
 * Reusable image component with lazy loading and error fallback support.
 */
const CMSImage = ({ src, fallbackSrc = '/images/cat_medicines.png', alt, className, style, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc || fallbackSrc}
      alt={alt || ''}
      className={className}
      style={style}
      loading="lazy"
      onError={handleError}
      {...props}
    />
  );
};

export default CMSImage;
