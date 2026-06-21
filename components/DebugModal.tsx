/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface DebugModalProps {
 isOpen: boolean;
 onClose: () => void;
 imageUrl: string | null;
 prompt: string | null;
}

const CloseIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
);

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, imageUrl, prompt }) => {
 if (!isOpen || !imageUrl) {
 return null;
 }

 const handleModalContentClick = (e: React.MouseEvent) => {
 e.stopPropagation();
 };

 return (
 <div 
 className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
 onClick={onClose}
 aria-modal="true"
 role="dialog"
 >
 <div 
 className="dp-panel w-full max-w-4xl p-6 md:p-8 relative transform transition-all flex flex-col"
 style={{ maxHeight: '90vh' }}
 onClick={handleModalContentClick}
 role="document"
 >
 <button 
 onClick={onClose}
 className="absolute top-4 right-4 text-navy-500 hover:text-navy-900 transition-colors z-10 dp-radius dp-btn-text h-12"
 aria-label="Close modal"
 >
 <CloseIcon />
 </button>
 <div className="text-center mb-4 flex-shrink-0">
 <h2 className="dp-editorial-headline font-medium text-3xl text-navy-900 dp-editorial-headline">Debug <span className="text-[#C8A96A]">View</span></h2>
 </div>
 
 <div className="flex flex-col gap-4 overflow-y-auto">
 <div>
 <p className="text-navy-500 mb-2">This is the image sent to the AI, with a red marker indicating the placement.</p>
 <div className="dp-radius overflow-hidden bg-navy-50/50">
 <img src={imageUrl} alt="Debug view of marked scene" className="w-full h-full object-contain" />
 </div>
 </div>
 
 {prompt && (
 <div>
 <h3 className="text-lg font-bold text-navy-900 mb-2 dp-editorial-headline">Final Prompt to Image Model</h3>
 <pre className="bg-navy-50/50 text-navy-900 p-4 dp-radius text-xs whitespace-pre-wrap">
 <code>{prompt}</code>
 </pre>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default DebugModal;
