import React from 'react';

interface PerspectiveGuideOverlayProps {
    isVisible: boolean;
}

const PerspectiveGuideOverlay: React.FC<PerspectiveGuideOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-30 opacity-30 animate-fade-in mix-blend-overlay">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#ffffff" strokeWidth="2" strokeDasharray="5,5">
                    {/* Horizon line */}
                    <line x1="0%" y1="50%" x2="100%" y2="50%" />
                    {/* Center axis */}
                    <line x1="50%" y1="0%" x2="50%" y2="100%" />
                    {/* Perspective lines */}
                    <line x1="20%" y1="100%" x2="50%" y2="50%" />
                    <line x1="80%" y1="100%" x2="50%" y2="50%" />
                    <line x1="0%" y1="80%" x2="50%" y2="50%" />
                    <line x1="100%" y1="80%" x2="50%" y2="50%" />
                </g>
            </svg>
        </div>
    );
};

export default PerspectiveGuideOverlay;
