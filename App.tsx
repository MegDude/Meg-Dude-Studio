import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Menu, Ruler, Sparkles, X } from 'lucide-react';
import { PRODUCT_LIBRARY, ProductLibraryItem } from './src/data/productLibrary';
import { generateMoodboard, generateMultiCompositeImage, stageRoomImage } from './src/services/openaiService';
import { Product } from './types';
import ImageUploader from './components/ImageUploader';
import TouchGhost from './components/TouchGhost';
import MeasureOverlay from './components/MeasureOverlay';
import BeforeAfterModal from './components/BeforeAfterModal';
import Spinner from './components/Spinner';
import { ImageWithFallback } from './components/ImageWithFallback';
import { FALLBACK_DESIGN_IMAGES, canGenerateDesign } from './src/lib/defaultImageFallback.js';

type Workflow = 'design' | 'stage' | 'mood';
type EditMode = 'add' | 'remove';
type AgentStatus = {
  configured: boolean;
  provider: string;
  model?: string;
  missing?: string[];
};

type SceneLibraryItem = {
  id: string;
  name: string;
  type: string;
  thumbnailUrl: string;
};

type SelectedRoom = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  source: 'library' | 'upload' | 'fallback';
};

type PlacedObject = {
  id: string;
  image: File;
  name: string;
  description: string;
  thumbnailUrl: string;
  pixelPosition: { x: number; y: number };
  relativePosition: { xPercent: number; yPercent: number };
  scale?: number;
  rotation?: number;
  isVisible?: boolean;
  styleFilter?: string;
};

type HistorySnapshot = {
  selectedRoom: SelectedRoom | null;
  sceneImage: File | null;
  placedObjects: PlacedObject[];
};

const productSourceRank = (product: ProductLibraryItem) => {
  if (product.sourceType === 'Sourced') return 0;
  return 1;
};

type SavedProject = {
  workflow: Workflow;
  selectedRoom: SelectedRoom | null;
  sceneBase64: string | null;
  originalBase64: string | null;
  placedObjects: Array<Omit<PlacedObject, 'image'> & { imageBase64: string }>;
  stageProducts?: { name: string; url: string }[];
  moodProducts: { name: string; url: string }[];
  designBrief: string;
  moodPrompt: string;
  stagePrompt: string;
  keepPrompt: string;
  removePrompt: string;
  ambientLight?: number;
  lightingTemperature?: number;
};

type GalleryItem = {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
};

const SCENE_LIBRARY: SceneLibraryItem[] = [
  { id: 'living-skyline', name: 'Skyline Living', type: 'Living', thumbnailUrl: '/images/rooms/legends/living-skyline-01.jpeg' },
  { id: 'living-media', name: 'Media Living', type: 'Living', thumbnailUrl: '/images/rooms/legends/living-media-01.jpeg' },
  { id: 'living-tv', name: 'TV Lounge', type: 'Living', thumbnailUrl: '/images/rooms/legends/living-tv-01.jpeg' },
  { id: 'bedroom', name: 'Bedroom', type: 'Bedroom', thumbnailUrl: '/images/rooms/legends/bedroom-01.jpeg' },
  { id: 'dining', name: 'Dining Room', type: 'Dining', thumbnailUrl: '/images/rooms/legends/dining-01.jpeg' },
  { id: 'lounge-dining', name: 'Lounge Dining', type: 'Dining', thumbnailUrl: '/images/rooms/legends/lounge-dining-01.jpeg' },
  { id: 'kitchen-white', name: 'White Kitchen', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/kitchen-white-01.jpeg' },
  { id: 'kitchen-warm', name: 'Warm Kitchen', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/kitchen-warm-01.jpeg' },
  { id: 'open-kitchen', name: 'Open Kitchen', type: 'Kitchen', thumbnailUrl: '/images/rooms/legends/open-kitchen-living-01.jpeg' },
  { id: 'empty-loft', name: 'Empty Loft', type: 'Empty', thumbnailUrl: '/images/rooms/legends/empty-loft-01.jpeg' },
];

const workflowLabels: Record<Workflow, string> = {
  design: 'Design',
  stage: 'Stage',
  mood: 'Mood Studio',
};

const workflowDescriptions: Record<Workflow, string> = {
  design: 'Exact products',
  stage: 'Full room',
  mood: 'Direction board',
};

const friendlyIssueMessage = (fallback: string) => (error: unknown): string => {
  const message = error instanceof Error ? error.message : '';
  if (
    error instanceof Error &&
    (error.name === 'OPENAI_API_KEY_MISSING' ||
      /openai|api|key|vercel|agent|token|configured|503|500|json/i.test(message))
  ) {
    return 'The studio connection is almost ready. Try again in a moment.';
  }
  if (/network|fetch|load|timeout|failed/i.test(message)) {
    return 'The studio had trouble reaching the image service. Try again in a moment.';
  }
  return fallback;
};

const fileToBase64 = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })
);

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta, data] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

const assetFileCache = new Map<string, Promise<File>>();

