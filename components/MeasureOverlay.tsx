import React, { useState, useRef, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface MeasureOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

const MeasureOverlay: React.FC<MeasureOverlayProps> = ({ isActive, onClose }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const PIXELS_PER_METER = 100;

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
    }
  }, [isActive]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    // We only want up to 2 points for a single measurement line.
    // If we already have 2, clicking again resets and starts a new line.
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (points.length >= 2) {
      setPoints([{ x, y }]);
    } else {
      setPoints(prev => [...prev, { x, y }]);
    }
  };

  const calculateDistance = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
    return distanceInPixels / PIXELS_PER_METER;
  };

  if (!isActive) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-40 bg-black/10 cursor-crosshair"
      onClick={handleContainerClick}
    >
      {points.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-navy-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-fade-in pointer-events-none">
          Click to place starting point
        </div>
      )}
      {points.length === 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-navy-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-fade-in pointer-events-none">
          Click to complete measurement
        </div>
      )}

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 bg-white/90 hover:bg-white text-navy-900 p-2 rounded-full shadow-md z-50 transition-colors"
        title="Close Measure Tool"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Points and Line */}
      {points.map((p, i) => (
        <div 
          key={i}
          className="absolute w-3 h-3 bg-[#C8A96A] rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-sm"
          style={{ left: p.x, top: p.y }}
        />
      ))}

      {points.length === 2 && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#C8A96A] drop-shadow-md">
            <line 
              x1={points[0].x} 
              y1={points[0].y} 
              x2={points[1].x} 
              y2={points[1].y} 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
          </svg>
          <div 
            className="absolute bg-white text-navy-900 px-3 py-1 rounded-md shadow-lg text-sm font-bold border border-navy-100 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: (points[0].x + points[1].x) / 2, 
              top: (points[0].y + points[1].y) / 2 - 20 
            }}
          >
            {calculateDistance(points[0], points[1]).toFixed(2)}m (est.)
          </div>
        </>
      )}
    </div>
  );
};

export default MeasureOverlay;
