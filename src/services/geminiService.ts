/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getGeminiApiKey = (): string => {
    return (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
};

const getGeminiClient = (): GoogleGenAI | null => {
    const apiKey = getGeminiApiKey();
    return apiKey ? new GoogleGenAI({ apiKey }) : null;
};

// Helper to get intrinsic image dimensions from a File object
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper to crop a square image back to an original aspect ratio, removing padding.
const cropToOriginalAspectRatio = (
    imageDataUrl: string,
    originalWidth: number,
    originalHeight: number,
    targetDimension: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = () => {
            // Re-calculate the dimensions of the content area within the padded square image
            const aspectRatio = originalWidth / originalHeight;
            let contentWidth, contentHeight;
            if (aspectRatio > 1) { // Landscape
                contentWidth = targetDimension;
                contentHeight = targetDimension / aspectRatio;
            } else { // Portrait or square
                contentHeight = targetDimension;
                contentWidth = targetDimension * aspectRatio;
            }

            // Calculate the top-left offset of the content area
            const x = (targetDimension - contentWidth) / 2;
            const y = (targetDimension - contentHeight) / 2;

            const canvas = document.createElement('canvas');
            // Set canvas to the final, un-padded dimensions
            canvas.width = contentWidth;
            canvas.height = contentHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }
            
            // Draw the relevant part of the square generated image onto the new, smaller canvas
            ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
            
            // Return the data URL of the newly cropped image
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (err) => reject(new Error(`Image load error during cropping: ${err}`));
    });
};