const fetchUrlToFile = async (url: string, filename: string): Promise<File> => {
  const cacheKey = `${url}::${filename}`;
  if (!assetFileCache.has(cacheKey)) {
    assetFileCache.set(cacheKey, (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load ${filename}.`);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    })().catch((error) => {
      assetFileCache.delete(cacheKey);
      throw error;
    }));
  }
  return assetFileCache.get(cacheKey)!;
};

const imageUrlToFile = async (imageUrl: string, filename: string): Promise<File> => {
  if (imageUrl.startsWith('data:')) return dataUrlToFile(imageUrl, filename);
  return fetchUrlToFile(imageUrl, filename);
};

const createBlankSceneFile = async (label = 'Blank project'): Promise<File> => (
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not create fallback scene.'));
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(120, 120, canvas.width - 240, canvas.height - 240);
    ctx.strokeStyle = 'rgba(11,31,51,0.14)';
    ctx.lineWidth = 4;
    ctx.strokeRect(120, 120, canvas.width - 240, canvas.height - 240);
    ctx.fillStyle = '#0b1f33';
    ctx.font = '600 56px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = 'rgba(11,31,51,0.56)';
    ctx.font = '400 30px Inter, sans-serif';
    ctx.fillText('Upload a room or choose from the library to replace this canvas.', canvas.width / 2, canvas.height / 2 + 42);

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create fallback scene image.'));
        return;
      }
      resolve(new File([blob], 'fallback-room.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  })
);

const useObjectUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
};

const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow>('design');
  const [editMode, setEditMode] = useState<EditMode>('add');
  const [selectedRoom, setSelectedRoom] = useState<SelectedRoom | null>(null);
  const [sceneImage, setSceneImage] = useState<File | null>(null);
  const [originalSceneBase64, setOriginalSceneBase64] = useState<string | null>(null);
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductFile, setSelectedProductFile] = useState<File | null>(null);
  const [removePrompt, setRemovePrompt] = useState('');
  const [removeTargetPosition, setRemoveTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const [stagePrompt, setStagePrompt] = useState('Warm minimal staging with refined light, tailored textiles, and a listing-ready finish.');
  const [designBrief, setDesignBrief] = useState('Create a refined room composition with the selected pieces.');
  const [keepPrompt, setKeepPrompt] = useState('');
  const [stageRemovePrompt, setStageRemovePrompt] = useState('');
  const [stageProducts, setStageProducts] = useState<{ name: string; url: string }[]>([]);
  const [moodPrompt, setMoodPrompt] = useState('Warm minimal moodboard with linen, stone, wood, and quiet brass accents.');
  const [moodProducts, setMoodProducts] = useState<{ name: string; url: string }[]>([]);
  const [moodboardImageUrl, setMoodboardImageUrl] = useState<string | null>(null);
  const [ambientLight, setAmbientLight] = useState(100);
  const [lightingTemperature, setLightingTemperature] = useState(0);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetLoadWarning, setAssetLoadWarning] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [agentStatusError, setAgentStatusError] = useState<string | null>(null);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchGhostPosition, setTouchGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTouchHovering, setIsTouchHovering] = useState(false);
  const [touchOrbPosition, setTouchOrbPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeRoomCategory, setActiveRoomCategory] = useState('All');
  const [activeProductCategory, setActiveProductCategory] = useState('All');
  const sceneImgRef = useRef<HTMLImageElement>(null);
  const recoveryUploadRef = useRef<HTMLInputElement>(null);

  const sceneImageUrl = useObjectUrl(sceneImage);
  const originalSceneUrl = useMemo(() => originalSceneBase64, [originalSceneBase64]);
  const activeProducts = placedObjects.filter((item) => item.isVisible !== false);
  const generatedImageUrl = workflow === 'mood' ? moodboardImageUrl : sceneImageUrl;
  const hasGenerated = !!debugPrompt || !!moodboardImageUrl;
  const isAgentReady = agentStatus?.configured === true;
  const lightingModeLabel = lightingTemperature > 8 ? 'warm' : lightingTemperature < -8 ? 'cool' : 'neutral';
  const sceneLightFilter = useMemo(() => {
    const temperature = Math.max(-40, Math.min(40, lightingTemperature));
    const brightness = Math.max(70, Math.min(135, ambientLight));
    const saturation = 100 + Math.abs(temperature) * 0.18;
    const sepia = temperature > 0 ? temperature * 0.22 : 0;
    const hue = temperature > 0 ? -temperature * 0.18 : Math.abs(temperature) * 0.22;
    return `brightness(${brightness}%) saturate(${saturation}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
  }, [ambientLight, lightingTemperature]);
  const productLightFilter = useMemo(() => {
    const temperature = Math.max(-40, Math.min(40, lightingTemperature));
    const brightness = Math.max(70, Math.min(135, ambientLight));
    const productBrightness = Math.max(78, Math.min(126, brightness + (100 - brightness) * 0.28));
    const saturation = 100 + Math.abs(temperature) * 0.12;
    const sepia = temperature > 0 ? temperature * 0.16 : 0;
    const hue = temperature > 0 ? -temperature * 0.14 : Math.abs(temperature) * 0.18;
    return `brightness(${productBrightness}%) saturate(${saturation}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
  }, [ambientLight, lightingTemperature]);
  const lightingInstruction = useMemo(() => (
    `Lighting grade: ${lightingModeLabel} architectural light, ${ambientLight}% brightness, ${lightingTemperature > 0 ? `${lightingTemperature} warm` : lightingTemperature < 0 ? `${Math.abs(lightingTemperature)} cool` : 'neutral temperature'}. Match inserted product lighting to the room with physically plausible shadows, contact occlusion, color bounce, exposure, and no visible compositing edge.`
  ), [ambientLight, lightingModeLabel, lightingTemperature]);
  const litActiveProducts = useMemo(() => (
    activeProducts.map((item) => ({ ...item, styleFilter: productLightFilter }))
  ), [activeProducts, productLightFilter]);
  const filteredRooms = useMemo(() => (
    SCENE_LIBRARY.filter((room) => activeRoomCategory === 'All' || room.type === activeRoomCategory)
  ), [activeRoomCategory]);
  const filteredProducts = useMemo(() => (
    PRODUCT_LIBRARY
      .filter((product) => activeProductCategory === 'All' || product.category === activeProductCategory)
      .slice()
      .sort((a, b) => productSourceRank(a) - productSourceRank(b) || a.name.localeCompare(b.name))
  ), [activeProductCategory]);

  const setNewScene = useCallback(async (file: File, room?: SelectedRoom) => {
    setSceneImage(file);
    setSelectedRoom(room || {
      id: `uploaded-room-${Date.now()}`,
      name: file.name || 'Uploaded room',
      category: 'Upload',
      source: 'upload',
    });
    setPlacedObjects([]);
    setSelectedProduct(null);
    setSelectedProductFile(null);
    setStageProducts([]);
    setMoodboardImageUrl(null);
    setDebugPrompt(null);
    setOriginalSceneBase64(await fileToBase64(file));
    setStatus(room?.name ? `${room.name} selected` : 'Uploaded room selected');
    setAssetLoadWarning(null);
  }, []);

  const continueBlankProject = useCallback(async () => {
    const fallbackFile = await createBlankSceneFile();
    await setNewScene(fallbackFile, {
      id: 'blank-project-room',
      name: 'Blank project',
      category: 'Fallback',
      source: 'fallback',
    });
    setAssetLoadWarning('Default images could not be loaded. You can upload your own image or continue with a blank project.');
    setStatus('Blank project ready');
  }, [setNewScene]);

  const loadFallbackRoom = useCallback(async () => {
    const fallback = FALLBACK_DESIGN_IMAGES[0];
    try {
      const file = await fetchUrlToFile(fallback.src, `${fallback.id}.jpg`);
      await setNewScene(file, {
        id: fallback.id,
        name: fallback.title,
        category: 'Fallback',
        imageUrl: fallback.src,
        source: 'fallback',
      });
      setStatus('Fallback room loaded');
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Fallback room asset failed; using generated blank scene.', err);
      await continueBlankProject();
    }
  }, [continueBlankProject, setNewScene]);

  const loadRoomFromLibrary = useCallback(async (room: SceneLibraryItem) => {
    try {
      const file = await fetchUrlToFile(room.thumbnailUrl, `${room.id}.jpg`);
      await setNewScene(file, {
        id: room.id,
        name: room.name,
        category: room.type,
        imageUrl: room.thumbnailUrl,
        source: 'library',
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn(`Room asset failed: ${room.thumbnailUrl}`, err);
      setAssetLoadWarning('Default images could not be loaded. You can upload your own image or continue with a blank project.');
      await loadFallbackRoom();
    }
  }, [loadFallbackRoom, setNewScene]);

  const pushHistory = useCallback(() => {
    setHistory((previous) => [...previous, { selectedRoom, sceneImage, placedObjects }].slice(-12));
  }, [placedObjects, sceneImage, selectedRoom]);

  const placeProduct = useCallback((file: File, product: Product, relativePosition = { xPercent: 50, yPercent: 62 }, pixelPosition = { x: 0, y: 0 }) => {
    if (!sceneImage) {
      setSelectedProduct(product);
      setSelectedProductFile(file);
      setStatus('Product selected. Choose a room next.');
      return;
    }

    pushHistory();
    setSelectedProduct(product);
    setSelectedProductFile(file);
    setEditMode('add');
    setPlacedObjects((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        image: file,
        name: product.name,
        description: product.name,
        thumbnailUrl: product.imageUrl,
        relativePosition,
        pixelPosition,
        isVisible: true,
      },
    ]);
    setStatus('Product placed. Drag to refine.');
  }, [pushHistory, sceneImage]);

  const selectProductFromLibrary = useCallback(async (product: ProductLibraryItem, relativePosition?: { xPercent: number; yPercent: number }, pixelPosition?: { x: number; y: number }) => {
    setError(null);
    try {
      const file = await fetchUrlToFile(product.thumbnailUrl, `${product.id}.jpg`);
      placeProduct(file, {
        id: product.id,
        name: product.name,
        imageUrl: product.thumbnailUrl,
        brand: product.brand,
        category: product.category,
      }, relativePosition, pixelPosition);
    } catch (err) {
      setError(friendlyIssueMessage('That product could not be added. Try again in a moment.')(err));
    }
  }, [placeProduct]);

  const handleUploadedProduct = useCallback((file: File) => {
    const imageUrl = URL.createObjectURL(file);
    placeProduct(file, { id: Date.now(), name: file.name, imageUrl });
  }, [placeProduct]);

  const handleLibraryProductDrop = useCallback(async (
    product: { url: string; name: string },
    pixelPosition: { x: number; y: number },
    relativePosition: { xPercent: number; yPercent: number },
  ) => {
    try {
      const file = await fetchUrlToFile(product.url, `${product.name}.jpg`);
      placeProduct(file, { id: product.url, name: product.name, imageUrl: product.url }, relativePosition, pixelPosition);
    } catch (err) {
      setError(friendlyIssueMessage(`${product.name} could not be placed. Try again in a moment.`)(err));
    }
  }, [placeProduct]);

  const handleCanvasDrop = useCallback((pixelPosition: { x: number; y: number }, relativePosition: { xPercent: number; yPercent: number }) => {
    if (!selectedProductFile || !selectedProduct) {
      setStatus('Select a product, then tap the room.');
      return;
    }
    placeProduct(selectedProductFile, selectedProduct, relativePosition, pixelPosition);
  }, [placeProduct, selectedProduct, selectedProductFile]);

  const handleObjectMove = useCallback((id: string, pixelPosition: { x: number; y: number }, relativePosition: { xPercent: number; yPercent: number }) => {
    setPlacedObjects((previous) => previous.map((item) => (
      item.id === id ? { ...item, pixelPosition, relativePosition } : item
    )));
    setStatus('Placement updated');
  }, []);

  const handleObjectDelete = useCallback((id: string) => {
    pushHistory();
    setPlacedObjects((previous) => previous.filter((item) => item.id !== id));
    setStatus('Product removed from scene');
  }, [pushHistory]);

  const handleObjectRotate = useCallback((id: string, delta: number) => {
    setPlacedObjects((previous) => previous.map((item) => (
      item.id === id ? { ...item, rotation: ((item.rotation || 0) + delta + 360) % 360 } : item
    )));
    setStatus('Product rotation updated');
  }, []);

  const handleUndo = useCallback(() => {
    const snapshot = history[history.length - 1];
    if (!snapshot) return;
    setSelectedRoom(snapshot.selectedRoom);
    setSceneImage(snapshot.sceneImage);
    setPlacedObjects(snapshot.placedObjects);
    setHistory((previous) => previous.slice(0, -1));
    setStatus('Undo complete');
  }, [history]);

  const matchProductLighting = useCallback(() => {
    if (activeProducts.length === 0 && !selectedProductFile) {
      setStatus('Add a product to match lighting.');
      return;
    }
    setAmbientLight(104);
    setLightingTemperature(10);
    setStatus('Lighting matched to products.');
  }, [activeProducts.length, selectedProductFile]);

  const saveProject = useCallback(async () => {
    try {
      const project: SavedProject = {
        workflow,
        selectedRoom,
        sceneBase64: sceneImage ? await fileToBase64(sceneImage) : null,
        originalBase64: originalSceneBase64,
        placedObjects: await Promise.all(placedObjects.map(async (item) => ({
          ...item,
          imageBase64: await fileToBase64(item.image),
        }))),
        stageProducts,
        moodProducts,
        designBrief,
        moodPrompt,
        stagePrompt,
        keepPrompt,
        removePrompt: stageRemovePrompt,
        ambientLight,
        lightingTemperature,
      };
      localStorage.setItem('interiorCreatorWorkspace', JSON.stringify(project));
      setStatus('Project saved locally');
    } catch (err) {
      setError(friendlyIssueMessage('The project could not be saved. Try again in a moment.')(err));
    }
  }, [ambientLight, designBrief, keepPrompt, lightingTemperature, moodProducts, moodPrompt, originalSceneBase64, placedObjects, sceneImage, selectedRoom, stageProducts, stagePrompt, stageRemovePrompt, workflow]);

  const loadProject = useCallback(() => {
    try {
      const raw = localStorage.getItem('interiorCreatorWorkspace');
      if (!raw) {
        setStatus('No saved project found');
        return;
      }
      const project = JSON.parse(raw) as SavedProject;
      setWorkflow(project.workflow || 'design');
      setSelectedRoom(project.selectedRoom || (project.sceneBase64 ? {
        id: 'loaded-room',
        name: 'Loaded room',
        category: 'Saved',
        source: 'upload',
      } : null));
      setSceneImage(project.sceneBase64 ? dataUrlToFile(project.sceneBase64, 'saved-scene.jpg') : null);
      setOriginalSceneBase64(project.originalBase64 || project.sceneBase64 || null);
      setPlacedObjects((project.placedObjects || []).map((item) => ({
        ...item,
        image: dataUrlToFile(item.imageBase64, `${item.id}.jpg`),
      })));
      setStageProducts(project.stageProducts || []);
      setMoodProducts(project.moodProducts || []);
      setDesignBrief(project.designBrief || 'Create a refined room composition with the selected pieces.');
      setMoodPrompt(project.moodPrompt || '');
      setStagePrompt(project.stagePrompt || '');
      setKeepPrompt(project.keepPrompt || '');
      setStageRemovePrompt(project.removePrompt || '');
      setAmbientLight(project.ambientLight || 100);
      setLightingTemperature(project.lightingTemperature || 0);
      setStatus('Project loaded');
    } catch (err) {
      setError(friendlyIssueMessage('The saved project could not be opened. Try again in a moment.')(err));
    }
  }, []);

  const saveToGallery = useCallback(async () => {
    if (!hasGenerated || !generatedImageUrl) return;
    const durableImageUrl = workflow === 'mood'
      ? generatedImageUrl
      : sceneImage ? await fileToBase64(sceneImage) : generatedImageUrl;
    const item: GalleryItem = {
      id: `${Date.now()}`,
      title: workflowLabels[workflow],
      imageUrl: durableImageUrl,
      createdAt: new Date().toISOString(),
    };
    setGallery((previous) => {
      const next = [item, ...previous].slice(0, 24);
      localStorage.setItem('interiorCreatorGallery', JSON.stringify(next));
      return next;
    });
    setStatus('Saved to gallery');
  }, [generatedImageUrl, hasGenerated, sceneImage, workflow]);

  const resetProject = useCallback(() => {
    setSceneImage(null);
    setSelectedRoom(null);
    setOriginalSceneBase64(null);
    setPlacedObjects([]);
    setSelectedProduct(null);
    setSelectedProductFile(null);
    setStageProducts([]);
    setMoodProducts([]);
    setMoodboardImageUrl(null);
    setDebugPrompt(null);
    setError(null);
    setAmbientLight(100);
    setLightingTemperature(0);
    setStatus('New project ready');
    setHistory([]);
  }, []);

  const generateDesign = useCallback(async () => {
    const productsForGeneration = activeProducts.length > 0
      ? activeProducts
      : selectedProductFile && selectedProduct
        ? [{
          id: 'selected-product',
          image: selectedProductFile,
          name: selectedProduct.name,
          description: selectedProduct.name,
          thumbnailUrl: selectedProduct.imageUrl,
          relativePosition: { xPercent: 50, yPercent: 62 },
          pixelPosition: { x: 0, y: 0 },
          isVisible: true,
        }]
        : [];

    if (!sceneImage || productsForGeneration.length === 0) {
      setStatus('Add a room and at least one product first');
      return;
    }

    pushHistory();
    setIsLoading(true);
    setError(null);
    setStatus('Creating design');
    try {
      const { finalImageUrl, finalPrompt } = await generateMultiCompositeImage(
        productsForGeneration.map((item) => ({
          image: item.image,
          description: item.description,
          relativePosition: item.relativePosition,
          scale: item.scale,
          rotation: item.rotation,
        })),
        sceneImage,
        `${designBrief || 'Refined room composition'}\n${lightingInstruction}`,
      );
      const nextFile = await imageUrlToFile(finalImageUrl, `generated-${Date.now()}.jpg`);
      setSceneImage(nextFile);
      setPlacedObjects([]);
      setDebugPrompt(finalPrompt);
      setStatus('Design ready');
    } catch (err) {
      setError(friendlyIssueMessage('The design could not be finished. Try again in a moment.')(err));
      setStatus('Design paused');
    } finally {
      setIsLoading(false);
    }
  }, [activeProducts, designBrief, lightingInstruction, pushHistory, sceneImage, selectedProduct, selectedProductFile]);

  const generateRemoval = useCallback(async () => {
    if (!sceneImage || !removePrompt.trim()) return;
    pushHistory();
    setIsLoading(true);
    setError(null);
    setStatus('Removing item');
    try {
      const { finalImageUrl, finalPrompt } = await stageRoomImage(sceneImage, `Remove ${removePrompt}. ${lightingInstruction} Cleanly inpaint the removed area using the surrounding wall, floor, fabric, reflections, grain, and lighting. Do not leave any shadow, glow, pale patch, blurred rectangle, outline, duplicate texture, or visible edit mark. Preserve all other architecture, lighting, furniture, and camera perspective.`);
      setSceneImage(await imageUrlToFile(finalImageUrl, `clean-room-${Date.now()}.jpg`));
      setPlacedObjects([]);
      setRemoveTargetPosition(null);
      setDebugPrompt(finalPrompt);
      setStatus('Clean edit ready');
    } catch (err) {
      setError(friendlyIssueMessage('The clean edit could not be finished. Try again in a moment.')(err));
      setStatus('Clean edit paused');
    } finally {
      setIsLoading(false);
    }
  }, [lightingInstruction, pushHistory, removePrompt, sceneImage]);

  const generateStage = useCallback(async () => {
    if (!sceneImage) return;
    pushHistory();
    setIsLoading(true);
    setError(null);
    setStatus('Staging scene');
    try {
      const referenceFiles = await Promise.all(stageProducts.map((product) => fetchUrlToFile(product.url, `${product.name}.jpg`)));
      const direction = `${stagePrompt}\n${lightingInstruction}\nKeep: ${keepPrompt || 'existing architecture and fixed finishes'}\nRemove: ${stageRemovePrompt || 'nothing unless visually necessary'}`;
      const { finalImageUrl, finalPrompt } = await stageRoomImage(sceneImage, direction, referenceFiles);
      setSceneImage(await imageUrlToFile(finalImageUrl, `staged-${Date.now()}.jpg`));
      setPlacedObjects([]);
      setDebugPrompt(finalPrompt);
      setStatus('Stage ready');
    } catch (err) {
      setError(friendlyIssueMessage('The staged scene could not be finished. Try again in a moment.')(err));
      setStatus('Stage paused');
    } finally {
      setIsLoading(false);
    }
  }, [keepPrompt, lightingInstruction, pushHistory, sceneImage, stageProducts, stagePrompt, stageRemovePrompt]);

  const generateMood = useCallback(async () => {
    if (moodProducts.length === 0 || !moodPrompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setStatus('Creating moodboard');
    try {
      const { finalImageUrl, finalPrompt } = await generateMoodboard(moodProducts, moodPrompt);
      setMoodboardImageUrl(finalImageUrl);
      setDebugPrompt(finalPrompt);
      setStatus('Moodboard ready');
    } catch (err) {
      setError(friendlyIssueMessage('The moodboard could not be finished. Try again in a moment.')(err));
      setStatus('Moodboard paused');
    } finally {
      setIsLoading(false);
    }
  }, [moodProducts, moodPrompt]);

  const primaryGenerate = workflow === 'design'
    ? editMode === 'remove' ? generateRemoval : generateDesign
    : workflow === 'stage' ? generateStage : generateMood;

  const canGenerate = workflow === 'design'
    ? isAgentReady && canGenerateDesign({
      hasScene: !!sceneImage && !!selectedRoom,
      editMode,
      removePrompt,
      activeProductCount: activeProducts.length,
      hasSelectedProduct: !!selectedProductFile,
      designBrief,
    })
    : workflow === 'stage'
      ? isAgentReady && !!sceneImage && !!selectedRoom && (!!stagePrompt.trim() || stageProducts.length > 0)
      : isAgentReady && moodProducts.length > 0 && !!moodPrompt.trim();

  const readinessReason = useMemo(() => {
    if (isLoading) return 'Creating...';
    if (agentStatusError) return 'Studio connection is being checked.';
    if (agentStatus && !agentStatus.configured) return 'Studio connection needed.';
    if (!agentStatus) return 'Checking studio...';
    if (workflow === 'mood') {
      if (moodProducts.length === 0) return 'Select one product.';
      if (!moodPrompt.trim()) return 'Add direction.';
      return 'Ready.';
    }
    if (!sceneImage || !selectedRoom) return 'Choose a room.';
    if (workflow === 'stage') return stagePrompt.trim() || stageProducts.length > 0 ? 'Ready.' : 'Add staging direction.';
    if (editMode === 'remove') return removePrompt.trim() ? 'Ready.' : 'Tap or describe item.';
    if (activeProducts.length === 0 && !selectedProductFile) return 'Add a product.';
    if (!designBrief.trim()) return 'Add brief.';
    return 'Ready.';
  }, [activeProducts.length, agentStatus, agentStatusError, designBrief, editMode, isLoading, moodProducts.length, moodPrompt, removePrompt, sceneImage, selectedProductFile, selectedRoom, stageProducts.length, stagePrompt, workflow]);

  useEffect(() => {
    try {
      const rawGallery = localStorage.getItem('interiorCreatorGallery');
      if (rawGallery) setGallery(JSON.parse(rawGallery));
      localStorage.removeItem('interiorCreatorHistory');
    } catch {
      setGallery([]);
    }
  }, []);

  const refreshAgentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/openai-responses');
      if (!response.ok) throw new Error(`Studio status failed (${response.status}).`);
      const nextStatus = await response.json();
      setAgentStatus(nextStatus);
      setAgentStatusError(null);
    } catch (err) {
      setAgentStatus(null);
      setAgentStatusError(friendlyIssueMessage('Studio connection is being checked.')(err));
    }
  }, []);

  useEffect(() => {
    refreshAgentStatus();
  }, [refreshAgentStatus]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setError(friendlyIssueMessage('The studio paused for a moment. Refresh or try again.')(event.error || event.message));
      setIsLoading(false);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      setError(friendlyIssueMessage('The studio paused for a moment. Refresh or try again.')(event.reason));
      setIsLoading(false);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (!isTouchDragging) return undefined;

    const onMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      setTouchGhostPosition({ x: touch.clientX, y: touch.clientY });
      const dropZone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLDivElement>('[data-scene-dropzone="true"]');
      if (!dropZone) {
        setIsTouchHovering(false);
        setTouchOrbPosition(null);
        return;
      }
      const rect = dropZone.getBoundingClientRect();
      setIsTouchHovering(true);
      setTouchOrbPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    };

    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const dropZone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest<HTMLDivElement>('[data-scene-dropzone="true"]');
      if (dropZone && sceneImgRef.current && selectedProductFile && selectedProduct) {
        const rect = dropZone.getBoundingClientRect();
        handleCanvasDrop(
          { x: touch.clientX - rect.left, y: touch.clientY - rect.top },
          {
            xPercent: ((touch.clientX - rect.left) / rect.width) * 100,
            yPercent: ((touch.clientY - rect.top) / rect.height) * 100,
          },
        );
      }
      setIsTouchDragging(false);
      setTouchGhostPosition(null);
      setIsTouchHovering(false);
      setTouchOrbPosition(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: false });
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleCanvasDrop, isTouchDragging, selectedProduct, selectedProductFile]);

  const renderRoomLibrary = () => (
    <section className="ic-library-section ic-room-library-section" aria-label="Room library">
      <div className="ic-section-heading">
        <h3>Rooms</h3>
        <div className="ic-library-filters">
          <div className="ic-chip-row" aria-label="Room category">
            {['All', ...Array.from(new Set(SCENE_LIBRARY.map((item) => item.type)))].map((type) => (
              <button key={type} type="button" className={activeRoomCategory === type ? 'is-active' : ''} onClick={() => setActiveRoomCategory(type)}>
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="ic-asset-grid ic-room-grid">
        <label className="ic-asset-tile ic-upload-tile">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setNewScene(file);
            }}
          />
          <span className="ic-upload-box">Upload</span>
          <span>Room</span>
        </label>
        {filteredRooms.map((room) => (
          <button key={room.id} type="button" className="ic-asset-tile" onClick={() => loadRoomFromLibrary(room)}>
            <img src={room.thumbnailUrl} alt={room.name} />
            <span>{room.name}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const renderProductLibrary = (mode: 'place' | 'stage' | 'mood' = 'place') => (
    <section className="ic-library-section ic-product-library-section" aria-label="Product library">
      <div className="ic-section-heading">
        <h3>{mode === 'place' ? 'Products' : 'References'} <span className="ic-count">({filteredProducts.length})</span></h3>
        <div className="ic-library-filters">
          <div className="ic-chip-row" aria-label="Product category">
            {['All', ...Array.from(new Set(PRODUCT_LIBRARY.map((item) => item.category)))].map((category) => (
              <button key={category} type="button" className={activeProductCategory === category ? 'is-active' : ''} onClick={() => setActiveProductCategory(category)}>
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="ic-asset-grid">
        <label className="ic-asset-tile ic-upload-tile">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (mode === 'mood') {
                const url = URL.createObjectURL(file);
                setMoodProducts((previous) => [...previous, { name: file.name, url }]);
                setStatus('Uploaded product added to moodboard');
                return;
              }
              if (mode === 'stage') {
                const url = URL.createObjectURL(file);
                setStageProducts((previous) => [...previous, { name: file.name, url }]);
                setStatus('Reference added to staging');
                return;
              }
              handleUploadedProduct(file);
            }}
          />
          <span className="ic-upload-box">Upload</span>
          <span>Product</span>
        </label>
        {filteredProducts.map((product) => {
          const isMoodSelected = moodProducts.some((item) => item.url === product.thumbnailUrl);
          const isStageSelected = stageProducts.some((item) => item.url === product.thumbnailUrl);
          return (
            <button
              key={product.id}
              type="button"
              draggable={mode === 'place'}
              className={`ic-asset-tile ${isMoodSelected || isStageSelected ? 'is-active' : ''}`}
              onDragStart={(event) => {
                if (mode !== 'place') return;
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', `library-product:${encodeURIComponent(product.thumbnailUrl)}|${encodeURIComponent(product.name)}`);
              }}
              onClick={() => {
                if (mode === 'mood') {
                  setMoodProducts((previous) => (
                    previous.some((item) => item.url === product.thumbnailUrl)
                      ? previous.filter((item) => item.url !== product.thumbnailUrl)
                      : [...previous, { name: product.name, url: product.thumbnailUrl }]
                  ));
                  return;
                }
                if (mode === 'stage') {
                  setStageProducts((previous) => (
                    previous.some((item) => item.url === product.thumbnailUrl)
                      ? previous.filter((item) => item.url !== product.thumbnailUrl)
                      : [...previous, { name: product.name, url: product.thumbnailUrl }]
                  ));
                  return;
                }
                selectProductFromLibrary(product);
              }}
            >
              <ImageWithFallback src={product.thumbnailUrl} productName={product.name} productId={product.id} alt={product.name} />
              <span>{product.name}</span>
              <small>{product.subCategory}</small>
            </button>
          );
        })}
        {filteredProducts.length === 0 && (
          <p className="ic-library-empty">No products in this category.</p>
        )}
      </div>
    </section>
  );

  const renderCanvas = () => (
    <section className="ic-canvas-card">
      <div className="ic-canvas-toolbar">
        <div>
          <p>{workflowLabels[workflow]}</p>
          <h2>{sceneImage ? 'Canvas' : 'Choose a Room'}</h2>
        </div>
        <div className="ic-inline-actions">
          <button type="button" onClick={saveToGallery} disabled={!hasGenerated || !generatedImageUrl}>
            <Heart size={15} /> Heart
          </button>
        </div>
      </div>
      <input
        ref={recoveryUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="ic-hidden-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setNewScene(file);
        }}
      />
      <div className="ic-canvas-filter" style={{ filter: sceneLightFilter }}>
        <ImageUploader
          ref={sceneImgRef}
          id="room-scene-uploader"
          imageUrl={sceneImageUrl}
          onFileSelect={setNewScene}
          isDropZone={workflow === 'design' && !!sceneImage && !isLoading}
          onProductDrop={workflow === 'design' && editMode === 'add' ? handleCanvasDrop : undefined}
          onObjectMove={handleObjectMove}
          onObjectDelete={handleObjectDelete}
          onObjectRotate={handleObjectRotate}
          onLibraryProductDrop={handleLibraryProductDrop}
          persistedOrbPosition={workflow === 'design' && editMode === 'remove' ? removeTargetPosition : null}
          onScenePointSelect={workflow === 'design' && editMode === 'remove' ? (position, relative) => {
            setRemoveTargetPosition(position);
            setRemovePrompt(`item around ${Math.round(relative.xPercent)}% from the left and ${Math.round(relative.yPercent)}% from the top`);
            setStatus('Target selected. Generate to clean the scene.');
          } : undefined}
          showPerspectiveGrid={workflow === 'design' && editMode === 'add' && (!!selectedProduct || isTouchDragging || isTouchHovering)}
          isTouchHovering={isTouchHovering}
          touchOrbPosition={touchOrbPosition}
          placedObjects={litActiveProducts}
          className="ic-scene-frame"
        />
      </div>
      {!sceneImage && (
        <div className="ic-recovery-panel">
          <p>Choose an image or start with a blank canvas.</p>
          <div className="ic-action-strip">
            <button type="button" onClick={() => recoveryUploadRef.current?.click()}>Upload</button>
            <button type="button" onClick={loadFallbackRoom}>Try again</button>
            <button type="button" onClick={continueBlankProject}>Blank canvas</button>
          </div>
        </div>
      )}
      {assetLoadWarning && (
        <div className="ic-recovery-panel">
          <p>{assetLoadWarning}</p>
          <div className="ic-action-strip">
            <button type="button" onClick={() => recoveryUploadRef.current?.click()}>Upload</button>
            <button type="button" onClick={loadFallbackRoom}>Try again</button>
            <button type="button" onClick={continueBlankProject}>Blank canvas</button>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="ic-loading-line">
          <Spinner />
          <span>{status}</span>
        </div>
      )}
      {error && (
        <div className="ic-error-line">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </section>
  );

  const renderEditorControls = () => (
    <section className="ic-controls-panel">
      <div className="ic-section-heading">
        <h3>{workflow === 'mood' ? 'Direction' : 'Edit'}</h3>
        <p>{status}</p>
      </div>
      {workflow === 'design' && (
        <div className="ic-editor-tools" aria-label="Editor tools">
          <button type="button" onClick={() => setIsMeasureMode(true)} disabled={!sceneImage}>
            <Ruler size={15} /> Measure
          </button>
          <button type="button" className={editMode === 'remove' ? 'is-active' : ''} onClick={() => setEditMode('remove')} disabled={!sceneImage}>
            Remove
          </button>
        </div>
      )}
      {workflow === 'design' && (
        <>
          <div className="ic-mode-toggle">
            <button type="button" className={editMode === 'add' ? 'is-active' : ''} onClick={() => setEditMode('add')}>Add</button>
            <button type="button" className={editMode === 'remove' ? 'is-active' : ''} onClick={() => setEditMode('remove')}>Remove</button>
          </div>
          {editMode === 'add' && (
            <textarea value={designBrief} onChange={(event) => setDesignBrief(event.target.value)} placeholder="Design direction" />
          )}
          {editMode === 'remove' && (
            <>
              <p className="ic-small-note">Tap the item, then generate.</p>
              <textarea value={removePrompt} onChange={(event) => setRemovePrompt(event.target.value)} placeholder="Item to remove" />
            </>
          )}
        </>
      )}
      {workflow === 'stage' && (
        <>
          <textarea value={stagePrompt} onChange={(event) => setStagePrompt(event.target.value)} placeholder="Staging direction" />
          <input value={keepPrompt} onChange={(event) => setKeepPrompt(event.target.value)} placeholder="Keep" />
          <input value={stageRemovePrompt} onChange={(event) => setStageRemovePrompt(event.target.value)} placeholder="Remove" />
          <p className="ic-small-note">{stageProducts.length} references selected</p>
        </>
      )}
      {workflow === 'mood' && (
        <>
          <textarea value={moodPrompt} onChange={(event) => setMoodPrompt(event.target.value)} placeholder="Mood direction" />
          <p className="ic-small-note">{moodProducts.length} selected</p>
        </>
      )}
      <div className="ic-lighting-panel" aria-label="Scene lighting controls">
        <div className="ic-lighting-panel-header">
          <span>Lighting</span>
          <button type="button" onClick={matchProductLighting}>Match light</button>
        </div>
        <label className="ic-range-label">
          <span>Brightness</span>
          <strong>{ambientLight}%</strong>
          <input type="range" min="70" max="135" value={ambientLight} onChange={(event) => setAmbientLight(Number(event.target.value))} />
        </label>
        <label className="ic-range-label">
          <span>Temperature</span>
          <strong>{lightingTemperature > 0 ? `+${lightingTemperature} warm` : lightingTemperature < 0 ? `${lightingTemperature} cool` : '0 neutral'}</strong>
          <input type="range" min="-40" max="40" value={lightingTemperature} onChange={(event) => setLightingTemperature(Number(event.target.value))} />
        </label>
      </div>
    </section>
  );

  const renderGenerateControls = () => (
    <section className="ic-controls-panel">
      <div className="ic-section-heading">
        <h3>Export</h3>
        <p>{readinessReason}</p>
      </div>
      {(!isAgentReady || agentStatusError) && (
        <div className="ic-agent-status">
          <span>{agentStatusError || 'Studio connection needed before generating.'}</span>
          <button type="button" onClick={refreshAgentStatus}>Try again</button>
        </div>
      )}
      <div className="ic-action-strip">
        <button type="button" onClick={primaryGenerate} disabled={!canGenerate || isLoading}>
          <Sparkles size={15} /> Create
        </button>
        <button type="button" onClick={saveProject}>Save</button>
        <button type="button" onClick={loadProject}>Load</button>
        <button type="button" onClick={handleUndo} disabled={history.length === 0}>Undo</button>
      </div>
      {hasGenerated && sceneImageUrl && workflow !== 'mood' && (
        <div className="ic-action-strip">
          <a href={sceneImageUrl} download="interior-creator-scene.jpg">Save image</a>
          <button type="button" onClick={() => setIsCompareOpen(true)} disabled={!originalSceneUrl}>Compare</button>
        </div>
      )}
      {workflow === 'mood' && moodboardImageUrl && (
        <div className="ic-output-preview">
          <img src={moodboardImageUrl} alt="Generated moodboard" />
          <a href={moodboardImageUrl} download="interior-creator-moodboard.jpg">Save image</a>
        </div>
      )}
    </section>
  );

  return (
    <div className="ic-app-v2">
      <BeforeAfterModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} beforeImage={originalSceneUrl || sceneImageUrl || ''} afterImage={sceneImageUrl || ''} />
      <TouchGhost imageUrl={isTouchDragging ? selectedProduct?.imageUrl || null : null} position={touchGhostPosition} />

      <header className="ic-global-header">
        <a className="ic-brand-lockup" href="/" aria-label="Interior Creator home">
          <span className="ic-brand-mark" aria-hidden="true">
            <img src="/images/brand/legends-gold-butterfly.avif" alt="" />
          </span>
          <span>Interior Creator</span>
        </a>
        <button type="button" aria-label="Open menu" onClick={() => setIsMenuOpen((open) => !open)}>
          <Menu size={21} />
        </button>
        {isMenuOpen && (
          <div className="ic-menu">
            <button type="button" onClick={() => { resetProject(); setIsMenuOpen(false); }}>New Project</button>
            <button type="button" onClick={() => { setIsGalleryOpen(true); setIsMenuOpen(false); }}>Gallery {gallery.length}</button>
            <button type="button" onClick={() => { localStorage.removeItem('interiorCreatorWorkspace'); setStatus('Workspace history cleared'); setIsMenuOpen(false); }}>Clear Workspace</button>
          </div>
        )}
      </header>

      <main className="ic-workspace">
        <section className="ic-hero-compact">
          <p>Powered by Downtown Perks</p>
          <h1>Design Your Space <span>In Seconds</span></h1>
          <p>Choose a room, place real products, then generate a polished edit.</p>
        </section>

        <nav className="ic-workflow-switcher" aria-label="Workspace workflow">
          {(['design', 'stage', 'mood'] as Workflow[]).map((item) => (
          <button key={item} type="button" className={workflow === item ? 'is-active' : ''} onClick={() => setWorkflow(item)}>
              <span>{workflowLabels[item]}</span>
              <small>{workflowDescriptions[item]}</small>
            </button>
          ))}
        </nav>

        <section className="ic-progress-strip" aria-label="Project progress">
          {[
            workflow === 'mood' ? 'References' : 'Room',
            workflow === 'design' ? 'Products' : workflow === 'stage' ? 'References' : 'Direction',
            workflow === 'design' ? 'Arrange' : 'Refine',
            'Create',
          ].map((step, index) => {
            const complete = index === 0
              ? (workflow === 'mood' ? moodProducts.length > 0 : !!sceneImage)
              : index === 1
                ? (workflow === 'mood' ? !!moodPrompt.trim() : workflow === 'stage' ? stagePrompt.trim() || stageProducts.length > 0 : activeProducts.length > 0 || editMode === 'remove')
                : index === 2
                  ? workflow === 'mood' || !!sceneImage
                  : hasGenerated;
            return (
              <div key={step} className={complete ? 'is-complete' : ''}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            );
          })}
        </section>

        <section key={workflow} className="ic-workflow-stack">
          <div className="ic-flow-step">
            {workflow !== 'mood' && renderRoomLibrary()}
            {workflow === 'mood' && renderProductLibrary('mood')}
          </div>
          {workflow !== 'mood' && (
            <div className="ic-flow-step">
              {renderProductLibrary(workflow === 'stage' ? 'stage' : 'place')}
            </div>
          )}
          <div className="ic-flow-step">
            {renderEditorControls()}
          </div>
          <div className="ic-flow-step">
            {renderCanvas()}
          </div>
          <div className="ic-flow-step">
            {renderGenerateControls()}
          </div>
        </section>
      </main>

      <MeasureOverlay isActive={isMeasureMode} imageUrl={sceneImageUrl} onClose={() => setIsMeasureMode(false)} />

      {isGalleryOpen && (
        <div className="ic-modal-backdrop" onClick={() => setIsGalleryOpen(false)}>
          <section className="ic-gallery-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ic-modal-header">
              <h2>Saved Gallery</h2>
              <button type="button" onClick={() => setIsGalleryOpen(false)} aria-label="Close gallery"><X size={20} /></button>
            </div>
            {gallery.length === 0 ? (
              <p className="ic-small-note">No saved designs yet. Heart a generated image to keep it here.</p>
            ) : (
              <div className="ic-gallery-grid">
                {gallery.map((item) => (
                  <a key={item.id} href={item.imageUrl} download={`${item.title}.jpg`}>
                    <img src={item.imageUrl} alt={item.title} />
                    <span>{item.title}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default App;
