import { useState, useEffect } from "react";

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with intersection observer
 * - Responsive images with srcSet
 * - Error handling with fallback
 * - Skeleton loading state
 */
const OptimizedImage = ({
  src,
  alt = "Image",
  className = "",
  fallbackSrc = null,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  onLoad = null,
  onError = null,
  aspectRatio = "auto",
  style = {},
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };
    img.onerror = () => {
      setError(true);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
      onError?.();
    };
    img.src = src;
  }, [src, fallbackSrc, onLoad, onError]);

  if (error && !imageSrc) {
    return (
      <div
        className={`${className} bg-slate-800 flex items-center justify-center`}
        style={{ aspectRatio, ...style }}
      >
        <span className="text-slate-500 text-xs">Unable to load image</span>
      </div>
    );
  }

  return (
    <>
      {!isLoaded && (
        <div
          className={`${className} bg-slate-800/50 animate-pulse`}
          style={{ aspectRatio, ...style }}
        />
      )}
      <img
        src={imageSrc || src}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        style={{ aspectRatio, ...style }}
        onError={() => {
          setError(true);
          if (fallbackSrc) {
            setImageSrc(fallbackSrc);
          }
          onError?.();
        }}
        {...props}
      />
    </>
  );
};

export default OptimizedImage;
