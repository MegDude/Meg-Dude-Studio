import React from 'react';
import BeforeAfterSlider from './BeforeAfterSlider';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 beforeImage: string;
 afterImage: string;
}

const BeforeAfterModal: React.FC<Props> = ({ isOpen, onClose, beforeImage, afterImage }) => {
 if (!isOpen) return null;
 return (
 <div className="ic-modal-backdrop animate-fade-in">
 <div className="dp-panel w-full max-w-5xl overflow-hidden flex flex-col">
 <div className="ic-modal-header p-4 border-b border-[rgba(11,31,51,0.08)]">
 <h3 className="ic-editorial-step-title">Before & After Comparison</h3>
 <div className="flex gap-2">
 <a 
 href={afterImage} 
 download="staged-room-result.jpg"
 className="ic-compare-action"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
 Download Output
 </a>
 <button onClick={onClose} className="ic-compare-close" aria-label="Close comparison">
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
 </button>
 </div>
 </div>
 <div className="p-6">
 <BeforeAfterSlider beforeImage={beforeImage} afterImage={afterImage} />
 </div>
 </div>
 </div>
 );
};
export default BeforeAfterModal;
