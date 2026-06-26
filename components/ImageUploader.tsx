/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import PerspectiveGuideOverlay from './PerspectiveGuideOverlay';
import { ImageWithFallback } from './ImageWithFallback';
import React, { useCallback, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';

interface PlacedObject {
 id: string;
 thumbnailUrl: string;
 pixelPosition: { x: number; y: number };
 scale?: number;
 rotation?: number;
 isVisible?: boolean;
 styleFilter?: string;
}

interface ImageUploaderProps {
 id: string;
 label?: string;
 onFileSelect: (file: File) => void;
 imageUrl: string | null;
 className?: string;
 isDropZone?: boolean;
 onProductDrop?: (position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => void;
 onObjectMove?: (id: string, position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => void;
 onObjectDelete?: (id: string) => void;
 onObjectRotate?: (id: string, delta: number) => void;
 onLibraryProductDrop?: (product: { url: string; name: string }, position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => void;
 onScenePointSelect?: (position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => void;
 persistedOrbPosition?: { x: number; y: number } | null;
 isTouchHovering?: boolean;
 touchOrbPosition?: { x: number; y: number } | null;
 placedObjects?: PlacedObject[];
 showPerspectiveGrid?: boolean;
}

const UploadIcon: React.FC = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 dp-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
 </svg>
);

const WarningIcon: React.FC = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
 </svg>
);


const ImageUploader = forwardRef<HTMLImageElement, ImageUploaderProps>(({ id, label, onFileSelect, imageUrl, className = "", isDropZone = false, onProductDrop, onLibraryProductDrop, onScenePointSelect, persistedOrbPosition, isTouchHovering = false, touchOrbPosition = null, placedObjects = [], onObjectMove, onObjectDelete, onObjectRotate, showPerspectiveGrid = false }, ref) => {
 const inputRef = useRef<HTMLInputElement>(null);
 const imgRef = useRef<HTMLImageElement>(null);
 const [isDraggingOver, setIsDraggingOver] = useState(false);
 const [orbPosition, setOrbPosition] = useState<{x: number, y: number} | null>(null);
 const [fileTypeError, setFileTypeError] = useState<string | null>(null);
 

 // Expose the internal imgRef to the parent component via the forwarded ref
 useImperativeHandle(ref, () => imgRef.current as HTMLImageElement);
 
 useEffect(() => {
 if (!imageUrl) {
 setFileTypeError(null);
 }
 }, [imageUrl]);

 const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (file) {
 const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
 if (!allowedTypes.includes(file.type)) {
 setFileTypeError('For best results, please use PNG, JPG, JPEG, or WebP formats.');
 } else {
 setFileTypeError(null);
 }
 onFileSelect(file);
 }
 };
 
 // A shared handler for both click and drop placements.
 const getPlacementFromPoint = useCallback((clientX: number, clientY: number, currentTarget: HTMLDivElement) => {
 const img = imgRef.current;
 if (!img) return null;

 const containerRect = currentTarget.getBoundingClientRect();
 const { naturalWidth, naturalHeight } = img;
 const { width: containerWidth, height: containerHeight } = containerRect;

 // Calculate the rendered image's dimensions inside the container (due to object-contain)
 const imageAspectRatio = naturalWidth / naturalHeight;
 const containerAspectRatio = containerWidth / containerHeight;

 let renderedWidth, renderedHeight;
 if (imageAspectRatio > containerAspectRatio) {
 renderedWidth = containerWidth;
 renderedHeight = containerWidth / imageAspectRatio;
 } else {
 renderedHeight = containerHeight;
 renderedWidth = containerHeight * imageAspectRatio;
 }
 
 const offsetX = (containerWidth - renderedWidth) / 2;
 const offsetY = (containerHeight - renderedHeight) / 2;

 const pointX = clientX - containerRect.left;
 const pointY = clientY - containerRect.top;

 const imageX = pointX - offsetX;
 const imageY = pointY - offsetY;

 // Check if the action was outside the image area (in the padding)
 if (imageX < 0 || imageX > renderedWidth || imageY < 0 || imageY > renderedHeight) {
 console.warn("Action was outside the image boundaries.");
 return null;
 }

 const xPercent = (imageX / renderedWidth) * 100;
 const yPercent = (imageY / renderedHeight) * 100;

 return { position: { x: pointX, y: pointY }, relativePosition: { xPercent, yPercent } };
 }, []);

 // A shared handler for both click and drop placements.
 const handlePlacement = useCallback((clientX: number, clientY: number, currentTarget: HTMLDivElement) => {
 if (!onProductDrop) return;
 const placement = getPlacementFromPoint(clientX, clientY, currentTarget);
 if (!placement) return;
 onProductDrop(placement.position, placement.relativePosition);
 }, [onProductDrop, getPlacementFromPoint]);

 
 const handleMovePlacement = useCallback((clientX: number, clientY: number, currentTarget: HTMLDivElement, id: string) => {
 const img = imgRef.current;
 if (!img || !onObjectMove) return;

 const containerRect = currentTarget.getBoundingClientRect();
 const { naturalWidth, naturalHeight } = img;
 const { width: containerWidth, height: containerHeight } = containerRect;

 const imageAspectRatio = naturalWidth / naturalHeight;
 const containerAspectRatio = containerWidth / containerHeight;

 let renderedWidth, renderedHeight;
 if (imageAspectRatio > containerAspectRatio) {
 renderedWidth = containerWidth;
 renderedHeight = containerWidth / imageAspectRatio;
 } else {
 renderedHeight = containerHeight;
 renderedWidth = containerHeight * imageAspectRatio;
 }
 
 const offsetX = (containerWidth - renderedWidth) / 2;
 const offsetY = (containerHeight - renderedHeight) / 2;

 const pointX = clientX - containerRect.left;
 const pointY = clientY - containerRect.top;

 const imageX = pointX - offsetX;
 const imageY = pointY - offsetY;

 if (imageX < 0 || imageX > renderedWidth || imageY < 0 || imageY > renderedHeight) {
 return;
 }

 const xPercent = (imageX / renderedWidth) * 100;
 const yPercent = (imageY / renderedHeight) * 100;

 onObjectMove(id, { x: pointX, y: pointY }, { xPercent, yPercent });
 }, [onObjectMove]);

const [touchDragObj, setTouchDragObj] = useState<{id: string, x: number, y: number} | null>(null);

 useEffect(() => {
 if (!touchDragObj) return;

 const handleTouchMove = (e: TouchEvent) => {
 e.preventDefault(); // stop scrolling
 const touch = e.touches[0];
 setTouchDragObj(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
 };

 const handleTouchEnd = (e: TouchEvent) => {
 const touch = e.changedTouches[0];
 const container = imgRef.current?.parentElement;
 if (!container) {
 setTouchDragObj(null);
 return;
 }
 handleMovePlacement(touch.clientX, touch.clientY, container as HTMLDivElement, touchDragObj.id);
 setTouchDragObj(null);
 };

 window.addEventListener('touchmove', handleTouchMove, { passive: false });
 window.addEventListener('touchend', handleTouchEnd);
 window.addEventListener('touchcancel', handleTouchEnd);

 return () => {
 window.removeEventListener('touchmove', handleTouchMove);
 window.removeEventListener('touchend', handleTouchEnd);
 window.removeEventListener('touchcancel', handleTouchEnd);
 };
 }, [touchDragObj, handleMovePlacement]);

 const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
 if (isDropZone && (onProductDrop || onScenePointSelect)) {
 const placement = getPlacementFromPoint(event.clientX, event.clientY, event.currentTarget);
 if (!placement) return;
 if (onScenePointSelect) {
 onScenePointSelect(placement.position, placement.relativePosition);
 return;
 }
 onProductDrop?.(placement.position, placement.relativePosition);
 } else {
 // Otherwise, it's an uploader, so open the file dialog.
 inputRef.current?.click();
 }
 };
 
 const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 setIsDraggingOver(true);
 if (isDropZone && onProductDrop) {
 const rect = event.currentTarget.getBoundingClientRect();
 setOrbPosition({
 x: event.clientX - rect.left,
 y: event.clientY - rect.top
 });
 }
 }, [isDropZone, onProductDrop]);

 const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 setIsDraggingOver(false);
 setOrbPosition(null);
 }, []);

 const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
 event.preventDefault();
 setIsDraggingOver(false);
 setOrbPosition(null);

 if (isDropZone && onProductDrop) {
 const dragData = event.dataTransfer.getData('text/plain');
 if (dragData.startsWith('reposition:')) {
 const id = dragData.split(':')[1];
 if (onObjectMove) {
 handleMovePlacement(event.clientX, event.clientY, event.currentTarget, id);
 }
 return;
 }
 if (dragData.startsWith('library-product:') && onLibraryProductDrop) {
 const payload = dragData.replace('library-product:', '');
 const [encodedUrl, encodedName] = payload.split('|');
 const placement = getPlacementFromPoint(event.clientX, event.clientY, event.currentTarget);
 if (placement && encodedUrl && encodedName) {
 onLibraryProductDrop(
 { url: decodeURIComponent(encodedUrl), name: decodeURIComponent(encodedName) },
 placement.position,
 placement.relativePosition
 );
 }
 return;
 }
 // Case 1: A product is being dropped onto the scene
 handlePlacement(event.clientX, event.clientY, event.currentTarget);
 } else {
 // Case 2: A file is being dropped to be uploaded
 const file = event.dataTransfer.files?.[0];
 if (file && file.type.startsWith('image/')) {
 const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
 if (!allowedTypes.includes(file.type)) {
 setFileTypeError('For best results, please use PNG, JPG, JPEG, or WebP formats.');
 } else {
 setFileTypeError(null);
 }
 onFileSelect(file);
 }
 }
 }, [isDropZone, onProductDrop, onLibraryProductDrop, onFileSelect, handlePlacement, handleMovePlacement, getPlacementFromPoint, onObjectMove]);
 
 const showHoverState = isDraggingOver || isTouchHovering;
 const currentOrbPosition = orbPosition || touchOrbPosition;
 const isActionable = isDropZone || !imageUrl;
 const fallbackAlt = id.includes('product')
 ? 'Uploaded product'
 : id.includes('moodboard')
 ? 'Mood Studio room scene'
 : 'Room scene preview';
 const interactionClasses = showHoverState
 ? 'border-white/80 border-solid is-dragging-over'
 : isDropZone
 ? 'border-white/60 cursor-crosshair border-dashed'
 : !imageUrl
 ? 'border-white/50 border-dashed hover:border-white/80 cursor-pointer'
 : 'border-white/50 border-dashed cursor-default';

 const uploaderClasses = `dp-panel ic-uploader-shell w-full aspect-square md:aspect-video relative overflow-hidden flex flex-col items-center justify-center transition-all duration-300 ${className} ${
 interactionClasses
 }`;

 return (
 <div className="flex flex-col items-center w-full">
 {label && <h3 className="dp-editorial-headline font-medium mb-4 text-2xl dp-muted dp-editorial-headline">{label}</h3>}
 <div
 className={uploaderClasses}
 onClick={isActionable ? handleClick : undefined}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 data-dropzone-id={id}
 data-scene-dropzone={isDropZone ? 'true' : undefined}
 >
 <input
 type="file"
 id={id}
 ref={inputRef}
 onChange={handleFileChange}
 accept="image/png, image/jpeg, image/webp"
 className="hidden"
 />
 {imageUrl ? (
 <>
 <img 
 ref={imgRef}
 src={imageUrl} 
 alt={label || fallbackAlt} 
 className="w-full h-full object-contain" 
 />
 {isDropZone && (showPerspectiveGrid || isDraggingOver || isTouchHovering) && (
 <PerspectiveGuideOverlay isVisible={true} />
 )}
 {currentOrbPosition && (
 <div 
 className="drop-orb" 
 style={{ 
 left: currentOrbPosition.x, 
 top: currentOrbPosition.y 
 }}
 ></div>
 )}
 {persistedOrbPosition && (
 <div 
 className="drop-orb" 
 style={{ 
 left: persistedOrbPosition.x, 
 top: persistedOrbPosition.y,
 opacity: 1,
 transform: 'translate(-50%, -50%) scale(1)',
 transition: 'none', // Appear instantly without animation
 }}
 ></div>
 )}
 {placedObjects.map((obj, index) => {
 if (obj.isVisible === false) return null;
 const containerRect = imgRef.current?.parentElement?.getBoundingClientRect();
 const derivedX = containerRect && obj.pixelPosition.x === 0 && obj.pixelPosition.y === 0 ? (obj.relativePosition.xPercent / 100) * containerRect.width : obj.pixelPosition.x;
 const derivedY = containerRect && obj.pixelPosition.x === 0 && obj.pixelPosition.y === 0 ? (obj.relativePosition.yPercent / 100) * containerRect.height : obj.pixelPosition.y;
 return (
 <div 
 key={obj.id} 
 className="ic-placed-object absolute w-12 h-12 dp-radius pointer-events-auto cursor-move animate-fade-in" draggable="true" onDragStart={(e) => { e.dataTransfer.setData('text/plain', `reposition:${obj.id}`); e.stopPropagation(); }}
 style={{ 
 left: touchDragObj?.id === obj.id ? touchDragObj.x - (imgRef.current?.parentElement?.getBoundingClientRect().left || 0) : derivedX, 
 top: touchDragObj?.id === obj.id ? touchDragObj.y - (imgRef.current?.parentElement?.getBoundingClientRect().top || 0) : derivedY,
 transform: `translate(-50%, -50%) scale(${obj.scale ?? 1}) rotate(${obj.rotation ?? 0}deg)`,
 zIndex: (touchDragObj?.id === obj.id ? 1000 : 10) + index,
 opacity: touchDragObj?.id === obj.id ? 0.8 : 1
 }}
 >
 <ImageWithFallback src={obj.thumbnailUrl} productName={obj.name || "Object"} productId={obj.id} className="ic-placed-object-image" style={{ filter: obj.styleFilter }} />
 {onObjectRotate && (
 <div className="ic-object-rotate-controls" aria-label={`Rotate ${obj.name || 'placed product'}`}>
 <button
 type="button"
 aria-label="Rotate left"
 onClick={(event) => {
 event.stopPropagation();
 onObjectRotate(obj.id, -15);
 }}
 >
 -15
 </button>
 <button
 type="button"
 aria-label="Rotate right"
 onClick={(event) => {
 event.stopPropagation();
 onObjectRotate(obj.id, 15);
 }}
 >
 +15
 </button>
 </div>
 )}
 {onObjectDelete && (
 <button
 type="button"
 className="ic-object-delete"
 aria-label={`Remove ${obj.name || 'placed product'}`}
 onClick={(event) => {
 event.stopPropagation();
 onObjectDelete(obj.id);
 }}
 >
 ×
 </button>
 )}
 </div>
 );
 })}
	 </>
 ) : (
 <div className="ic-uploader-empty text-center dp-muted">
 <UploadIcon />
 <p>Upload or drop image</p>
 </div>
 )}
 </div>
 {fileTypeError && (
 <div className="ic-upload-error animate-fade-in" role="alert">
 <WarningIcon />
 <span>{fileTypeError}</span>
 </div>
 )}
 </div>
 );
});

export default ImageUploader;
