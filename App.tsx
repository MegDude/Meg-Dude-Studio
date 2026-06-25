import { PRODUCT_LIBRARY, ProductLibraryItem } from './src/data/productLibrary';
import { suggestMatchingItems } from './src/services/matchingService';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { editProductBackground, generateMoodboard, generateMultiCompositeImage, stageRoomImage } from './src/services/openaiService';
import { Product } from './types';
import ImageUploader from './components/ImageUploader';
import ObjectCard from './components/ObjectCard';
import Spinner from './components/Spinner';
import DebugModal from './components/DebugModal';
import TouchGhost from './components/TouchGhost';
import PerspectiveGuideOverlay from './components/PerspectiveGuideOverlay';
import MeasureOverlay from './components/MeasureOverlay';
import BeforeAfterModal from './components/BeforeAfterModal';
import { ImageWithFallback } from './components/ImageWithFallback';
import { Menu, Ruler, Wand2 } from 'lucide-react';

type PlacedObjectState = {
 id: string;
 image: File;
 name: string;
 description: string;
 thumbnailUrl: string;
 relativePosition: { xPercent: number, yPercent: number };
 pixelPosition: { x: number, y: number };
 isVisible: boolean;
 scale?: number;
 rotation?: number;
 styleFilter?: string;
};