// New resize logic inspired by the reference to enforce a consistent aspect ratio without cropping.
// It resizes the image to fit within a square and adds padding, ensuring a consistent
// input size for the AI model, which enhances stability.
const resizeImage = (file: File, targetDimension: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetDimension;
                canvas.height = targetDimension;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }

                // Fill the canvas with a neutral background to avoid transparency issues
                // and ensure a consistent input format for the model.
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, targetDimension, targetDimension);

                // Calculate new dimensions to fit inside the square canvas while maintaining aspect ratio
                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (aspectRatio > 1) { // Landscape image
                    newWidth = targetDimension;
                    newHeight = targetDimension / aspectRatio;
                } else { // Portrait or square image
                    newHeight = targetDimension;
                    newWidth = targetDimension * aspectRatio;
                }

                // Calculate position to center the image on the canvas
                const x = (targetDimension - newWidth) / 2;
                const y = (targetDimension - newHeight) / 2;
                
                // Draw the resized image onto the centered position
                ctx.drawImage(img, x, y, newWidth, newHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg', // Force jpeg to handle padding color consistently
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error: ${err}`));
    });
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper to convert File to a data URL string
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to load image for local preview.'));
        img.src = src;
    });
};

const createLocalStagedPreview = async (
    environmentImage: File,
    finalPrompt: string,
    mode: 'stage' | 'mood' = 'stage'
): Promise<string> => {
    const sourceUrl = await fileToDataUrl(environmentImage);
    const img = await loadImage(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create local preview.');

    ctx.drawImage(img, 0, 0);

    const prompt = finalPrompt.toLowerCase();
    const wantsMoody = prompt.includes('moody') || prompt.includes('dramatic') || prompt.includes('industrial');
    const wantsWarm = prompt.includes('warm') || prompt.includes('boho') || prompt.includes('mid-century');
    const isRemoval = prompt.includes('remove') || prompt.includes('removed') || prompt.includes('cleaned final room');

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = wantsMoody ? 'rgba(8, 18, 38, 0.18)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = wantsWarm ? 'rgba(200, 169, 106, 0.16)' : 'rgba(210, 220, 230, 0.10)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'stage' && isRemoval) {
        ctx.globalCompositeOperation = 'source-over';
        const patchW = canvas.width * 0.42;
        const patchH = canvas.height * 0.18;
        const patchX = (canvas.width - patchW) / 2;
        const patchY = canvas.height * 0.58;
        const sample = ctx.getImageData(
            Math.max(0, Math.round(patchX)),
            Math.max(0, Math.round(patchY)),
            Math.min(canvas.width, Math.round(patchW)),
            Math.min(canvas.height, Math.round(patchH))
        );
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < sample.data.length; i += 4) {
            r += sample.data[i];
            g += sample.data[i + 1];
            b += sample.data[i + 2];
        }
        const pixels = Math.max(1, sample.data.length / 4);
        const gradient = ctx.createLinearGradient(patchX, patchY, patchX + patchW, patchY + patchH);
        gradient.addColorStop(0, `rgba(${Math.round(r / pixels)}, ${Math.round(g / pixels)}, ${Math.round(b / pixels)}, 0.18)`);
        gradient.addColorStop(1, 'rgba(255,255,255,0.16)');
        ctx.fillStyle = gradient;
        ctx.fillRect(patchX, patchY, patchW, patchH);
        ctx.strokeStyle = 'rgba(200, 169, 106, 0.28)';
        ctx.lineWidth = Math.max(1, canvas.width * 0.002);
        ctx.strokeRect(patchX, patchY, patchW, patchH);
    } else if (mode === 'stage') {
        ctx.globalCompositeOperation = 'source-over';
        const floorY = canvas.height * 0.72;
        const rugW = canvas.width * 0.48;
        const rugH = canvas.height * 0.14;
        const rugX = (canvas.width - rugW) / 2;
        ctx.save();
        ctx.translate(canvas.width / 2, floorY);
        ctx.rotate(-0.02);
        ctx.fillStyle = 'rgba(232, 226, 214, 0.58)';
        ctx.beginPath();
        ctx.ellipse(0, 0, rugW / 2, rugH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = 'rgba(20, 36, 63, 0.20)';
        ctx.beginPath();
        ctx.ellipse(canvas.width * 0.50, floorY - rugH * 0.25, rugW * 0.28, rugH * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        const sofaX = canvas.width * 0.30;
        const sofaY = floorY - canvas.height * 0.18;
        const sofaW = canvas.width * 0.40;
        const sofaH = canvas.height * 0.12;
        ctx.fillStyle = 'rgba(234, 229, 219, 0.78)';
        ctx.fillRect(sofaX, sofaY, sofaW, sofaH);
        ctx.fillRect(sofaX - sofaW * 0.05, sofaY + sofaH * 0.22, sofaW * 0.10, sofaH * 0.78);
        ctx.fillRect(sofaX + sofaW * 0.95, sofaY + sofaH * 0.22, sofaW * 0.10, sofaH * 0.78);
        ctx.fillStyle = 'rgba(18, 31, 54, 0.16)';
        ctx.fillRect(sofaX + sofaW * 0.08, sofaY + sofaH * 0.62, sofaW * 0.84, sofaH * 0.06);

        ctx.fillStyle = 'rgba(200, 169, 106, 0.66)';
        ctx.fillRect(rugX + rugW * 0.18, floorY - rugH * 0.40, rugW * 0.18, rugH * 0.18);
        ctx.fillStyle = 'rgba(23, 54, 47, 0.58)';
        ctx.beginPath();
        ctx.ellipse(rugX + rugW * 0.78, floorY - rugH * 0.92, rugW * 0.055, rugH * 0.38, -0.3, 0, Math.PI * 2);
        ctx.ellipse(rugX + rugW * 0.82, floorY - rugH * 0.86, rugW * 0.05, rugH * 0.34, 0.28, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas.toDataURL('image/jpeg', 0.9);
};

const createLocalCompositePreview = async (
    placedObjects: { image: File, relativePosition: {xPercent: number, yPercent: number}, scale?: number, rotation?: number }[],
    environmentImage: File
): Promise<string> => {
    const sceneUrl = await fileToDataUrl(environmentImage);
    const scene = await loadImage(sceneUrl);
    const canvas = document.createElement('canvas');
    canvas.width = scene.naturalWidth;
    canvas.height = scene.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create local composite preview.');

    ctx.drawImage(scene, 0, 0);

    for (const obj of placedObjects) {
        const objectUrl = await fileToDataUrl(obj.image);
        const objectImg = await loadImage(objectUrl);
        const scale = obj.scale ?? 1;
        const maxW = canvas.width * 0.24 * scale;
        const ratio = objectImg.naturalWidth / objectImg.naturalHeight || 1;
        const drawW = maxW;
        const drawH = drawW / ratio;
        const x = (obj.relativePosition.xPercent / 100) * canvas.width;
        const y = (obj.relativePosition.yPercent / 100) * canvas.height;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((obj.rotation ?? 0) * Math.PI) / 180);
        ctx.fillStyle = 'rgba(7, 18, 35, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, drawH * 0.42, drawW * 0.42, drawH * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(objectImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
    }

    return canvas.toDataURL('image/jpeg', 0.9);
};

// Helper to draw a marker on an image and return a new File object
const markImage = async (
    paddedSquareFile: File, 
    position: { xPercent: number; yPercent: number; },
    originalDimensions: { originalWidth: number; originalHeight: number; }
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(paddedSquareFile);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("Failed to read file for marking."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const targetDimension = canvas.width;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context for marking.'));
                }

                // Draw the original (padded) image
                ctx.drawImage(img, 0, 0);

                // Recalculate the content area's dimensions and offset within the padded square canvas.
                // This is crucial to translate the content-relative percentages to the padded canvas coordinates.
                const { originalWidth, originalHeight } = originalDimensions;
                const aspectRatio = originalWidth / originalHeight;
                let contentWidth, contentHeight;

                if (aspectRatio > 1) { // Landscape
                    contentWidth = targetDimension;
                    contentHeight = targetDimension / aspectRatio;
                } else { // Portrait or square
                    contentHeight = targetDimension;
                    contentWidth = targetDimension * aspectRatio;
                }
                
                const offsetX = (targetDimension - contentWidth) / 2;
                const offsetY = (targetDimension - contentHeight) / 2;

                // Calculate the marker's coordinates relative to the actual image content
                const markerXInContent = (position.xPercent / 100) * contentWidth;
                const markerYInContent = (position.yPercent / 100) * contentHeight;

                // The final position on the canvas is the content's offset plus the relative position
                const finalMarkerX = offsetX + markerXInContent;
                const finalMarkerY = offsetY + markerYInContent;

                // Make radius proportional to image size, but with a minimum
                const markerRadius = Math.max(5, Math.min(canvas.width, canvas.height) * 0.015);

                // Draw the marker (red circle with white outline) at the corrected coordinates
                ctx.beginPath();
                ctx.arc(finalMarkerX, finalMarkerY, markerRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = markerRadius * 0.2;
                ctx.strokeStyle = 'white';
                ctx.stroke();

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], `marked-${paddedSquareFile.name}`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error('Canvas to Blob conversion failed during marking.'));
                    }
                }, 'image/jpeg', 0.95);
            };
            img.onerror = (err) => reject(new Error(`Image load error during marking: ${err}`));
        };
        reader.onerror = (err) => reject(new Error(`File reader error during marking: ${err}`));
    });
};


/**
 * Generates a composite image using a multi-modal AI model.
 * The model takes a product image, a scene image, and a text prompt
 * to generate a new image with the product placed in the scene.
 * @param objectImage The file for the object to be placed.
 * @param objectDescription A text description of the object.
 * @param environmentImage The file for the background environment.
 * @param environmentDescription A text description of the environment.
 * @param dropPosition The relative x/y coordinates (0-100) where the product was dropped.
 * @returns A promise that resolves to an object containing the base64 data URL of the generated image and the debug image.
 */
export const stageRoomImage = async (
    environmentImage: File,
    stagingPrompt: string
): Promise<{ finalImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting room staging process...');

  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing scene image for staging...');
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);
  
  const cleanEnvironmentImagePart = await fileToPart(resizedEnvironmentImage);
  
  const prompt = `
**Role:**
You are an expert interior designer and virtual staging AI. Your task is to take an image of an empty or partially empty room and stage it with furniture and decor according to the description.

**Specifications:**
-   **Scene to use:** The provided image.
-   **Staging Instruction:** "${stagingPrompt}"
-   **Final Image Requirements:**
    -   Retain the original room's architecture, walls, floors, windows, and lighting as much as possible.
    -   Add high-quality, photorealistic furniture, rugs, plants, art, and decor that fits the requested style.
    -   Ensure correct perspective, scale, and lighting for all added items so they look naturally integrated into the space.
-   The output should ONLY be the final staged image. No text.
`;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Using local staging preview.');
    const finalImageUrl = await createLocalStagedPreview(environmentImage, prompt);
    return { finalImageUrl, finalPrompt: `${prompt}\n\nLocal preview used because GEMINI_API_KEY is not configured.` };
  }

  const textPart = { text: prompt };
  
  console.log('Sending image and staging prompt...');
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [cleanEnvironmentImagePart, textPart] },
  });

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated staged image to original aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    return { finalImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};

export const generateMultiCompositeImage = async (
    placedObjects: { image: File, description: string, relativePosition: {xPercent: number, yPercent: number}, scale?: number, rotation?: number }[],
    environmentImage: File,
    environmentDescription: string
): Promise<{ finalImageUrl: string; debugImageUrl: string | null; finalPrompt: string; }> => {
  console.log('Starting multi-object generation process...');
  
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing scene image...');
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);
  
  const cleanEnvironmentImagePart = await fileToPart(resizedEnvironmentImage);
  
  const objectParts = await Promise.all(placedObjects.map(obj => fileToPart(obj.image)));

  let promptObjectsDescription = placedObjects.map((obj, i) => {
    let desc = `- **Product ${i + 1}**: The image at index ${i + 1} after the environment scene (Description: "${obj.description}"). Place it at approximately X: ${Math.round(obj.relativePosition.xPercent)}%, Y: ${Math.round(obj.relativePosition.yPercent)}% (where 0,0 is top-left).`;
    if (obj.scale !== undefined && obj.scale !== 1) {
      desc += ` Ensure it is scaled by a factor of ${obj.scale}x relative to its natural size in the space.`;
    }
    if (obj.rotation !== undefined && obj.rotation !== 0) {
      desc += ` Rotate the product roughly ${obj.rotation} degrees.`;
    }
    return desc;
  }).join('\n');
  
  const prompt = `
**Role:**
You are an expert interior designer and AI image editor. Your task is to seamlessly composite multiple product images into a background room scene.

**Specifications:**
-   **Environment Scene:** The first image provided (description: "${environmentDescription}").
-   **Products to Insert:**
${promptObjectsDescription}

**Instructions:**
1.  **Placement:** You MUST place each product near its requested location coordinates. The coordinates represent the center point of where the product should be placed.
2.  **Scale & Perspective:** Scale each product naturally based on the depth suggested by its placement coordinates and the surrounding environment. Ensure the perspective matches the scene (e.g., items placed further back should be smaller, items on the floor should respect the floor plane).
3.  **Lighting & Shadows:** 
    - Deduce the primary light source direction from the environment scene.
    - Apply consistent lighting and highlights to the inserted products.
    - Generate realistic cast shadows for each product onto the surfaces they rest on. Ensure the shadow matches the softness/hardness of other shadows in the scene.
    - Add ambient occlusion (soft contact shadows) where the products touch other surfaces.
4.  **Color Matching:** Subtly adjust the color temperature and contrast of the products so they feel like they belong in the environment's lighting conditions.
5.  **Clean Up:** Never place objects floating in mid-air unless typical for that item.
6.  **Output:** The final image must be clean and photorealistic. DO NOT output any text or markdown, ONLY the final generated image. Do not add any bounding boxes or markers. The output should look like a single, untouched photograph.
`;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Using local composite preview.');
    const finalImageUrl = await createLocalCompositePreview(placedObjects, environmentImage);
    return { finalImageUrl, debugImageUrl: null, finalPrompt: `${prompt}\n\nLocal preview used because GEMINI_API_KEY is not configured.` };
  }

  const textPart = { text: prompt };
  const parts: any[] = [cleanEnvironmentImagePart, ...objectParts, textPart];
  
  console.log('Sending images and composition prompt to Gemini 2.5 Flash...');
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
  });

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated image to original aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    let debugImageUrl = null;
    try {
       // We skip debug image for multi drop for simplicity
    } catch (e) {
       console.error("Failed to generate debug overlay", e);
    }
    
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};

export const generateCompositeImage = async (
    objectImage: File,
    objectDescription: string,
    environmentImage: File,
    environmentDescription: string,
    dropPosition: { xPercent: number; yPercent: number; }
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting multi-step image generation process...');

  // Get original scene dimensions for final cropping and correct marker placement
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  
  // Define standard dimension for model inputs
  const MAX_DIMENSION = 1024;
  
  // STEP 1: Prepare images by resizing
  console.log('Resizing product and scene images...');
  const resizedObjectImage = await resizeImage(objectImage, MAX_DIMENSION);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  // STEP 2: Mark the resized scene image for the description model and debug view
  console.log('Marking scene image for analysis...');
  // Pass original dimensions to correctly calculate marker position on the padded image
  const markedResizedEnvironmentImage = await markImage(resizedEnvironmentImage, dropPosition, { originalWidth, originalHeight });

  // The debug image is now the marked one.
  const debugImageUrl = await fileToDataUrl(markedResizedEnvironmentImage);

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Using local product placement preview.');
    const finalImageUrl = await createLocalCompositePreview(
      [{ image: objectImage, description: objectDescription, relativePosition: dropPosition }],
      environmentImage
    );
    return {
      finalImageUrl,
      debugImageUrl,
      finalPrompt: `Local preview for ${objectDescription} in ${environmentDescription}. GEMINI_API_KEY is not configured.`
    };
  }

  // STEP 3: Generate semantic location description with Gemini 2.5 Flash Lite using the MARKED image
  console.log('Generating semantic location description with gemini-2.5-flash-lite...');
  
  const markedEnvironmentImagePart = await fileToPart(markedResizedEnvironmentImage);

  const descriptionPrompt = `
You are an expert scene analyst. I will provide you with an image that has a red marker on it.
Your task is to provide a very dense, semantic description of what is at the exact location of the red marker.
Be specific about surfaces, objects, and spatial relationships. This description will be used to guide another AI in placing a new object.

Example semantic descriptions:
- "The product location is on the dark grey fabric of the sofa cushion, in the middle section, slightly to the left of the white throw pillow."
- "The product location is on the light-colored wooden floor, in the patch of sunlight coming from the window, about a foot away from the leg of the brown leather armchair."
- "The product location is on the white marble countertop, just to the right of the stainless steel sink and behind the green potted plant."

On top of the semantic description above, give a rough relative-to-image description.

Example relative-to-image descriptions:
- "The product location is about 10% away from the bottom-left of the image."
- "The product location is about 20% away from the right of the image."

Provide only the two descriptions concatenated in a few sentences.
`;
  
  let semanticLocationDescription = '';
  try {
    const descriptionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: { parts: [{ text: descriptionPrompt }, markedEnvironmentImagePart] }
    });
    semanticLocationDescription = descriptionResponse.text;
    console.log('Generated description:', semanticLocationDescription);
  } catch (error) {
    console.error('Failed to generate semantic location description:', error);
    // Fallback to a generic statement if the description generation fails
    semanticLocationDescription = `at the specified location.`;
  }

  // STEP 4: Generate composite image using the CLEAN image and the description
  console.log('Preparing to generate composite image...');
  
  const objectImagePart = await fileToPart(resizedObjectImage);
  const cleanEnvironmentImagePart = await fileToPart(resizedEnvironmentImage); // IMPORTANT: Use clean image
  
  const prompt = `
**Role:**
You are a visual composition expert. Your task is to take a 'product' image and seamlessly integrate it into a 'scene' image, adjusting for perspective, lighting, and scale.

**Specifications:**
-   **Product to add:**
    The first image provided. It may be surrounded by black padding or background, which you should ignore and treat as transparent and only keep the product.
-   **Scene to use:**
    The second image provided. It may also be surrounded by black padding, which you should ignore.
-   **Placement Instruction (Crucial):**
    -   You must place the product at the location described below exactly. You should only place the product once. Use this dense, semantic description to find the exact spot in the scene.
    -   **Product location Description:** "${semanticLocationDescription}"
-   **Final Image Requirements:**
    -   The output image's style, lighting, shadows, reflections, and camera perspective must exactly match the original scene.
    -   Do not just copy and paste the product. You must intelligently re-render it to fit the context. Adjust the product's perspective and orientation to its most natural position, scale it appropriately, and ensure it casts realistic shadows according to the scene's light sources.
    -   The product must have proportional realism. For example, a lamp product can't be bigger than a sofa in scene.
    -   You must not return the original scene image without product placement. The product must be always present in the composite image.

The output should ONLY be the final, composed image. Do not add any text or explanation.
`;

  const textPart = { text: prompt };
  
  console.log('Sending images and augmented prompt...');
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [objectImagePart, cleanEnvironmentImagePart, textPart] }, // IMPORTANT: Use clean image
  });

  console.log('Received response.');
  
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    console.log(`Received image data (${mimeType}), length:`, data.length);
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated image to original aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    return { finalImageUrl, debugImageUrl, finalPrompt: prompt };
  }

  console.error("Model response did not contain an image part.", response);
  throw new Error("The AI model did not return an image. Please try again.");
};

export const suggestMatchingItems = async (
    placedItemNames: string[],
    libraryItems: { id: number; name: string; category: string }[]
): Promise<number[]> => {
    const ai = getGeminiClient();
    if (!ai) {
        // Fallback heuristic if no key
        return libraryItems.slice(0, 3).map(i => i.id);
    }
    
    const prompt = `
    You are an expert interior designer. The user has placed the following items in their room:
    ${placedItemNames.join(", ")}
    
    Here is the available product library:
    ${JSON.stringify(libraryItems)}
    
    Select 2 to 3 complementary items from the library that are NOT already placed. Return ONLY a JSON array of their integer IDs, for example: [3, 5].
    `;

    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
             config: {
                 responseMimeType: "application/json"
             }
        });
        
        if (response.text) {
             const ids = JSON.parse(response.text);
             if (Array.isArray(ids)) return ids;
        }
    } catch (err) {
        console.error("Failed to suggest items", err);
    }
    
    // Fallback if AI fails
    const unplaced = libraryItems.filter(i => !placedItemNames.includes(i.name));
    return unplaced.slice(0, 3).map(i => i.id);
};

export const generateMoodboard = async (
    products: { name: string, url: string }[],
    promptText: string
): Promise<{ finalImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting moodboard generation process...');
  
  // Create parts from product URLs
  const objectParts = await Promise.all(products.map(async (p) => {
      const response = await fetch(p.url);
      const blob = await response.blob();
      const file = new File([blob], `${p.name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`, { type: blob.type || 'image/jpeg' });
      return fileToPart(file);
  }));

  let promptObjectsDescription = products.map((p, i) => 
    `- **Item ${i + 1}**: ${p.name}`
  ).join('\n');
  
  const prompt = `
**Role:**
You are an expert interior designer creating an aesthetic, professional mood board collage.

**Theme/Instructions:**
"${promptText}"

**Items to Include:**
${promptObjectsDescription}

**Instructions:**
1.  **Layout:** Arrange these items in an overlapping, well-organized interior design moodboard layout on a clean, solid, neutral-colored aesthetic background.
2.  **Color Palette:** Synthesize the colors of the provided items and the theme, and optionally include 3-5 small, elegant color palette squares or circles in a corner.
3.  **Composition:** Ensure the items are scaled relatively and are easy to see. The layout should feel like a magazine spread or a professional Pinterest mood board.
4.  **Output Requirements:** DO NOT output any text. Produce exactly ONE single photorealistic or high-quality mood board image.
`;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Using local moodboard preview.');
    const firstProduct = products[0];
    if (firstProduct) {
      const response = await fetch(firstProduct.url);
      const blob = await response.blob();
      const file = new File([blob], `${firstProduct.name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`, { type: blob.type || 'image/jpeg' });
      const finalImageUrl = await createLocalStagedPreview(file, prompt, 'mood');
      return { finalImageUrl, finalPrompt: `${prompt}\n\nLocal preview used because GEMINI_API_KEY is not configured.` };
    }
  }

  const textPart = { text: prompt };
  const parts: any[] = [...objectParts, textPart];
  
  console.log('Sending moodboard generation prompt...');
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
  });

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const finalImageUrl = `data:${mimeType};base64,${data}`;
    return { finalImageUrl, finalPrompt: prompt };
  }

  throw new Error("The AI model did not return an image. Please try again.");
};

export const editProductBackground = async (
    productImage: File,
    backgroundTexturePrompt: string
): Promise<{ finalImageUrl: string; finalPrompt: string; }> => {
  console.log('Starting product background edit process...');
  
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(productImage);
  const MAX_DIMENSION = 1024;
  
  console.log('Resizing product image for editing...');
  const resizedProductImage = await resizeImage(productImage, MAX_DIMENSION);
  const productImagePart = await fileToPart(resizedProductImage);

  const prompt = `
**Role:**
You are an expert product image editor. Your task is to change the background of a placed product to match a new wall or floor texture using a masked image edit.

**Instructions:**
- Identify the main product in the image.
- Mask out the current background and replace it completely with the following new background texture/scene: "${backgroundTexturePrompt}".
- Ensure the product itself remains unharmed and unchanged.
- Generate realistic shadows or reflections on the new background based on the product.
- Do not output any text, only the final composed image.
`;

  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Returning local product preview.');
    const finalImageUrl = await fileToDataUrl(productImage);
    return { finalImageUrl, finalPrompt: `${prompt}\n\nLocal preview used because GEMINI_API_KEY is not configured.` };
  }

  const textPart = { text: prompt };
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [productImagePart, textPart] },
  });

  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    const generatedSquareImageUrl = `data:${mimeType};base64,${data}`;
    
    console.log('Cropping generated edited image to original aspect ratio...');
    const finalImageUrl = await cropToOriginalAspectRatio(
        generatedSquareImageUrl,
        originalWidth,
        originalHeight,
        MAX_DIMENSION
    );
    
    return { finalImageUrl, finalPrompt: prompt };
  }

  throw new Error("The AI model did not return an image. Please try again.");
};
