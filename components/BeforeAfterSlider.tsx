import React, { useState, useRef, useEffect, useCallback } from 'react';

interface BeforeAfterSliderProps {
 beforeImage: string;
 afterImage: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ beforeImage, afterImage }) => {
 const [sliderPosition, setSliderPosition] = useState(50);
 const [isDragging, setIsDragging] = useState(false);
 const containerRef = useRef<HTMLDivElement>(null);

 const handleMove = useCallback((clientX: number) => {
 if (!containerRef.current) return;
 const rect = containerRef.current.getBoundingClientRect();
 const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
 const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
 setSliderPosition(percent);
 }, []);

 const onMouseMove = useCallback((e: MouseEvent) => {
 if (isDragging) handleMove(e.clientX);
 }, [isDragging, handleMove]);

 const onTouchMove = useCallback((e: TouchEvent) => {
 if (isDragging) handleMove(e.touches[0].clientX);
 }, [isDragging, handleMove]);

 const onMouseUp = useCallback(() => setIsDragging(false), []);

 useEffect(() => {
 document.addEventListener('mousemove', onMouseMove);
 document.addEventListener('mouseup', onMouseUp);
 document.addEventListener('touchmove', onTouchMove);
 document.addEventListener('touchend', onMouseUp);

 return () => {
 document.removeEventListener('mousemove', onMouseMove);
 document.removeEventListener('mouseup', onMouseUp);
 document.removeEventListener('touchmove', onTouchMove);
 document.removeEventListener('touchend', onMouseUp);
 };
 }, [onMouseMove, onMouseUp, onTouchMove]);

 return (
 <div 
 ref={containerRef}
 className="ic-before-after-slider"
 onMouseDown={(e) => {
 setIsDragging(true);
 handleMove(e.clientX);
 }}
 onTouchStart={(e) => {
 setIsDragging(true);
 handleMove(e.touches[0].clientX);
 }}
 >
 {/* After Image (Background) */}
 <img src={afterImage} draggable={false} alt="After" />
 
 {/* Before Image (Foreground, clipped) */}
 <img 
 src={beforeImage} 
 style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} 
 draggable={false} 
 alt="Before" 
 />

 {/* Slider Handle */}
 <div 
 className="ic-before-after-divider"
 style={{ left: `calc(${sliderPosition}% - 2px)` }}
 >
 <div className="ic-before-after-handle">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-4 4 4 4m8-8l4 4-4 4" /></svg>
 </div>
 </div>
 
 {/* Labels */}
 <div className="ic-before-after-label" style={{ left: 12 }}>Before</div>
 <div className="ic-before-after-label" style={{ right: 12 }}>After</div>
 </div>
 );
};

export default BeforeAfterSlider;