export const SCENE_LIBRARY = [
 { id: 1, name: 'Legends Skyline Living', type: 'Living Room', description: 'A bright furnished Legends living and dining room with downtown views.', thumbnailUrl: '/images/rooms/legends/living-skyline-01.jpeg' },
 { id: 2, name: 'Legends Media Living', type: 'Living Room', thumbnailUrl: '/images/rooms/legends/living-media-01.jpeg' },
 { id: 3, name: 'Legends TV Lounge', type: 'Living Room', thumbnailUrl: '/images/rooms/legends/living-tv-01.jpeg' },
 { id: 4, name: 'Legends Bedroom', type: 'Bedroom', thumbnailUrl: '/images/rooms/legends/bedroom-01.jpeg' },
 { id: 5, name: 'Legends Dining Room', type: 'Dining Room', thumbnailUrl: '/images/rooms/legends/dining-01.jpeg' },
 { id: 6, name: 'Legends Lounge Dining', type: 'Dining Room', thumbnailUrl: '/images/rooms/legends/lounge-dining-01.jpeg' },
 { id: 7, name: 'Legends White Kitchen', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/kitchen-white-01.jpeg' },
 { id: 8, name: 'Legends Warm Kitchen', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/kitchen-warm-01.jpeg' },
 { id: 9, name: 'Legends Open Kitchen Living', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/open-kitchen-living-01.jpeg' },
 { id: 10, name: 'Legends Empty Loft', type: 'Empty', description: 'A clean open Legends room for staging from scratch.', thumbnailUrl: '/images/rooms/legends/empty-loft-01.jpeg' },
];

export const DESIGN_ROOM_LIBRARY = SCENE_LIBRARY.filter(scene => scene.type !== 'Empty');

export const STAGE_ROOM_LIBRARY = [
 ...SCENE_LIBRARY.filter(scene => scene.type === 'Empty'),
 ...SCENE_LIBRARY.filter(scene => scene.type !== 'Empty'),
];

export const fetchUrlToFile = async (url: string, filename: string): Promise<File> => {
 const response = await fetch(url);
 const blob = await response.blob();
 return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

// Pre-load a transparent image to use for hiding the default drag ghost.
// This prevents a race condition on the first drag.
const transparentDragImage = new Image();
transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
 const arr = dataurl.split(',');
 if (arr.length < 2) throw new Error("Invalid data URL");
 const mimeMatch = arr[0].match(/:(.*?);/);
 if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

 const mime = mimeMatch[1];
 const bstr = atob(arr[1]);
 let n = bstr.length;
 const u8arr = new Uint8Array(n);
 while(n--){
 u8arr[n] = bstr.charCodeAt(n);
 }
 return new File([u8arr], filename, {type:mime});
};

const imageUrlToFile = async (imageUrl: string, filename: string): Promise<File> => {
 if (imageUrl.startsWith('data:')) {
 return dataURLtoFile(imageUrl, filename);
 }

 const response = await fetch(imageUrl);
 if (!response.ok) {
 throw new Error(`Could not load generated image (${response.status}).`);
 }
 const blob = await response.blob();
 return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

const fileToBase64 = (file: File): Promise<string> => {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.readAsDataURL(file);
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = error => reject(error);
 });
};

const serializePlacedObjects = async (objects: PlacedObjectState[]) => Promise.all(objects.map(async obj => {
 const imageBase64 = await fileToBase64(obj.image);
 return {
 ...obj,
 imageBase64,
 thumbnailUrl: imageBase64,
 image: undefined
 };
}));

const hydratePlacedObjects = (serializedObjects: any[], prefix: string): PlacedObjectState[] => {
 return serializedObjects
 .filter((obj: any) => obj?.imageBase64)
 .map((obj: any) => {
 const image = dataURLtoFile(obj.imageBase64, `${prefix}-${obj.id || Date.now()}.jpeg`);
 return {
 ...obj,
 image,
 thumbnailUrl: obj.imageBase64
 };
 });
};

const loadingMessages = [
 "Analyzing your product...",
 "Surveying the scene...",
 "Describing placement location with AI...",
 "Crafting the perfect composition prompt...",
 "Generating photorealistic options...",
 "Assembling the final scene..."
];

type AppMode = 'placement' | 'staging' | 'moodboard';
type DesignActionMode = 'add' | 'remove';
const WORKSPACE_HISTORY_CLEAR_KEY = 'interiorCreatorHistoryClearedNav20260624';

const DesignStepGuide: React.FC<{ activeStep: 1 | 2 | 3 }> = ({ activeStep }) => {
 const steps = [
 { number: 1, label: 'Add room scene' },
 { number: 2, label: 'Add products' },
 { number: 3, label: 'Move and generate' },
 ] as const;

 return (
 <div className="ic-step-guide" aria-label="Design workflow steps">
 {steps.map((step) => (
 <div key={step.number} className={`ic-step-item ${activeStep === step.number ? 'is-active' : ''}`}>
 <span className="ic-step-number">{step.number}</span>
 <span>{step.label}</span>
 </div>
 ))}
 </div>
 );
};

type WorkspaceControlBarProps = {
 appMode: AppMode;
 setAppMode: (mode: AppMode) => void;
 handleUndo: () => void;
 saveProject: () => void;
 loadProject: () => void;
 onHistoryClick: () => void;
 canUndo: boolean;
 historyCount: number;
 onNewProject: () => void;
};

const WorkspaceControlBar: React.FC<WorkspaceControlBarProps> = ({
 appMode,
 setAppMode,
 handleUndo,
 saveProject,
 loadProject,
 onHistoryClick,
 canUndo,
 historyCount,
 onNewProject,
}) => {
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const modes: Array<{ label: string; value: AppMode }> = [
 { label: 'Design Space', value: 'placement' },
 { label: 'Stage Listing', value: 'staging' },
 { label: 'Create Moodboard', value: 'moodboard' },
 ];

 const runMenuAction = (action: () => void) => {
 action();
 setIsMenuOpen(false);
 };

 return (
 <section className="ic-control-bar w-full">
 <nav className="ic-workspace-header w-full" aria-label="Workspace controls">
 <div className="ic-workspace-header-inner">
 <div className="ic-workspace-header-brand">
 <span className="dp-wordmark text-navy-900 text-sm font-bold">Interior Creator</span>
 <span className="ic-workspace-header-section">Workspace</span>
 </div>

 <div className="ic-workspace-header-tabs" role="tablist" aria-label="Workspace workflows">
 {modes.map((mode) => (
 <button
 key={mode.value}
 type="button"
 role="tab"
 aria-selected={appMode === mode.value}
 onClick={() => setAppMode(mode.value)}
 className={`ic-workflow-mode ${appMode === mode.value ? 'is-active' : ''}`}
 >
 {mode.label}
 </button>
 ))}
 </div>

 <div className="ic-workspace-header-actions" aria-label="Workspace actions">
 <button type="button" onClick={handleUndo} disabled={!canUndo} className="ic-header-action">
 Undo
 </button>
 <button type="button" onClick={saveProject} className="ic-header-action">
 Save
 </button>
 <button type="button" onClick={loadProject} className="ic-header-action">
 Load
 </button>
 <button
 onClick={() => setIsMenuOpen(open => !open)}
 className="ic-menu-trigger text-navy-700 hover:text-[#C8A96A] transition-colors"
 aria-label="Open workspace menu"
 aria-expanded={isMenuOpen}
 >
 <Menu className="h-5 w-5" />
 </button>
 </div>

 <div className="relative">
 {isMenuOpen && (
 <div className="ic-menu-panel dp-panel" role="menu">
 <button type="button" role="menuitem" onClick={() => runMenuAction(onHistoryClick)} className="ic-menu-item">
 History{historyCount > 0 ? ` ${historyCount}` : ''}
 </button>
 <button type="button" role="menuitem" onClick={() => runMenuAction(onNewProject)} className="ic-menu-item">
 New Project
 </button>
 </div>
 )}
 </div>
 </div>
 </nav>
 </section>
 );
};

const ModeSelector: React.FC<{ appMode: AppMode; setAppMode: (mode: AppMode) => void }> = ({ appMode, setAppMode }) => {
 const modes: Array<{ label: string; value: AppMode }> = [
 { label: 'Design Space', value: 'placement' },
 { label: 'Stage Listing', value: 'staging' },
 { label: 'Create Moodboard', value: 'moodboard' },
 ];

 return (
 <nav className="ic-mode-nav" aria-label="Workspace workflows">
 <p className="ic-rail-label">Workspace</p>
 <div className="ic-mode-nav-inner">
 {modes.map((mode) => (
 <button
 key={mode.value}
 onClick={() => setAppMode(mode.value)}
 className={`ic-workflow-mode ${appMode === mode.value ? 'is-active' : ''}`}
 >
 {mode.label}
 </button>
 ))}
 </div>
 </nav>
 );
};

const WorkflowProgress: React.FC<{ appMode: AppMode; activeStep: 1 | 2 | 3; hasScene: boolean; hasProduct: boolean; hasGenerated: boolean }> = ({
 appMode,
 activeStep,
 hasScene,
 hasProduct,
 hasGenerated,
}) => {
 const designSteps = [
 { label: 'Room Selected', complete: hasScene, active: activeStep === 1 },
 { label: 'Product Added', complete: hasProduct, active: activeStep === 2 },
 { label: 'Composition Ready', complete: hasScene && (hasProduct || activeStep === 3), active: activeStep === 3 },
 { label: 'Generated', complete: hasGenerated, active: false },
 { label: 'Exported', complete: false, active: false },
 ];
 const stageSteps = [
 { label: 'Property Selected', complete: hasScene, active: !hasScene },
 { label: 'Room Selected', complete: hasScene, active: hasScene },
 { label: 'Style Defined', complete: false, active: hasScene },
 { label: 'Staged', complete: hasGenerated, active: false },
 { label: 'Exported', complete: false, active: false },
 ];
 const moodSteps = [
 { label: 'Reference Ready', complete: hasScene, active: !hasScene },
 { label: 'Products Selected', complete: hasProduct, active: hasScene },
 { label: 'Theme Defined', complete: false, active: false },
 { label: 'Concepts Generated', complete: hasGenerated, active: false },
 { label: 'Exported', complete: false, active: false },
 ];
 const steps = appMode === 'placement' ? designSteps : appMode === 'staging' ? stageSteps : moodSteps;

 return (
 <div className="ic-progress-rail">
 <p className="ic-rail-label">Project Progress</p>
 <div className="ic-progress-list">
 {steps.map((step) => (
 <div key={step.label} className={`ic-progress-item ${step.complete ? 'is-complete' : ''} ${step.active ? 'is-active' : ''}`}>
 <span>{step.complete ? '✓' : '○'}</span>
 <p>{step.label}</p>
 </div>
 ))}
 </div>
 </div>
 );
};


const App: React.FC = () => {
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
 const [productImageFile, setProductImageFile] = useState<File | null>(null);
 const [sceneImage, setSceneImage] = useState<File | null>(null);
 const [isLoading, setIsLoading] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);
 const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
 const [persistedOrbPosition, setPersistedOrbPosition] = useState<{x: number, y: number} | null>(null);
 const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
 const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
 const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

 useEffect(() => {
 const handleRuntimeError = (event: ErrorEvent) => {
 console.error('Runtime error caught by workspace shell:', event.error || event.message);
 setError(`An unexpected app error occurred. ${event.message || 'Please reload and try again.'}`);
 setIsLoading(false);
 };

 const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
 const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || '');
 console.error('Unhandled async error caught by workspace shell:', event.reason);
 setError(`An unexpected generation error occurred. ${reason || 'Please try again.'}`);
 setIsLoading(false);
 event.preventDefault();
 };

 window.addEventListener('error', handleRuntimeError);
 window.addEventListener('unhandledrejection', handleUnhandledRejection);

 return () => {
 window.removeEventListener('error', handleRuntimeError);
 window.removeEventListener('unhandledrejection', handleUnhandledRejection);
 };
 }, []);

 // New states for Multi-Object and Compare
 const [originalSceneImageUrl, setOriginalSceneImageUrl] = useState<string | null>(null);
 const [isBeforeAfterModalOpen, setIsBeforeAfterModalOpen] = useState(false);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [editingProductBgId, setEditingProductBgId] = useState<string | null>(null);
  const [bgEditPrompt, setBgEditPrompt] = useState("");
  const [isBgEditing, setIsBgEditing] = useState(false);
 const [placedObjects, setPlacedObjects] = useState<PlacedObjectState[]>([]);

 // New states for Staging Mode
 const [appMode, setAppMode] = useState<AppMode>('placement');
 const [designActionMode, setDesignActionMode] = useState<DesignActionMode>('add');
 const [removePrompt, setRemovePrompt] = useState<string>('');
 const [stagingPrompt, setStagingPrompt] = useState<string>('');
 const [stagingKeepItems, setStagingKeepItems] = useState<string>('');
 const [stagingRemoveItems, setStagingRemoveItems] = useState<string>('');
 const [moodboardPrompt, setMoodboardPrompt] = useState<string>('');
 const [moodboardImageUrl, setMoodboardImageUrl] = useState<string | null>(null);
 const [moodboardSelectedProducts, setMoodboardSelectedProducts] = useState<{url: string, name: string}[]>([]);

 const [activeCategory, setActiveCategory] = useState<string>('All');
 const [activeDesignRoomCategory, setActiveDesignRoomCategory] = useState<string>('All');
 const [activeStageRoomCategory, setActiveStageRoomCategory] = useState<string>('All');

 type HistoryState = {
 sceneImage: File | null;
 placedObjects: PlacedObjectState[];
 };
 const [history, setHistory] = useState<HistoryState[]>([]);

  type WorkspaceHistoryEntry = {
    id: number;
    sceneBase64: string;
    serializedObjects: any[];
  };
  const [workspaceHistory, setWorkspaceHistory] = useState<WorkspaceHistoryEntry[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
 const designActiveStep: 1 | 2 | 3 = !sceneImage ? 1 : (designActionMode === 'add' && !productImageFile && placedObjects.length === 0 ? 2 : 3);
 const activeWorkflowLabel = appMode === 'placement' ? 'Design Space' : appMode === 'staging' ? 'Stage Listing' : 'Create Moodboard';
 const workspaceStatus = isLoading ? 'Generating' : sceneImage ? 'In Progress' : 'Setup Required';
 const hasGeneratedOutput = !!debugPrompt || !!moodboardImageUrl || (!!originalSceneImageUrl && sceneImageUrl !== originalSceneImageUrl);

 
 // State for touch drag & drop
 const [isTouchDragging, setIsTouchDragging] = useState<boolean>(false);
 const [touchGhostPosition, setTouchGhostPosition] = useState<{x: number, y: number} | null>(null);
 const [isHoveringDropZone, setIsHoveringDropZone] = useState<boolean>(false);
 const [touchOrbPosition, setTouchOrbPosition] = useState<{x: number, y: number} | null>(null);
 const sceneImgRef = useRef<HTMLImageElement>(null);
 
 const sceneImageUrl = useMemo(() => sceneImage ? URL.createObjectURL(sceneImage) : null, [sceneImage]);
 const productImageUrl = selectedProduct ? selectedProduct.imageUrl : null;

 
 const handleDragLayerStart = (e: React.DragEvent, index: number) => {
 e.dataTransfer.setData('text/plain', index.toString());
 };

 const handleDragLayerOver = (e: React.DragEvent) => {
 e.preventDefault();
 };

 const handleDragLayerDrop = (e: React.DragEvent, dropIndex: number) => {
 e.preventDefault();
 const dragIndexStr = e.dataTransfer.getData('text/plain');
 if (!dragIndexStr) return;
 const dragIndex = parseInt(dragIndexStr, 10);
 if (dragIndex === dropIndex) return;

 setPlacedObjects(prev => {
 const newItems = [...prev];
 const [draggedItem] = newItems.splice(dragIndex, 1);
 newItems.splice(dropIndex, 0, draggedItem);
 return newItems;
 });
 };

 const updateObjectScale = (id: string, scale: number) => {
 setPlacedObjects(prev => prev.map(p => p.id === id ? { ...p, scale } : p));
 };

 const updateObjectRotation = (id: string, rotation: number) => {
 setPlacedObjects(prev => prev.map(p => p.id === id ? { ...p, rotation } : p));
 };

 const handleProductImageUpload = useCallback((file: File) => {
 // useEffect will handle cleaning up the previous blob URL
 setError(null);
 try {
 const imageUrl = URL.createObjectURL(file);
 const product: Product = {
 id: Date.now(),
 name: file.name,
 imageUrl: imageUrl,
 };
 setProductImageFile(file);
 setSelectedProduct(product);
 if (sceneImage) {
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setPlacedObjects(prev => [...prev, {
 id: `${Date.now()}`,
 image: file,
 name: file.name,
 description: file.name,
 thumbnailUrl: imageUrl,
 relativePosition: { xPercent: 50, yPercent: 58 },
 pixelPosition: { x: 0, y: 0 },
 isVisible: true
 }]);
 }
 } catch(err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Could not load the product image. Details: ${errorMessage}`);
 console.error(err);
 }
 }, [sceneImage, placedObjects]);

 const placeProductFromLibrary = useCallback((file: File, name: string) => {
 const imageUrl = URL.createObjectURL(file);
 const product: Product = {
 id: Date.now(),
 name,
 imageUrl,
 };
 setProductImageFile(file);
 setSelectedProduct(product);
 setDesignActionMode('add');
 if (sceneImage) {
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setPlacedObjects(prev => [...prev, {
 id: `${Date.now()}`,
 image: file,
 name,
 description: name,
 thumbnailUrl: imageUrl,
 relativePosition: { xPercent: 50, yPercent: 58 },
 pixelPosition: { x: 0, y: 0 },
 isVisible: true
 }]);
 }
 }, [sceneImage, placedObjects]);

 const placeProductAtPosition = useCallback((file: File, name: string, position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => {
 const imageUrl = URL.createObjectURL(file);
 const product: Product = {
 id: Date.now(),
 name,
 imageUrl,
 };
 setProductImageFile(file);
 setSelectedProduct(product);
 setDesignActionMode('add');
 if (sceneImage) {
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setPlacedObjects(prev => [...prev, {
 id: `${Date.now()}`,
 image: file,
 name,
 description: name,
 thumbnailUrl: imageUrl,
 relativePosition,
 pixelPosition: position,
 isVisible: true
 }]);
 }
 }, [sceneImage, placedObjects]);

 const handleLibraryProductDrop = useCallback(async (
 product: { url: string; name: string },
 position: {x: number, y: number},
 relativePosition: { xPercent: number; yPercent: number; }
 ) => {
 setIsLoading(true);
 setError(null);
 try {
 const file = await fetchUrlToFile(product.url, `${product.name}.jpg`);
 placeProductAtPosition(file, product.name, position, relativePosition);
 } catch (err) {
 setError(`Failed to place ${product.name} from library.`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [placeProductAtPosition]);

 const handleSelectFromLibrary = useCallback(async (url: string, name: string, type: 'product' | 'scene') => {
 setIsLoading(true);
 setError(null);
 try {
 const file = await fetchUrlToFile(url, `${name}.jpg`);
 if (type === 'product') {
 placeProductFromLibrary(file, name);
 } else {
 setSceneImage(file);
 }
 } catch (err) {
 setError(`Failed to load ${name} from library.`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [placeProductFromLibrary]);

 const handleInstantStart = useCallback(async () => {
 setError(null);
 try {
 // Fetch the default images
 const [objectResponse, sceneResponse] = await Promise.all([
 fetch('/assets/object.jpeg'),
 fetch('/assets/scene.jpeg')
 ]);

 if (!objectResponse.ok || !sceneResponse.ok) {
 throw new Error('Failed to load default images');
 }

 // Convert to blobs then to File objects
 const [objectBlob, sceneBlob] = await Promise.all([
 objectResponse.blob(),
 sceneResponse.blob()
 ]);

 const objectFile = new File([objectBlob], 'object.jpeg', { type: 'image/jpeg' });
 const sceneFile = new File([sceneBlob], 'scene.jpeg', { type: 'image/jpeg' });

 // Update state with the new files
 setSceneImage(sceneFile);
 handleProductImageUpload(objectFile);
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Could not load default images. Details: ${errorMessage}`);
 console.error(err);
 }
 }, [handleProductImageUpload]);

 
  const saveIterationToHistory = async (sceneImg: File | null, objects: PlacedObjectState[]) => {
    if (!sceneImg) return;
    try {
      const sceneBase64 = await fileToBase64(sceneImg);
      const serializedObjects = await serializePlacedObjects(objects);
      
      const newEntry = { id: Date.now(), sceneBase64, serializedObjects };
      setWorkspaceHistory(prev => {
        const newHistory = [newEntry, ...prev].slice(0, 3);
        try {
          localStorage.setItem('interiorCreatorHistory', JSON.stringify(newHistory));
        } catch (e) {
          console.warn("Storage quota exceeded for history");
        }
        return newHistory;
      });
    } catch (e) {
      console.warn("Failed to save iteration to history", e);
    }
  };

  const loadWorkspaceHistoryEntry = useCallback((entry: WorkspaceHistoryEntry) => {
    const file = dataURLtoFile(entry.sceneBase64, 'history-' + entry.id + '.jpeg');
    setSceneImage(file);
    const loadedObjects = hydratePlacedObjects(entry.serializedObjects, 'history-obj-' + entry.id);
    setPlacedObjects(loadedObjects);
    setIsHistoryModalOpen(false);
  }, []);

  const handleUndo = useCallback(() => {
 if (history.length === 0) return;
 const previousState = history[history.length - 1];
 setSceneImage(previousState.sceneImage);
 setPlacedObjects(previousState.placedObjects);
 setHistory(prev => prev.slice(0, -1));
 }, [history]);

 
 const performSave = async (silent = false) => {
 try {
 const sceneBase64 = sceneImage ? await fileToBase64(sceneImage) : null;
 const serializedObjects = await serializePlacedObjects(placedObjects);
 const stateToSave = {
 appMode,
 stagingPrompt,
 sceneBase64,
 serializedObjects
 };
 localStorage.setItem('interiorCreatorWorkspace', JSON.stringify(stateToSave));
 if (!silent) alert('Project saved successfully!');
 } catch (err) {
 console.error(err);
 if (!silent) alert('Failed to save project. The image size might be too large for local storage.');
 }
 };

 const saveProject = useCallback(() => performSave(false), [appMode, stagingPrompt, sceneImage, placedObjects]);

 useEffect(() => {
 const interval = setInterval(() => {
 if (!sceneImage && placedObjects.length === 0 && !stagingPrompt.trim()) return;
 performSave(true);
 }, 30000);
 return () => clearInterval(interval);
 }, [appMode, stagingPrompt, sceneImage, placedObjects]);


 useEffect(() => {
 try {
 if (localStorage.getItem(WORKSPACE_HISTORY_CLEAR_KEY) !== 'true') {
 localStorage.removeItem('interiorCreatorHistory');
 localStorage.setItem(WORKSPACE_HISTORY_CLEAR_KEY, 'true');
 setWorkspaceHistory([]);
 }
      const savedHistory = localStorage.getItem('interiorCreatorHistory');
      if (savedHistory) {
        setWorkspaceHistory(JSON.parse(savedHistory));
      }
 } catch (err) {
 console.error('Failed to load workspace history', err);
 }
 }, []);

 const loadProject = useCallback(async () => {
 try {
 const savedData = localStorage.getItem('interiorCreatorWorkspace');
 if (!savedData) {
 alert('No saved project found.');
 return;
 }
 const state = JSON.parse(savedData);
 
 setAppMode(state.appMode || 'placement');
 setStagingPrompt(state.stagingPrompt || '');
 
 if (state.sceneBase64) {
 const file = dataURLtoFile(state.sceneBase64, `loaded-scene-${Date.now()}.jpeg`);
 setSceneImage(file);
 }
 
 if (state.serializedObjects) {
 const loadedObjects = hydratePlacedObjects(state.serializedObjects, `loaded-object-${Date.now()}`);
 setPlacedObjects(loadedObjects);
 }
 
 alert('Project loaded successfully!');
 } catch (err) {
 console.error(err);
 alert('Failed to load project.');
 }
 }, []);

 const handleObjectMove = useCallback((id: string, pixelPosition: {x: number, y: number}, relativePosition: {xPercent: number, yPercent: number}) => {
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setPlacedObjects(prev => prev.map(p => p.id === id ? { ...p, pixelPosition, relativePosition } : p));
 }, [sceneImage, placedObjects]);

 const handleProductDrop = useCallback((position: {x: number, y: number}, relativePosition: { xPercent: number; yPercent: number; }) => {
 if (navigator.vibrate) navigator.vibrate(50);
 if (!productImageFile || !sceneImage || !selectedProduct) {
 console.warn('Placement ignored because the room or selected product is missing.', {
 hasProductFile: !!productImageFile,
 hasSceneImage: !!sceneImage,
 hasSelectedProduct: !!selectedProduct,
 });
 setDesignActionMode('add');
 return;
 }
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setPlacedObjects(prev => [...prev, {
 id: Date.now().toString(),
 image: productImageFile,
 name: selectedProduct.name,
 description: selectedProduct.name,
 thumbnailUrl: selectedProduct.imageUrl,
 relativePosition,
 pixelPosition: position,
 isVisible: true
 }]);

 // Keep the product selected so they can drag it multiple times,
 // or select another from the library!
 }, [productImageFile, sceneImage, selectedProduct, placedObjects]);

 const handleGenerateComposition = useCallback(async () => {
 if (!sceneImage || placedObjects.length === 0) return;
 
 if (!originalSceneImageUrl && sceneImageUrl) {
 setOriginalSceneImageUrl(sceneImageUrl);
 }
 
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setIsLoading(true);
 setError(null);
 try {
 const activeObjects = placedObjects.filter(obj => obj.isVisible !== false);
 const mappedObjects = activeObjects.map(obj => ({
 image: obj.image,
 description: obj.description,
 relativePosition: obj.relativePosition,
 scale: obj.scale,
 rotation: obj.rotation
 }));
 
 const { finalImageUrl, debugImageUrl, finalPrompt } = await generateMultiCompositeImage(
 mappedObjects, 
 sceneImage,
 sceneImage.name
 );
 
 setDebugImageUrl(debugImageUrl);
 setDebugPrompt(finalPrompt);
 const newSceneFile = await imageUrlToFile(finalImageUrl, `generated-scene-${Date.now()}.jpeg`);
 setSceneImage(newSceneFile);
        setPlacedObjects([]);
        saveIterationToHistory(newSceneFile, []);

 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Failed to generate the image. ${errorMessage}`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [placedObjects, sceneImage, sceneImageUrl, originalSceneImageUrl]);

 const handleGenerateRemoval = useCallback(async () => {
 if (!sceneImage || !removePrompt.trim()) return;
 
 if (!originalSceneImageUrl && sceneImageUrl) {
 setOriginalSceneImageUrl(sceneImageUrl);
 }
 
 setHistory(prev => [...prev, { sceneImage, placedObjects }].slice(-10));
 setIsLoading(true);
 setError(null);
 try {
 const removalInstruction = `
Remove the following item or visual element from the room image: "${removePrompt.trim()}".
Reconstruct the wall, floor, furniture, lighting, shadows, and background surfaces naturally where the item was removed.
Preserve the original architecture, camera angle, image crop, color tone, and all items not named for removal.
Return only the cleaned final room image.
`;
 const { finalImageUrl, finalPrompt } = await stageRoomImage(sceneImage, removalInstruction);
 const newSceneFile = await imageUrlToFile(finalImageUrl, `removed-item-scene-${Date.now()}.jpeg`);
 setSceneImage(newSceneFile);
 setPlacedObjects([]);
 setDebugImageUrl(null);
 setDebugPrompt(finalPrompt);
 saveIterationToHistory(newSceneFile, []);
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Failed to remove item from image. ${errorMessage}`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [sceneImage, removePrompt, sceneImageUrl, originalSceneImageUrl, placedObjects]);


 

  const handleEditBackgroundSubmit = async () => {
    if (!editingProductBgId || !bgEditPrompt.trim()) return;
    
    setIsBgEditing(true);
    try {
      const productToEdit = placedObjects.find(p => p.id === editingProductBgId);
      if (!productToEdit) throw new Error("Product not found");

      const { finalImageUrl } = await editProductBackground(productToEdit.image, bgEditPrompt.trim());
      
      const newImageFile = await imageUrlToFile(finalImageUrl, `edited-bg-${productToEdit.id}.jpg`);
      
      setPlacedObjects(prev => 
        prev.map(p => p.id === editingProductBgId ? { ...p, image: newImageFile, thumbnailUrl: finalImageUrl } : p)
      );
      
      // Save to history? Optional, let's do it immediately after state update.
      saveIterationToHistory(sceneImage, placedObjects.map(p => p.id === editingProductBgId ? { ...p, image: newImageFile, thumbnailUrl: finalImageUrl } : p));
      
      setEditingProductBgId(null);
      setBgEditPrompt("");
    } catch (err) {
      console.error(err);
      alert("Failed to edit background. Please try again.");
    } finally {
      setIsBgEditing(false);
    }
  };

  const handleShare = async (imageUrl: string, filename: string, title: string) => {
    if (navigator.share) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title,
            files: [file],
          });
        } else {
          alert("Sharing files is not supported by your browser.");
        }
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      alert("Web Share API is not supported in your browser.");
    }
  };

  const handleReset = useCallback(() => {
 // Let useEffect handle URL revocation
 setSelectedProduct(null);
 setProductImageFile(null);
 setSceneImage(null);
 setError(null);
 setIsLoading(false);
 setPersistedOrbPosition(null);
 setDebugImageUrl(null);
 setDebugPrompt(null);
 }, []);

 const handleChangeProduct = useCallback(() => {
 // Let useEffect handle URL revocation
 setSelectedProduct(null);
 setProductImageFile(null);
 setPersistedOrbPosition(null);
 setDebugImageUrl(null);
 setDebugPrompt(null);
 }, []);
 
 const handleChangeScene = useCallback(() => {
 setSceneImage(null);
 setPersistedOrbPosition(null);
 setDebugImageUrl(null);
 setDebugPrompt(null);
 }, []);

 const handleStagingSubmit = useCallback(async () => {
 if (!sceneImage || (!stagingPrompt.trim() && !placedObjects.some(obj => obj.isVisible !== false))) return;
 
 if (!originalSceneImageUrl && sceneImageUrl) {
 setOriginalSceneImageUrl(sceneImageUrl);
 }
 
 setIsLoading(true);
 setError(null);
 try {
 let fullPrompt = stagingPrompt.trim() || 'Composite the selected products into the room naturally for a polished real estate listing preview.';
 if (stagingKeepItems.trim() !== '') {
 fullPrompt += `\n**Items to carefully KEEP**: ${stagingKeepItems}`;
 }
 if (stagingRemoveItems.trim() !== '') {
 fullPrompt += `\n**Items to definitely REMOVE**: ${stagingRemoveItems}`;
 }
 if (placedObjects.some(obj => obj.isVisible !== false)) {
 const activeObjects = placedObjects.filter(obj => obj.isVisible !== false).map(obj => ({
 image: obj.image,
 description: `${obj.description}. Stage listing direction: ${fullPrompt}`,
 relativePosition: obj.relativePosition,
 scale: obj.scale,
 rotation: obj.rotation
 }));
 const { finalImageUrl, finalPrompt } = await generateMultiCompositeImage(
 activeObjects,
 sceneImage,
 fullPrompt
 );
 const newSceneFile = await imageUrlToFile(finalImageUrl, `staged-composite-${Date.now()}.jpeg`);
 setSceneImage(newSceneFile);
 setPlacedObjects([]);
 setDebugImageUrl(null);
 saveIterationToHistory(newSceneFile, []);
 setDebugPrompt(finalPrompt);
 return;
 }
 const { finalImageUrl, finalPrompt } = await stageRoomImage(sceneImage, fullPrompt);
 const newSceneFile = await imageUrlToFile(finalImageUrl, `staged-scene-${Date.now()}.jpeg`);
 setSceneImage(newSceneFile);
        setDebugImageUrl(null);
        saveIterationToHistory(newSceneFile, []);
 setDebugPrompt(finalPrompt);
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Failed to generate staging in image. ${errorMessage}`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [sceneImage, stagingPrompt, stagingKeepItems, stagingRemoveItems, sceneImageUrl, originalSceneImageUrl, placedObjects]);
 
 const handleMoodboardSubmit = useCallback(async () => {
 if (moodboardSelectedProducts.length === 0 || !moodboardPrompt.trim()) return;
 
 setIsLoading(true);
 setError(null);
 try {
 const { finalImageUrl, finalPrompt } = await generateMoodboard(moodboardSelectedProducts, moodboardPrompt);
 setMoodboardImageUrl(finalImageUrl);
 setDebugPrompt(finalPrompt);
 } catch (err) {
 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
 setError(`Failed to generate mood board. ${errorMessage}`);
 console.error(err);
 } finally {
 setIsLoading(false);
 }
 }, [moodboardSelectedProducts, moodboardPrompt]);

 useEffect(() => {
 // Clean up the scene's object URL when the component unmounts or the URL changes
 return () => {
 if (sceneImageUrl) URL.revokeObjectURL(sceneImageUrl);
 };
 }, [sceneImageUrl]);
 
 useEffect(() => {
 // Clean up the product's object URL when the component unmounts or the URL changes
 return () => {
 if (productImageUrl && productImageUrl.startsWith('blob:')) {
 URL.revokeObjectURL(productImageUrl);
 }
 };
 }, [productImageUrl]);

 useEffect(() => {
 let interval: ReturnType<typeof setInterval> | undefined;
 if (isLoading) {
 setLoadingMessageIndex(0); // Reset on start
 interval = setInterval(() => {
 setLoadingMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
 }, 3000);
 }
 return () => {
 if (interval) clearInterval(interval);
 };
 }, [isLoading]);

 const [isMouseDraggingProduct, setIsMouseDraggingProduct] = useState<boolean>(false);
 
 const [isSuggesting, setIsSuggesting] = useState(false);
 const [suggestedProducts, setSuggestedProducts] = useState<ProductLibraryItem[]>([]);
 const [objectVariations, setObjectVariations] = useState<{[id: string]: string[]}>({});

 const handleQuickIterate = (objId: string) => {
 setObjectVariations(prev => ({
 ...prev,
 [objId]: [
 'sepia(0.0) brightness(1.8) contrast(0.9) saturate(0.1)', 
 'sepia(0.3) brightness(1.2) hue-rotate(-10deg) saturate(1.2)', 
 'grayscale(0.5) brightness(1.1) contrast(1.1) sepia(0.1)'
 ]
 }));
 };
 
 const handleSuggestItems = async () => {
 setIsSuggesting(true);
 const suggestions = await suggestMatchingItems(placedObjects);
 setSuggestedProducts(suggestions as any);
 setIsSuggesting(false);
 };
 
 const handleTouchStart = (e: React.TouchEvent) => {
 if (!selectedProduct) return;
 // Prevent page scroll
 e.preventDefault();
 setIsTouchDragging(true);
 const touch = e.touches[0];
 setTouchGhostPosition({ x: touch.clientX, y: touch.clientY });
 };

 useEffect(() => {
 const handleTouchMove = (e: TouchEvent) => {
 if (!isTouchDragging) return;
 const touch = e.touches[0];
 setTouchGhostPosition({ x: touch.clientX, y: touch.clientY });
 
 const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
 const dropZone = elementUnderTouch?.closest<HTMLDivElement>('[data-scene-dropzone="true"]');

 if (dropZone) {
 const rect = dropZone.getBoundingClientRect();
 setTouchOrbPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
 setIsHoveringDropZone(true);
 } else {
 setIsHoveringDropZone(false);
 setTouchOrbPosition(null);
 }
 };

 const handleTouchEnd = (e: TouchEvent) => {
 if (!isTouchDragging) return;
 
 const touch = e.changedTouches[0];
 const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
 const dropZone = elementUnderTouch?.closest<HTMLDivElement>('[data-scene-dropzone="true"]');

 if (dropZone && sceneImgRef.current) {
 const img = sceneImgRef.current;
 const containerRect = dropZone.getBoundingClientRect();
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

 const dropX = touch.clientX - containerRect.left;
 const dropY = touch.clientY - containerRect.top;

 const imageX = dropX - offsetX;
 const imageY = dropY - offsetY;
 
 if (!(imageX < 0 || imageX > renderedWidth || imageY < 0 || imageY > renderedHeight)) {
 const xPercent = (imageX / renderedWidth) * 100;
 const yPercent = (imageY / renderedHeight) * 100;
 
 handleProductDrop({ x: dropX, y: dropY }, { xPercent, yPercent });
 }
 }

 setIsTouchDragging(false);
 setTouchGhostPosition(null);
 setIsHoveringDropZone(false);
 setTouchOrbPosition(null);
 };

 if (isTouchDragging) {
 document.body.style.overflow = 'hidden'; // Prevent scrolling
 window.addEventListener('touchmove', handleTouchMove, { passive: false });
 window.addEventListener('touchend', handleTouchEnd, { passive: false });
 }

 return () => {
 document.body.style.overflow = 'auto';
 window.removeEventListener('touchmove', handleTouchMove);
 window.removeEventListener('touchend', handleTouchEnd);
 };
 }, [isTouchDragging, handleProductDrop]);

 const renderContent = () => {
 const renderLibraryGrid = (
 items: {id: number | string, name: string, thumbnailUrl?: string, imageUrl?: string, category?: string, type?: string, price?: string, brand?: string}[],
 type: 'product' | 'mood-product' | 'design-room' | 'stage-room',
 label: string
 ) => {
 let filteredItems = items;
 if ((type === 'product' || type === 'mood-product') && activeCategory !== 'All') {
 filteredItems = items.filter(item => item.category === activeCategory);
 } else if (type === 'design-room' && activeDesignRoomCategory !== 'All') {
 filteredItems = items.filter(item => item.type === activeDesignRoomCategory);
 } else if (type === 'stage-room' && activeStageRoomCategory !== 'All') {
 filteredItems = items.filter(item => item.type === activeStageRoomCategory);
 }
 const selectionType = type === 'product' ? 'product' : 'scene';
 
 return (
 <div className="mt-4 w-full">
 <p className="dp-library-label">{label}</p>
 
 {(type === 'product' || type === 'mood-product') && (
 <div className="dp-filter-row">
 {['All', ...Array.from(new Set(items.map(item => item.category).filter(Boolean) as string[]))].map(cat => (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={`dp-filter-chip ${activeCategory === cat ? 'dp-filter-chip-active' : ''}`}
 >
 {cat}
 </button>
 ))}
 </div>
 )}

 {type === 'design-room' && (
 <div className="dp-filter-row">
 {['All', 'Living Room', 'Bedroom', 'Dining Room', 'Kitchen'].map(cat => (
 <button
 key={cat}
 onClick={() => setActiveDesignRoomCategory(cat)}
 className={`dp-filter-chip ${activeDesignRoomCategory === cat ? 'dp-filter-chip-active' : ''}`}
 >
 {cat}
 </button>
 ))}
 </div>
 )}

 {type === 'stage-room' && (
 <div className="dp-filter-row">
 {['All', 'Living Room', 'Bedroom', 'Dining Room', 'Kitchen', 'Empty'].map(cat => (
 <button
 key={cat}
 onClick={() => setActiveStageRoomCategory(cat)}
 className={`dp-filter-chip ${activeStageRoomCategory === cat ? 'dp-filter-chip-active' : ''}`}
 >
 {cat}
 </button>
 ))}
 </div>
 )}

 <div className="dp-room-grid">
 {filteredItems.map(item => {
 const assetUrl = (item.thumbnailUrl || item.imageUrl) as string;
 const isMoodSelected = type === 'mood-product' && moodboardSelectedProducts.some(p => p.url === assetUrl);
 return (
 <div key={item.id} className="dp-library-item">
 <button
 onClick={() => {
 if (type === 'mood-product') {
 setMoodboardSelectedProducts(prev => {
 const exists = prev.some(p => p.url === assetUrl);
 return exists ? prev.filter(p => p.url !== assetUrl) : [...prev, { name: item.name, url: assetUrl }];
 });
 return;
 }
 handleSelectFromLibrary(assetUrl, item.name, selectionType);
 }}
 draggable={type === 'product'}
 onDragStart={(event) => {
 if (type !== 'product') return;
 event.dataTransfer.effectAllowed = 'copy';
 event.dataTransfer.setData('text/plain', `library-product:${encodeURIComponent(assetUrl)}|${encodeURIComponent(item.name)}`);
 }}
 disabled={isLoading}
 className={`dp-room-card group ${isMoodSelected ? 'is-selected' : ''}`}
 aria-label={`${type === 'product' ? 'Place' : isMoodSelected ? 'Remove' : 'Select'} ${item.name}`}
 title={item.name}
 >
 {type === 'product' || type === 'mood-product' ? (
 <ImageWithFallback src={assetUrl} productName={item.name} productId={String(item.id)} className="dp-room-card-image" alt={item.name} />
 ) : (
 <img src={assetUrl} alt={item.name} className="dp-room-card-image" />
 )}
 </button>
 <span className="dp-room-card-caption">{item.name}</span>
 </div>
 )})}
 </div>
 </div>
 );
 };

 if (error) {
 return (
 <div className="text-center animate-fade-in bg-red-50 border border-red-200 p-8 dp-radius max-w-2xl mx-auto">
 <h2 className="text-3xl dp-editorial-headline font-normal mb-4 text-red-800 dp-editorial-headline">An Error Occurred</h2>
 <p className="text-lg text-red-700 mb-6">{error}</p>
 <button
 onClick={handleReset}
 className="bg-red-600 hover:bg-red-700 text-white font-bold text-lg transition-colors dp-radius dp-btn-text h-12"
 >
 Try Again
 </button>
 </div>
 );
 }
 
 if (appMode === 'staging') {
 if (!sceneImage) {
 return (
 <div className="w-full max-w-3xl mx-auto animate-fade-in flex flex-col items-center">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-5 text-navy-900 dp-editorial-headline">Upload <span className="text-[#C8A96A]">Room</span></h2>
 <div className="w-full">
 <ImageUploader 
 id="scene-uploader-staging"
 className="ic-scene-frame"
 onFileSelect={setSceneImage}
 imageUrl={sceneImageUrl}
 />
 {renderLibraryGrid(STAGE_ROOM_LIBRARY, 'stage-room', 'Rooms')}
 </div>
 <p className="dp-soft mt-6 text-center">Upload an empty or partially empty room to begin staging.</p>
 </div>
 );
 }

 return (
 <div className="w-full animate-fade-in">
 <div className="ic-editor-layout">
 <section className="ic-canvas-panel">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-5 text-navy-900 dp-editorial-headline">Room <span className="text-[#C8A96A]">Scene</span></h2>
 <div className="w-full mb-6 relative">
  <ImageUploader 
 ref={sceneImgRef}
 id="scene-uploader-staging-loaded" 
 className="ic-scene-frame"
 onFileSelect={setSceneImage} 
 imageUrl={sceneImageUrl}
 isDropZone={!!sceneImage && !isLoading}
 onProductDrop={handleProductDrop}
 onObjectMove={handleObjectMove}
 onLibraryProductDrop={handleLibraryProductDrop}
 showPerspectiveGrid={isMouseDraggingProduct || isTouchDragging}
 showDebugButton={!!debugPrompt && !isLoading}
 onDebugClick={() => setIsDebugModalOpen(true)}
 isTouchHovering={isHoveringDropZone}
 touchOrbPosition={touchOrbPosition}
 placedObjects={placedObjects.filter(o => o.isVisible !== false)}
  />
  <MeasureOverlay isActive={isMeasureMode} onClose={() => setIsMeasureMode(false)} />
 <div className="text-center mt-3 flex flex-col justify-center items-center gap-3">
 {originalSceneImageUrl && sceneImageUrl !== originalSceneImageUrl && (
 <div className="ic-action-row flex flex-row gap-3 justify-center animate-fade-in w-full flex-wrap">
 
        <button
          onClick={() => setIsMeasureMode(true)}
          className="dp-btn-utility dp-btn-text dp-radius border hover:-translate-y-[1px] transition-all hover:bg-gold-100 font-bold py-3 px-4 dp-radius text-sm border border-navy-200 flex items-center gap-2 dp-btn-text"
        >
          <Ruler className="w-4 h-4" />
          Measure Space
        </button>
  
        <button
          onClick={() => setIsBeforeAfterModalOpen(true)}
          className="dp-btn-utility dp-btn-text dp-radius border hover:-translate-y-[1px] transition-all hover:bg-gold-100 font-bold py-3 px-6 dp-radius text-sm border border-navy-200 flex items-center gap-2 dp-btn-text"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
 Compare Before / After
 </button>
 <a
 href={sceneImageUrl!}
 download="staged-room.jpg"
 className="bg-navy-900 text-white hover:-translate-y-[1px] transition-transform dp-radius min-h-[48px] dp-btn-text dp-radius transition-all border border-navy-700 flex items-center gap-2"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
 Download Image
 </a>
          {navigator.share && (
            <button
              onClick={() => handleShare(sceneImageUrl!, "staged-room.jpg", "My Staged Room")}
              className="bg-navy-900 text-white hover:-translate-y-[1px] transition-transform dp-radius min-h-[48px] dp-btn-text dp-radius transition-all border border-navy-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share
            </button>
          )}
 </div>
 )}
 {!isLoading && (
 <button
 onClick={handleChangeScene}
 className="text-sm text-gold-600 hover:text-gold-800 font-semibold mt-2 dp-radius dp-btn-text h-12"
 >
 Change Room
 </button>
 )}
 </div>
 </div>

 <div className="ic-stage-panel w-full dp-panel p-4 flex flex-col gap-3 mt-4">
 <div className="flex flex-col gap-2">
 <label className="dp-kicker text-navy-500">Describe the staging style</label>
 <div className="flex flex-wrap gap-2 mb-2">
 <button
 onClick={() => setStagingPrompt("Scandinavian minimalism, light oak wood tones, neutral colors like white, beige, and soft gray, cozy textured fabrics like boucle and wool, simple clean lines, abundant natural light, minimalist functional decor.")}
 className="ic-stage-chip dp-kicker"
 >
 Scandi
 </button>
 <button
 onClick={() => setStagingPrompt("Industrial style, exposed brick walls, raw concrete, dark metal accents, distressed leather furniture, vintage Edison bulb lighting, moody atmospheric lighting, raw and unfinished textures.")}
 className="ic-stage-chip dp-kicker"
 >
 Industrial
 </button>
 <button
 onClick={() => setStagingPrompt("Bohemian eclectic style, warm earthy tones like terracotta and mustard, rich layered textures, macrame wall hangings, rattan and wicker furniture, abundant lush indoor plants, vintage patterned rugs, relaxed and inviting.")}
 className="ic-stage-chip dp-kicker"
 >
 Boho
 </button>
 <button
 onClick={() => setStagingPrompt("Minimalist Mid-Century Modern layout with a grey tufted sofa, walnut wood coffee table, brass floor lamp, and a large potted plant.")}
 className="ic-stage-chip dp-kicker"
 >
 Mid-Century
 </button>
 </div>
 </div>
 <textarea 
 value={stagingPrompt}
 onChange={(e) => setStagingPrompt(e.target.value)}
 placeholder="e.g. Modern mid-century living room with a grey sofa, wooden coffee table, and a large Monstera plant..."
 className="ic-stage-field w-full p-4 border border-navy-200 dp-radius focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[100px] resize-y bg-white"
 disabled={isLoading}
 />
 <div className="flex flex-col gap-2 w-full">
 <input
 type="text"
 value={stagingKeepItems}
 onChange={(e) => setStagingKeepItems(e.target.value)}
 placeholder="Items to KEEP (e.g. 'wood floors, existing fireplace')"
 className="ic-stage-field w-full p-3 border border-navy-200 dp-radius focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm bg-white"
 disabled={isLoading}
 />
 <input
 type="text"
 value={stagingRemoveItems}
 onChange={(e) => setStagingRemoveItems(e.target.value)}
 placeholder="Items to REMOVE (e.g. 'old rug, mess on table')"
 className="ic-stage-field w-full p-3 border border-navy-200 dp-radius focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm bg-white"
 disabled={isLoading}
 />
 </div>
 <button
 onClick={handleStagingSubmit}
 disabled={isLoading || (!stagingPrompt.trim() && !placedObjects.some(obj => obj.isVisible !== false))}
 className="ic-stage-submit dp-kicker"
 >
 {isLoading ? 'Staging Room...' : 'Stage Room'}
 </button>
 </div>
 
 <div className="text-center mt-5 min-h-[3rem] flex flex-col justify-center items-center">
 {isLoading && (
 <div className="animate-fade-in">
 <Spinner />
 <p className="text-xl mt-4 text-navy-500 transition-opacity duration-500">Generating interior design staging...</p>
 </div>
 )}
 </div>
 </section>
 <aside className="ic-asset-panel">
 <p className="dp-soft text-center text-sm mb-3">Tap or drag products onto the room. Switch rooms below.</p>
 {renderLibraryGrid(PRODUCT_LIBRARY, 'product', 'Products')}
 {renderLibraryGrid(STAGE_ROOM_LIBRARY, 'stage-room', 'Rooms')}
 </aside>
 </div>
 </div>
 );
 }

 if (appMode === 'placement' && !sceneImage) {
 return (
 <div className="w-full max-w-4xl mx-auto animate-fade-in flex flex-col gap-5">
 <div className="ic-workflow-panel flex flex-col">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-4 text-navy-900 dp-editorial-headline">Start With <span className="text-[#C8A96A]">Room Scene</span></h2>
 <ImageUploader 
 id="scene-uploader"
 className="ic-scene-frame"
 onFileSelect={(file) => {
 setSceneImage(file);
 setOriginalSceneImageUrl(URL.createObjectURL(file));
 }}
 imageUrl={sceneImageUrl}
 />
 {renderLibraryGrid(DESIGN_ROOM_LIBRARY, 'design-room', 'Rooms')}
 </div>
 <div className="text-center mt-2 min-h-[3rem] flex flex-col justify-center items-center">
 <p className="dp-soft animate-fade-in">
 Choose or upload a room, then add products or remove an item.
 </p>
 <p className="dp-soft animate-fade-in mt-2">
 Or click{' '}
 <button
 onClick={handleInstantStart}
 className="font-bold text-[#C8A96A] hover:text-[#B8963E] transition-colors"
 >
 here
 </button>
 {' '}for an instant start.
 </p>
 </div>
 </div>
 );
 }

 if (appMode === 'placement' && sceneImage && designActionMode === 'remove') {
 return (
 <div className="w-full max-w-5xl mx-auto animate-fade-in flex flex-col gap-5">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-1 text-navy-900 dp-editorial-headline">Edit <span className="text-[#C8A96A]">Room Scene</span></h2>
 <ImageUploader 
 ref={sceneImgRef}
 id="scene-uploader-remove"
 className="ic-scene-frame"
 onFileSelect={(file) => {
 setSceneImage(file);
 setOriginalSceneImageUrl(URL.createObjectURL(file));
 }}
 imageUrl={sceneImageUrl}
 isDropZone={!!sceneImage && !isLoading}
 onScenePointSelect={(position, relativePosition) => {
 setPersistedOrbPosition(position);
 setRemovePrompt(`Remove the item located around ${Math.round(relativePosition.xPercent)}% from the left and ${Math.round(relativePosition.yPercent)}% from the top of the room image.`);
 }}
 showPerspectiveGrid={isMouseDraggingProduct || isTouchDragging}
 showDebugButton={!!debugPrompt && !isLoading}
 onDebugClick={() => setIsDebugModalOpen(true)}
 isTouchHovering={isHoveringDropZone}
 touchOrbPosition={touchOrbPosition}
 placedObjects={placedObjects.filter(o => o.isVisible !== false)}
 />
 <div className="ic-stage-panel w-full dp-panel p-4 flex flex-col gap-3">
 <div className="flex items-center justify-center gap-5">
 <button
 onClick={() => setDesignActionMode('add')}
 className={`dp-kicker transition-colors ${designActionMode === 'add' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Add Item
 </button>
 <button
 onClick={() => setDesignActionMode('remove')}
 className={`dp-kicker transition-colors ${designActionMode === 'remove' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Remove Item
 </button>
 </div>
 <label className="dp-kicker text-navy-500">What should be removed?</label>
 <textarea
 value={removePrompt}
 onChange={(e) => setRemovePrompt(e.target.value)}
 placeholder="e.g. Remove the old rug, clutter on the counter, extra chair by the window..."
 className="ic-stage-field w-full p-4 border border-navy-200 dp-radius focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[88px] resize-y bg-white"
 disabled={isLoading}
 />
 <button
 onClick={handleGenerateRemoval}
 disabled={isLoading || !removePrompt.trim()}
 className="ic-stage-submit dp-kicker"
 >
 {isLoading ? 'Updating...' : 'Generate Clean Room'}
 </button>
 </div>
 <div className="text-center mt-2 min-h-[3rem] flex flex-col justify-center items-center">
 {isLoading ? (
 <div className="animate-fade-in">
 <Spinner />
 <p className="text-xl mt-4 text-navy-500 transition-opacity duration-500">Removing item and rebuilding the room...</p>
 </div>
 ) : (
 <button
 onClick={handleChangeScene}
 className="text-sm text-gold-600 hover:text-gold-700 font-semibold transition-colors dp-btn-text"
 >
 Change Room
 </button>
 )}
 </div>
 <div className="ic-secondary-library">
 {renderLibraryGrid(DESIGN_ROOM_LIBRARY, 'design-room', 'Rooms')}
 </div>
 </div>
 );
 }

 if (appMode === 'placement' && sceneImage && designActionMode === 'add' && !productImageFile && placedObjects.length === 0) {
 return (
 <div className="w-full animate-fade-in flex flex-col gap-4">
 <div className="ic-editor-layout">
 <section className="ic-canvas-panel">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-1 text-navy-900 dp-editorial-headline">Room <span className="text-[#C8A96A]">Canvas</span></h2>
 <ImageUploader 
 id="scene-uploader-add-product"
 className="ic-scene-frame"
 onFileSelect={(file) => {
 setSceneImage(file);
 setOriginalSceneImageUrl(URL.createObjectURL(file));
 }}
 imageUrl={sceneImageUrl}
 isDropZone={!!sceneImage && !isLoading}
 onProductDrop={handleProductDrop}
 onObjectMove={handleObjectMove}
 onLibraryProductDrop={handleLibraryProductDrop}
 showPerspectiveGrid={isMouseDraggingProduct || isTouchDragging}
 isTouchHovering={isHoveringDropZone}
 touchOrbPosition={touchOrbPosition}
 placedObjects={placedObjects.filter(o => o.isVisible !== false)}
 />
 <div className="text-center mt-2">
 <button
 onClick={handleChangeScene}
 className="text-sm text-gold-600 hover:text-gold-700 font-semibold transition-colors dp-btn-text"
 >
 Change Room
 </button>
 </div>
 </section>
 <aside className="ic-asset-panel">
 <div className="flex items-center justify-center gap-5">
 <button
 onClick={() => setDesignActionMode('add')}
 className={`dp-kicker transition-colors ${designActionMode === 'add' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Add Item
 </button>
 <button
 onClick={() => setDesignActionMode('remove')}
 className={`dp-kicker transition-colors ${designActionMode === 'remove' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Remove Item
 </button>
 </div>
 <h2 className="dp-editorial-headline font-medium text-2xl text-center mb-1 text-navy-900 dp-editorial-headline">Select Furniture <span className="text-[#C8A96A]">To Add</span></h2>
 <p className="dp-soft text-center text-sm">Tap a product to place it directly on the room. Move it on the canvas before generating.</p>
 <ImageUploader 
 id="product-uploader"
 onFileSelect={handleProductImageUpload}
 imageUrl={productImageUrl}
 />
 {renderLibraryGrid(PRODUCT_LIBRARY, 'product', 'Products')}
 </aside>
 </div>
 </div>
 );
 }
 
 if (appMode === 'moodboard') {
 return (
 <div className="w-full max-w-4xl mx-auto animate-fade-in flex flex-col items-center">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-5 text-navy-900 dp-editorial-headline">Create <span className="text-[#C8A96A]">Moodboard</span></h2>
 {sceneImage && (
 <div className="w-full mb-3">
 <ImageUploader 
 id="scene-uploader-moodboard"
 className="ic-scene-frame"
 onFileSelect={setSceneImage}
 imageUrl={sceneImageUrl}
 isDropZone={!!sceneImage && !isLoading}
 onProductDrop={handleProductDrop}
 onObjectMove={handleObjectMove}
 onLibraryProductDrop={handleLibraryProductDrop}
 showPerspectiveGrid={isMouseDraggingProduct || isTouchDragging}
 isTouchHovering={isHoveringDropZone}
 touchOrbPosition={touchOrbPosition}
 placedObjects={placedObjects.filter(o => o.isVisible !== false)}
 />
 </div>
 )}
 <div className="ic-mobile-section w-full flex flex-col md:flex-row gap-4 md:gap-6">
 {/* Left side: Product Selection */}
 <div className="ic-mobile-section w-full md:w-1/2 flex flex-col gap-3">
 <h3 className="ic-editorial-step-title">Select Products</h3>
 {renderLibraryGrid(PRODUCT_LIBRARY, 'mood-product', 'Products')}
 <p className="dp-kicker text-navy-500">Selected: {moodboardSelectedProducts.length} items</p>
 {renderLibraryGrid(DESIGN_ROOM_LIBRARY, 'design-room', 'Rooms')}
 </div>
 
 {/* Right side: Generation */}
 <div className="ic-theme-panel ic-mobile-section w-full md:w-1/2 flex flex-col gap-3 dp-panel p-4">
 <h3 className="ic-editorial-step-title">Describe Theme</h3>
 <div className="flex flex-col gap-2">
 <div className="flex flex-wrap gap-2 mb-2">
 <button onClick={() => setMoodboardPrompt("Warm minimalist, earthy tones, organic textures, sophisticated and serene")} className="ic-mood-chip">Warm Minimal</button>
 <button onClick={() => setMoodboardPrompt("Moody editorial, dark walls, brass accents, rich deep colors, cinematic lighting")} className="ic-mood-chip">Moody Editorial</button>
 <button onClick={() => setMoodboardPrompt("Airy coastal, light blues and whites, breezy linens, natural light")} className="ic-mood-chip">Coastal</button>
 </div>
 <textarea 
 value={moodboardPrompt}
 onChange={(e) => setMoodboardPrompt(e.target.value)}
 placeholder="Describe the mood board style..."
 className="w-full p-3 border border-navy-200 dp-radius focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[80px] text-sm bg-white"
 disabled={isLoading}
 />
 </div>
 <button
 onClick={handleMoodboardSubmit}
 disabled={isLoading || moodboardSelectedProducts.length === 0 || !moodboardPrompt.trim()}
 className="dp-btn-text transition-colors mt-1"
 >
 {isLoading ? 'Generating Board...' : 'Generate Mood Board'}
 </button>
 </div>
 </div>
 
 {isLoading && (
 <div className="mt-5 pt-5 w-full flex flex-col items-center animate-fade-in">
 <Spinner />
 <p className="text-xl mt-4 text-navy-500 transition-opacity duration-500">Generating interior design mood board...</p>
 </div>
 )}
 
 {!isLoading && moodboardImageUrl && (
 <div className="mt-5 border-t border-navy-100 pt-5 w-full flex flex-col items-center animate-fade-in">
 <h3 className="ic-editorial-step-title text-center mb-3">Generated Mood Board</h3>
 <div className="dp-radius overflow-hidden relative w-full aspect-square md:aspect-video dp-panel">
 <img src={moodboardImageUrl} className="w-full h-full object-contain" alt="Generated Mood Board" />
 </div>
 <div className="ic-action-row mt-4 flex gap-3 flex-wrap justify-center">
 <a
 href={moodboardImageUrl}
 download="mood-board.jpg"
 className="bg-navy-900 text-white hover:-translate-y-[1px] transition-transform dp-radius min-h-[48px] dp-btn-text dp-radius transition-all border border-navy-700 flex items-center gap-2"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
 Download Mood Board
 </a>
 {debugPrompt && (
 <button
 onClick={() => setIsDebugModalOpen(true)}
 className="h-[48px] px-6 dp-btn-utility dp-btn-text dp-radius border dp-radius transition-transform hover:-translate-y-[1px] dp-btn-text dp-radius flex items-center justify-center gap-2"
 >
 View Prompt
 </button>
 )}
 </div>
 </div>
 )}
 </div>
 );
 }

 return (
 <div className="w-full max-w-7xl mx-auto animate-fade-in">
 <div className="flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
 {/* Scene Column */}
 <div className="w-full lg:w-2/3 flex flex-col order-1 pb-5">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-5 text-navy-900 dp-editorial-headline">Your Room <span className="text-[#C8A96A]">Preview</span></h2>
 <p className="dp-soft text-center text-sm mb-3">Tap or drag products onto the room. Move items on the image before generating.</p>
 <div className="ic-mode-inline flex items-center justify-center gap-5 mb-3">
 <button
 onClick={() => setDesignActionMode('add')}
 className={`dp-kicker transition-colors ${designActionMode === 'add' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Add Item
 </button>
 <button
 onClick={() => setDesignActionMode('remove')}
 className={`dp-kicker transition-colors ${designActionMode === 'remove' ? 'text-[#C8A96A]' : 'text-navy-500 hover:text-[#C8A96A]'}`}
 >
 Remove Item
 </button>
 </div>
 <div className="flex-grow flex flex-col items-center justify-center relative w-full">
  <ImageUploader 
 ref={sceneImgRef}
 id="scene-uploader" 
 className="ic-scene-frame"
 onFileSelect={(file) => {
 setSceneImage(file);
 setOriginalSceneImageUrl(URL.createObjectURL(file));
 setPlacedObjects([]);
 }} 
 imageUrl={sceneImageUrl}
 isDropZone={!!sceneImage && !isLoading}
 onProductDrop={handleProductDrop}
 onObjectMove={handleObjectMove}
 onLibraryProductDrop={handleLibraryProductDrop}
 showPerspectiveGrid={isMouseDraggingProduct || isTouchDragging}
 showDebugButton={!!debugImageUrl && !isLoading}
 onDebugClick={() => setIsDebugModalOpen(true)}
 isTouchHovering={isHoveringDropZone}
 touchOrbPosition={touchOrbPosition}
 placedObjects={placedObjects.filter(o => o.isVisible !== false)}
  />
  <MeasureOverlay isActive={isMeasureMode} onClose={() => setIsMeasureMode(false)} />
 {placedObjects.length > 0 && (
 <div className="mt-3 w-full flex justify-center animate-fade-in sticky bottom-4 z-50 px-2">
 <button
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(50);
 handleGenerateComposition();
 }}
 disabled={isLoading}
 className="dp-btn-text transition-colors w-full max-w-sm flex items-center justify-center gap-2"
 >
 {isLoading ? 'Generating Preview...' : `Generate Room Preview (${placedObjects.filter(o => o.isVisible !== false).length} items)`}
 </button>
 </div>
 )}
 {originalSceneImageUrl && sceneImageUrl !== originalSceneImageUrl && placedObjects.length === 0 && (
 <div className="ic-action-row mt-3 flex flex-row gap-3 w-full justify-center animate-fade-in flex-wrap">
 
        <button
          onClick={() => setIsMeasureMode(true)}
          className="dp-btn-utility dp-btn-text dp-radius border hover:-translate-y-[1px] transition-all hover:bg-gold-100 font-bold py-3 px-4 dp-radius text-sm border-navy-200 flex items-center gap-2 dp-btn-text"
        >
          <Ruler className="w-4 h-4" />
          Measure Space
        </button>
  
        <button
          onClick={() => setIsBeforeAfterModalOpen(true)}
          className="dp-btn-utility dp-btn-text dp-radius border hover:-translate-y-[1px] transition-all hover:bg-gold-100 font-bold py-3 px-6 dp-radius text-sm border border-navy-200 flex items-center gap-2 dp-btn-text"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
 Compare Before / After
 </button>
 <a
 href={sceneImageUrl!}
 download="staged-room.jpg"
 className="bg-navy-900 text-white hover:-translate-y-[1px] transition-transform dp-radius min-h-[48px] dp-btn-text dp-radius transition-all border border-navy-700 flex items-center gap-2"
 >
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
 Download Image
 </a>
        {navigator.share && (
          <button
            onClick={() => handleShare(sceneImageUrl!, "staged-room.jpg", "My Staged Room")}
            className="bg-navy-900 text-white hover:-translate-y-[1px] transition-transform dp-radius min-h-[48px] dp-btn-text dp-radius transition-all border border-navy-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share
          </button>
        )}
 </div>
 )}
 </div>
 <div className="text-center mt-3">
 {sceneImage && !isLoading && (
 <button
 onClick={handleChangeScene}
 className="text-sm text-gold-600 hover:text-gold-700 font-semibold hover:bg-gold-50 transition-colors dp-radius dp-btn-text h-12"
 >
 Change Background Room
 </button>
 )}
 </div>
 </div>

 {/* Right Sidebar */}
 <div className="w-full lg:w-1/3 flex flex-col order-2 lg:sticky lg:top-[120px] gap-5 pb-5">
 {renderLibraryGrid(PRODUCT_LIBRARY, 'product', 'Products')}
 {/* Product Column */}
 {selectedProduct && (
 <div className="ic-selected-item-panel w-full flex flex-col dp-panel p-4">
 <h2 className="dp-editorial-headline font-medium text-3xl text-center mb-5 text-navy-900 dp-editorial-headline">Your Selected <span className="text-[#C8A96A]">Item</span></h2>
 <div className="flex-grow flex items-center justify-center">
 <div 
 draggable="true" 
 onDragStart={(e) => {
 setIsMouseDraggingProduct(true);
 e.dataTransfer.effectAllowed = 'move';
 e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
 }}
 onDragEnd={() => setIsMouseDraggingProduct(false)}
 onTouchStart={handleTouchStart}
 className="cursor-move w-full max-w-[240px]"
 >
 <ObjectCard product={selectedProduct!} isSelected={true} />
 </div>
 </div>
 <div className="text-center mt-3">
 <button
 onClick={handleChangeProduct}
 className="text-sm text-gold-600 hover:text-gold-700 font-semibold w-full bg-white border border-navy-200 hover:bg-gold-50 transition-colors dp-radius dp-btn-text h-12"
 >
 Change Selected Item
 </button>
 </div>
 </div>
 )}

 {/* Items In Room Column */}
 <div className="w-full flex flex-col">
 <h2 className="dp-editorial-headline font-medium text-3xl mb-4 text-navy-900 px-2 lg:px-0 dp-editorial-headline">Items In <span className="text-[#C8A96A]">Room</span></h2>
 <div className="ic-items-panel dp-panel flex flex-col gap-3 p-4 w-full">
 {placedObjects.length === 0 ? (
 <p className="text-sm text-navy-300 text-center mt-10">No items placed in scene yet.</p>
 ) : (
 <div className="flex flex-col gap-3">
 {placedObjects.map((obj, index) => (
 <div 
 key={obj.id} 
 draggable
 onDragStart={(e) => handleDragLayerStart(e, index)}
 onDragOver={handleDragLayerOver}
 onDrop={(e) => handleDragLayerDrop(e, index)}
 className="ic-layer-card bg-white p-3 dp-radius border border-navy-100 flex flex-col gap-3 animate-fade-in hover:border-navy-200 transition-colors cursor-move"
 style={{ animationDuration: '0.3s' }}
 >
 <div className="ic-layer-card-row flex items-center gap-3 w-full min-w-0">
 <div className="ic-layer-handle text-navy-300 hover:text-navy-400 transition-colors flex-shrink-0">
 <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" /></svg>
 </div>
 <ImageWithFallback src={obj.thumbnailUrl} productName={obj.name || "Object"} productId={obj.id} className="w-12 h-12 object-cover dp-radius flex-shrink-0" alt={obj.name || "Object"} />
 <div className="min-w-0 flex-1 flex flex-col">
 <span className="text-sm font-semibold text-navy-900 truncate">{obj.name || "Object"}</span>
 </div>
 <div className="ic-layer-actions flex items-center gap-1 flex-shrink-0">
 
  <button 
    onClick={() => setEditingProductBgId(obj.id)}
    className="p-1.5 dp-radius text-navy-500 hover:text-gold-600 hover:bg-gold-50 transition-colors"
    title="Match Product Background"
  >
    <Wand2 className="w-4 h-4" />
  </button>

  <button 
 onClick={() => setPlacedObjects(prev => prev.map(p => p.id === obj.id ? { ...p, isVisible: !p.isVisible } : p))}
 className={`p-1.5 dp-radius hover:bg-navy-50 transition-colors ${obj.isVisible !== false ? 'text-gold-600' : 'text-navy-300'}`}
 title="Toggle Visibility"
 >
 {obj.isVisible !== false ? (
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
 ) : (
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
 )}
 </button>
 <button 
 onClick={() => setPlacedObjects(prev => prev.filter(p => p.id !== obj.id))}
 className="p-1.5 dp-radius text-red-500 hover:bg-red-50 transition-colors"
 title="Remove Object"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
 </button>
 </div>
 </div>
 
 {/* Sliders in Accordion */}
 {obj.isVisible !== false && (
 <details className="mt-2 group border-t border-navy-50/50 pt-2 w-full" onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}>
 <summary className="dp-kicker text-navy-500 cursor-pointer list-none flex items-center justify-between p-2 hover:bg-navy-50 dp-radius transition-colors">
 <span>Adjust Placement</span>
 <span className="transition-transform group-open:rotate-180">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
 </span>
 </summary>
 <div className="flex flex-col gap-4 px-2 py-4">
 <div className="flex flex-col gap-2">
 <div className="flex justify-between">
 <span className="dp-kicker text-navy-400">Scale</span>
 <span className="text-xs text-navy-500">{Math.round((obj.scale ?? 1) * 100)}%</span>
 </div>
 <input 
 type="range" 
 min="0.5" max="2" step="0.1" 
 value={obj.scale ?? 1} 
 onChange={(e) => updateObjectScale(obj.id, parseFloat(e.target.value))}
 onMouseDown={(e) => e.stopPropagation()}
 className="w-full h-2 bg-navy-100 dp-radius appearance-none cursor-pointer accent-gold-500"
 />
 </div>
 <div className="flex flex-col gap-2">
 <div className="flex justify-between">
 <span className="dp-kicker text-navy-400">Rotate</span>
 <span className="text-xs text-navy-500">{obj.rotation ?? 0}°</span>
 </div>
 <input 
 type="range" 
 min="0" max="360" step="1" 
 value={obj.rotation ?? 0} 
 onChange={(e) => updateObjectRotation(obj.id, parseInt(e.target.value, 10))}
 onMouseDown={(e) => e.stopPropagation()}
 className="w-full h-2 bg-navy-100 dp-radius appearance-none cursor-pointer accent-gold-500"
 />
 </div>
 <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-navy-50/50">
 <button 
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(50);
 handleQuickIterate(obj.id);
 }}
 className="w-full min-h-[44px] py-2 border border-navy-200 text-navy-600 rounded text-xs font-semibold hover:bg-navy-50 transition-colors flex items-center justify-center gap-1"
 >
 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
 Quick Iterate Finishes
 </button>
 {objectVariations[obj.id] && (
 <div className="flex flex-col gap-2 mt-2">
 <div className="flex justify-between gap-2">
 <button 
 onClick={() => setPlacedObjects(prev => prev.map(p => p.id === obj.id ? { ...p, styleFilter: undefined } : p))}
 className={`flex-1 flex flex-col items-center gap-1 rounded ${!obj.styleFilter ? 'text-navy-900 pointer-events-none' : 'text-navy-500 hover:text-navy-900'}`}
 >
 <div className={`w-full h-8 rounded border ${!obj.styleFilter ? 'border-navy-900 ' : 'border-navy-200'} relative overflow-hidden`}>
 <ImageWithFallback src={obj.thumbnailUrl} productName={obj.name || "Object"} productId={obj.id} className="w-full h-full object-cover" />
 </div>
 <span className="dp-kicker text-center w-full truncate">Original</span>
 </button>
 {objectVariations[obj.id].map((filter, i) => {
 const names = ['Bouclé Ivory', 'Warm Camel Linen', 'Performance Stone'];
 return (
 <button 
 key={i}
 onClick={() => setPlacedObjects(prev => prev.map(p => p.id === obj.id ? { ...p, styleFilter: filter } : p))}
 className={`flex-1 flex flex-col items-center gap-1 rounded ${obj.styleFilter === filter ? 'text-navy-900 pointer-events-none' : 'text-navy-500 hover:text-navy-900'}`}
 >
 <div className={`w-full h-8 rounded border ${obj.styleFilter === filter ? 'border-navy-900 ' : 'border-navy-200'} relative overflow-hidden`}>
 <ImageWithFallback src={obj.thumbnailUrl} productName={obj.name || "Object"} productId={obj.id} className="w-full h-full object-cover" style={{ filter }} />
 </div>
 <span className="dp-kicker text-center w-full truncate">{names[i]}</span>
 </button>
 )})}
 </div>
 </div>
 )}
 </div>
 </div>
 </details>
 )}

 </div>
 ))}
 </div>
 )}
 {placedObjects.length > 0 && (
 <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-navy-100">
 <button 
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(50);
 handleSuggestItems();
 }}
 disabled={isSuggesting}
 className="w-full h-11 px-4 dp-btn-utility dp-btn-text dp-radius border dp-radius font-semibold text-sm hover:-translate-y-[1px] transition-transform flex items-center justify-center gap-2 dp-btn-text"
 >
 {isSuggesting ? (
 <>
 <Spinner /> Analyzing room...
 </>
 ) : (
 <>
 <svg className="w-4 h-4 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
 Suggest Matching Items
 </>
 )}
 </button>
 {suggestedProducts.length > 0 && (
 <div className="flex flex-col gap-2 mt-2">
 <span className="dp-kicker text-navy-500 px-1">AI Recommendations</span>
 <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
 {suggestedProducts.map(p => (
 <div key={p.id} className="min-w-[120px] max-w-[120px] flex-shrink-0 cursor-pointer" onClick={() => setSelectedProduct(p)}>
 <ObjectCard product={p} isSelected={selectedProduct?.id === p.id} />
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 <div className="text-center mt-5 min-h-[4rem] flex flex-col justify-center items-center">
 {isLoading ? (
 <div className="animate-fade-in">
 <Spinner />
 <p className="text-xl mt-4 text-navy-500 transition-opacity duration-500">{loadingMessages[loadingMessageIndex]}</p>
 </div>
 ) : (
 <p className="text-navy-400 animate-fade-in">
 Select products from the asset panel, then move placed items directly on the room.
 </p>
 )}
 </div>
 </div>
 );
 };
 
 return (
 <div className="ic-app-shell min-h-screen bg-white text-navy-900 flex justify-center px-3 pb-4 md:px-8 md:pb-8">
 <BeforeAfterModal 
 isOpen={isBeforeAfterModalOpen} 
 onClose={() => setIsBeforeAfterModalOpen(false)} 
 beforeImage={originalSceneImageUrl!} 
 afterImage={sceneImageUrl!} 
 />
 <TouchGhost 
 imageUrl={isTouchDragging ? productImageUrl : null} 
 position={touchGhostPosition}
 />
 <div className="flex flex-col items-center w-full">
 <WorkspaceControlBar
 appMode={appMode}
 setAppMode={setAppMode}
 handleUndo={handleUndo}
 saveProject={saveProject}
 loadProject={loadProject}
 onHistoryClick={() => setIsHistoryModalOpen(true)}
 canUndo={history.length > 0}
 historyCount={workspaceHistory.length}
 onNewProject={handleReset}
 />

 <main className="ic-main-content w-full">
 <section className="ic-workspace-shell">
 <aside className="ic-left-rail">
 <WorkflowProgress
 appMode={appMode}
 activeStep={designActiveStep}
 hasScene={!!sceneImage}
 hasProduct={!!productImageFile || placedObjects.length > 0 || moodboardSelectedProducts.length > 0}
 hasGenerated={hasGeneratedOutput}
 />
 </aside>
 <section className="ic-workspace-main">
 <div className="ic-project-header">
 <div>
 <p className="ic-rail-label">Project</p>
 <h1>{activeWorkflowLabel}</h1>
 </div>
 <div className="ic-project-status">
 <span>{workspaceStatus}</span>
 <button
 type="button"
 onClick={() => {
 if (appMode === 'placement' && placedObjects.length > 0) handleGenerateComposition();
 if (appMode === 'staging') handleStagingSubmit();
 if (appMode === 'moodboard') handleMoodboardSubmit();
 }}
 disabled={isLoading || (appMode === 'placement' && placedObjects.length === 0) || (appMode === 'staging' && !stagingPrompt.trim() && !placedObjects.some(obj => obj.isVisible !== false)) || (appMode === 'moodboard' && (moodboardSelectedProducts.length === 0 || !moodboardPrompt.trim()))}
 className="ic-primary-action"
 >
 Generate
 </button>
 </div>
 </div>
 {renderContent()}
 </section>
 <aside className="ic-context-rail">
 <p className="ic-rail-label">Status</p>
 <div className="ic-status-list">
 <div>
 <span>Current workflow</span>
 <strong>{activeWorkflowLabel}</strong>
 </div>
 <div>
 <span>Room</span>
 <strong>{sceneImage ? 'Selected' : 'Not selected'}</strong>
 </div>
 <div>
 <span>Assets</span>
 <strong>{placedObjects.length || moodboardSelectedProducts.length || (productImageFile ? 1 : 0)}</strong>
 </div>
 <div>
 <span>Output</span>
 <strong>{hasGeneratedOutput ? 'Ready' : 'Pending'}</strong>
 </div>
 </div>
 </aside>
 </section>
 </main>
 </div>
 
{isBgEditing || editingProductBgId ? (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white dp-radius max-w-md w-full p-6 animate-fade-up">
      <h3 className="ic-editorial-step-title mb-4">Edit Product Background</h3>
      {isBgEditing ? (
        <div className="py-8 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#C8A96A] border-t-transparent animate-spin"></div>
          <p className="text-navy-500 font-medium">Generating new background...</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-navy-500 mb-4">Describe the new texture or background you want to place behind this product (e.g., "rustic hardwood floor", "white brick wall").</p>
          <input
            type="text"
            className="w-full p-3 border border-navy-200 dp-radius mb-6 focus:outline-none focus:ring-2 focus:ring-gold-500"
            placeholder="e.g., rustic hardwood floor"
            value={bgEditPrompt}
            autoFocus
            onChange={(e) => setBgEditPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEditBackgroundSubmit()}
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setEditingProductBgId(null);
                setBgEditPrompt("");
              }}
              className="px-4 py-2 dp-btn-text text-navy-500 hover:text-navy-900"
            >
              Cancel
            </button>
            <button
              onClick={handleEditBackgroundSubmit}
              disabled={!bgEditPrompt.trim()}
              className="px-6 py-2 bg-[#C8A96A] hover:bg-[#B3965D] text-white dp-radius font-medium disabled:opacity-50"
            >
              Save Edits
            </button>
          </div>
        </>
      )}
    </div>
  </div>
) : null}

{isHistoryModalOpen && (
  <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-3 animate-fade-in" onClick={() => setIsHistoryModalOpen(false)}>
    <div className="ic-modal-panel dp-panel max-w-3xl w-full p-4 md:p-5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-4 border-b border-navy-100 pb-3 mb-4">
        <h2 className="dp-editorial-headline font-medium text-2xl text-navy-900">Workspace <span className="text-[#C8A96A]">History</span></h2>
        <button
          onClick={() => setIsHistoryModalOpen(false)}
          className="dp-kicker text-navy-500 hover:text-[#C8A96A] transition-colors"
        >
          Close
        </button>
      </div>
      {workspaceHistory.length === 0 ? (
        <p className="dp-soft text-center py-8">No saved iterations yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto">
          {workspaceHistory.map((entry, index) => (
            <button
              key={entry.id}
              className="ic-history-tile text-left group"
              onClick={() => loadWorkspaceHistoryEntry(entry)}
            >
              <span className="block w-full aspect-[4/5] dp-radius overflow-hidden border border-navy-100 group-hover:border-[#C8A96A] transition-colors">
                <img src={entry.sceneBase64} className="w-full h-full object-cover" alt="History Iteration" />
              </span>
              <span className="block text-center text-[11px] mt-2 text-navy-500 font-semibold">
                {index === 0 ? 'Latest' : 'Iteration ' + (workspaceHistory.length - index)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
)}

      <DebugModal 
 isOpen={isDebugModalOpen} 
 onClose={() => setIsDebugModalOpen(false)}
 imageUrl={debugImageUrl}
 prompt={debugPrompt}
 />
 </div>
 );
};

export default App;
