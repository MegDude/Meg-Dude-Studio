/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type PlacedObject = {
  image: File;
  description: string;
  relativePosition: { xPercent: number; yPercent: number };
  scale?: number;
  rotation?: number;
};

type OpenAIInputPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string };

const OPENAI_RESPONSES_URL = '/api/openai-responses';
const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-5.5';
const MAX_DIMENSION = 768;
const TEXT_TOKEN_LIMIT = 220;
const IMAGE_TOKEN_LIMIT = 1200;
const AGENT_CONFIG_ERROR_CODE = 'OPENAI_API_KEY_MISSING';

type OpenAIRequestOptions = {
  maxOutputTokens?: number;
};

const getOpenAIImageModel = (): string => {
  return (
    process.env.OPENAI_IMAGE_MODEL ||
    process.env.VITE_OPENAI_IMAGE_MODEL ||
    DEFAULT_OPENAI_IMAGE_MODEL
  ).trim();
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        reject(new Error('Failed to read image file.'));
        return;
      }

      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Image could not be loaded.'));
    };
    reader.onerror = error => reject(error);
  });
};

const resizeImage = (file: File, targetDimension: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
        reject(new Error('Failed to read image file.'));
        return;
      }

      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetDimension;
        canvas.height = targetDimension;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create image canvas.'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetDimension, targetDimension);

        const aspectRatio = img.width / img.height;
        const drawWidth = aspectRatio > 1 ? targetDimension : targetDimension * aspectRatio;
        const drawHeight = aspectRatio > 1 ? targetDimension / aspectRatio : targetDimension;
        const x = (targetDimension - drawWidth) / 2;
        const y = (targetDimension - drawHeight) / 2;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Image resize failed.'));
            return;
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.94);
      };
      img.onerror = () => reject(new Error('Image could not be loaded.'));
    };
    reader.onerror = error => reject(error);
  });
};

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
      const aspectRatio = originalWidth / originalHeight;
      const contentWidth = aspectRatio > 1 ? targetDimension : targetDimension * aspectRatio;
      const contentHeight = aspectRatio > 1 ? targetDimension / aspectRatio : targetDimension;
      const x = (targetDimension - contentWidth) / 2;
      const y = (targetDimension - contentHeight) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = contentWidth;
      canvas.height = contentHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not crop generated image.'));
        return;
      }

      ctx.drawImage(img, x, y, contentWidth, contentHeight, 0, 0, contentWidth, contentHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Generated image could not be loaded for cropping.'));
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

const extractOutputText = (payload: any): string => {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const chunks: string[] = [];
  for (const output of payload?.output || []) {
    for (const part of output?.content || []) {
      if (typeof part?.text === 'string') chunks.push(part.text);
      if (typeof part?.content === 'string') chunks.push(part.content);
    }
  }
  return chunks.join('\n').trim();
};

const extractGeneratedImage = (payload: any): string | null => {
  for (const output of payload?.output || []) {
    if (output?.type === 'image_generation_call' && typeof output?.result === 'string') {
      return `data:image/png;base64,${output.result}`;
    }

    for (const part of output?.content || []) {
      if (typeof part?.image_url === 'string') return part.image_url;
      if (typeof part?.b64_json === 'string') return `data:image/png;base64,${part.b64_json}`;
      if (typeof part?.result === 'string' && part?.type?.includes?.('image')) {
        return `data:image/png;base64,${part.result}`;
      }
    }
  }

  return null;
};

const callOpenAIResponses = async (
  content: OpenAIInputPart[],
  useImageTool: boolean,
  options: OpenAIRequestOptions = {}
): Promise<any> => {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOpenAIImageModel(),
      input: [{ role: 'user', content }],
      store: false,
      reasoning: { effort: 'minimal' },
      text: { verbosity: 'low' },
      max_output_tokens: useImageTool
        ? IMAGE_TOKEN_LIMIT
        : Math.min(options.maxOutputTokens ?? TEXT_TOKEN_LIMIT, TEXT_TOKEN_LIMIT),
      ...(useImageTool ? { tools: [{ type: 'image_generation' }] } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    let message = details;
    let code = '';
    try {
      const parsed = JSON.parse(details);
      message = parsed.error || details;
      code = parsed.code || '';
    } catch {
      // Keep the raw response text.
    }
    const error = new Error(
      code === AGENT_CONFIG_ERROR_CODE
        ? 'OpenAI agent is not configured. Add OPENAI_API_KEY in Vercel, then redeploy.'
        : `OpenAI request failed (${response.status}). ${message}`
    );
    if (code) error.name = code;
    throw error;
  }

  return response.json();
};

const requestOpenAIImage = async (prompt: string, files: File[]): Promise<string> => {
  const content: OpenAIInputPart[] = [{ type: 'input_text', text: prompt }];

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    content.push({ type: 'input_image', image_url: dataUrl });
  }

  const payload = await callOpenAIResponses(content, true);
  const imageUrl = extractGeneratedImage(payload);

  if (!imageUrl) {
    const fallbackText = extractOutputText(payload);
    throw new Error(fallbackText || 'OpenAI did not return a generated image.');
  }

  return imageUrl;
};

const requestOpenAIText = async (prompt: string, maxOutputTokens = TEXT_TOKEN_LIMIT): Promise<string> => {
  const payload = await callOpenAIResponses(
    [{ type: 'input_text', text: prompt }],
    false,
    { maxOutputTokens }
  );
  return extractOutputText(payload);
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
    // Keep the source image intact for local fallback removal previews. A fake
    // patch is worse than no local edit because it implies a bad inpaint.
  } else if (mode === 'stage') {
    ctx.globalCompositeOperation = 'source-over';
    const floorY = canvas.height * 0.72;
    const rugW = canvas.width * 0.48;
    const rugH = canvas.height * 0.14;
    const rugX = (canvas.width - rugW) / 2;

    ctx.fillStyle = 'rgba(232, 226, 214, 0.58)';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, floorY, rugW / 2, rugH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(234, 229, 219, 0.78)';
    ctx.fillRect(canvas.width * 0.30, floorY - canvas.height * 0.18, canvas.width * 0.40, canvas.height * 0.12);
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
  placedObjects: { image: File; relativePosition: { xPercent: number; yPercent: number }; scale?: number; rotation?: number }[],
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
    const drawWidth = canvas.width * 0.24 * scale;
    const ratio = objectImg.naturalWidth / objectImg.naturalHeight || 1;
    const drawHeight = drawWidth / ratio;
    const x = (obj.relativePosition.xPercent / 100) * canvas.width;
    const y = (obj.relativePosition.yPercent / 100) * canvas.height;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((obj.rotation ?? 0) * Math.PI) / 180);
    ctx.fillStyle = 'rgba(7, 18, 35, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, drawHeight * 0.42, drawWidth * 0.42, drawHeight * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(objectImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

const withOpenAIImageFallback = async (
  prompt: string,
  files: File[],
  fallback: () => Promise<string>,
  fallbackReason: string,
): Promise<{ finalImageUrl: string; finalPrompt: string }> => {
  try {
    return {
      finalImageUrl: await requestOpenAIImage(prompt, files),
      finalPrompt: prompt,
    };
  } catch (error) {
    if (error instanceof Error && error.name === AGENT_CONFIG_ERROR_CODE) {
      throw error;
    }
    console.error('OpenAI generation failed:', error);
    return {
      finalImageUrl: await fallback(),
      finalPrompt: `${prompt}\n\nLocal preview used because ${fallbackReason}.`,
    };
  }
};

export const stageRoomImage = async (
  environmentImage: File,
  stagingPrompt: string
): Promise<{ finalImageUrl: string; finalPrompt: string }> => {
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  const prompt = `
You are a world-class architectural visualization director, interior designer, and virtual staging image editor.

Use the provided room image as the source scene and stage it according to this instruction:
"${stagingPrompt}"

Requirements:
- Retain the original room architecture, walls, floors, windows, and camera angle.
- Add photorealistic furniture, rugs, plants, art, and decor that fit the requested style with restrained editorial taste.
- Match perspective, scale, lighting, color temperature, reflections, and contact shadows with architectural visualization quality.
- Keep every object physically plausible in size. Do not create oversized furniture, invisible cropped objects, stretched assets, warped rooms, or impossible perspective.
- Finish like a leading global design studio: natural materials, quiet luxury, balanced negative space, believable exposure, no gimmicks.
- For removal or cleanup requests, inpaint the removed area with matching surrounding texture, grain, material, lighting, and shadows.
- Never leave ghosting, leftover shadows, light patches, blurred rectangles, halos, outlines, duplicate texture, or visible edit marks where an item was removed.
- Return only the final staged room image. Do not add labels, text, borders, markers, or UI elements.
`;

  const result = await withOpenAIImageFallback(
    prompt,
    [resizedEnvironmentImage],
    () => createLocalStagedPreview(environmentImage, prompt),
    'the OpenAI image request failed'
  );

  try {
    result.finalImageUrl = await cropToOriginalAspectRatio(result.finalImageUrl, originalWidth, originalHeight, MAX_DIMENSION);
  } catch {
    // OpenAI may already return the requested aspect ratio; keep the image if cropping is not applicable.
  }

  return result;
};

export const generateMultiCompositeImage = async (
  placedObjects: PlacedObject[],
  environmentImage: File,
  environmentDescription: string
): Promise<{ finalImageUrl: string; debugImageUrl: string | null; finalPrompt: string }> => {
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(environmentImage);
  const resizedEnvironmentImage = await resizeImage(environmentImage, MAX_DIMENSION);

  const promptObjectsDescription = placedObjects.map((obj, index) => {
    const scale = obj.scale && obj.scale !== 1 ? ` Scale target: ${obj.scale}x.` : '';
    const rotation = obj.rotation ? ` Rotate roughly ${obj.rotation} degrees if visually appropriate.` : '';
    return `- Product ${index + 1}: "${obj.description}". Place near X ${Math.round(obj.relativePosition.xPercent)}%, Y ${Math.round(obj.relativePosition.yPercent)}% of the room image.${scale}${rotation}`;
  }).join('\n');

  const prompt = `
You are a world-class architectural visualization compositor and interior design director. Seamlessly composite the supplied product images into the supplied room scene.

Scene description:
"${environmentDescription}"

Products and placement:
${promptObjectsDescription}

Rules:
- The first reference image is the room. All following images are products to add.
- Place every product once near its requested coordinate.
- Respect the room perspective, floor plane, wall plane, scale, depth, and camera angle.
- Match shadows, reflections, color temperature, exposure, and contrast so the result looks like one untouched photograph.
- Keep products visible, properly sized, and fully integrated. Do not enlarge items until they crop out of frame, dominate the architecture, or become unrecognizable.
- Preserve architectural clarity, refined composition, believable material response, and global design-studio polish.
- Never add labels, text, markers, outlines, bounding boxes, or UI overlays.
- Return only the final generated room image.
`;

  const result = await withOpenAIImageFallback(
    prompt,
    [resizedEnvironmentImage, ...placedObjects.map(obj => obj.image)],
    () => createLocalCompositePreview(placedObjects, environmentImage),
    'the OpenAI composite request failed'
  );

  try {
    result.finalImageUrl = await cropToOriginalAspectRatio(result.finalImageUrl, originalWidth, originalHeight, MAX_DIMENSION);
  } catch {
    // Keep the returned image if it is not the padded square format.
  }

  return { ...result, debugImageUrl: null };
};

export const generateCompositeImage = async (
  objectImage: File,
  objectDescription: string,
  environmentImage: File,
  environmentDescription: string,
  dropPosition: { xPercent: number; yPercent: number }
): Promise<{ finalImageUrl: string; debugImageUrl: string; finalPrompt: string }> => {
  const debugImageUrl = await fileToDataUrl(environmentImage);
  const result = await generateMultiCompositeImage(
    [{ image: objectImage, description: objectDescription, relativePosition: dropPosition }],
    environmentImage,
    environmentDescription
  );

  return {
    finalImageUrl: result.finalImageUrl,
    debugImageUrl,
    finalPrompt: result.finalPrompt,
  };
};

export const suggestMatchingItems = async (
  placedItemNames: string[],
  libraryItems: { id: number; name: string; category: string }[]
): Promise<number[]> => {
  const unplaced = libraryItems.filter(item => !placedItemNames.includes(item.name));

  const prompt = `
You are an expert interior designer. The user has placed:
${placedItemNames.join(', ') || 'No products yet.'}

Available product library:
${JSON.stringify(unplaced)}

Return only a JSON array containing 2 or 3 complementary product integer IDs. Example: [3, 5]
`;

  try {
    const text = await requestOpenAIText(prompt, 80);
    const ids = JSON.parse(text);
    if (Array.isArray(ids)) {
      const validIds = new Set(unplaced.map(item => item.id));
      return ids.filter(id => validIds.has(id)).slice(0, 3);
    }
  } catch (error) {
    console.error('OpenAI product suggestions failed:', error);
  }

  return unplaced.slice(0, 3).map(item => item.id);
};

export const generateMoodboard = async (
  products: { name: string; url: string }[],
  promptText: string
): Promise<{ finalImageUrl: string; finalPrompt: string }> => {
  const productFiles = await Promise.all(products.map(async (product) => {
    const response = await fetch(product.url);
    const blob = await response.blob();
    return new File([blob], `${product.name.replace(/[^a-z0-9]/gi, '') || 'product'}.jpg`, {
      type: blob.type || 'image/jpeg',
    });
  }));

  const productList = products.map((product, index) => `- Item ${index + 1}: ${product.name}`).join('\n');
  const prompt = `
You are an editorial interior designer creating a refined moodboard collage.

Theme:
"${promptText}"

Products to include:
${productList || '- Use the supplied reference styling.'}

Requirements:
- Create one polished interior design moodboard.
- Use a clean neutral background, balanced spacing, and a sophisticated magazine composition.
- Include the supplied product images as visual references.
- Optionally include small color swatches, but do not add readable text labels.
- Return only the generated moodboard image.
`;

  return withOpenAIImageFallback(
    prompt,
    productFiles,
    async () => {
      if (productFiles[0]) return createLocalStagedPreview(productFiles[0], prompt, 'mood');
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create moodboard preview.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b1f33';
      ctx.fillRect(160, 140, 880, 560);
      ctx.fillStyle = '#c8a96a';
      ctx.fillRect(220, 200, 760, 440);
      return canvas.toDataURL('image/jpeg', 0.9);
    },
    'the OpenAI moodboard request failed'
  );
};

export const editProductBackground = async (
  productImage: File,
  backgroundTexturePrompt: string
): Promise<{ finalImageUrl: string; finalPrompt: string }> => {
  const { width: originalWidth, height: originalHeight } = await getImageDimensions(productImage);
  const resizedProductImage = await resizeImage(productImage, MAX_DIMENSION);

  const prompt = `
You are an expert product image editor.

Use the supplied product image and replace only the background with:
"${backgroundTexturePrompt}"

Requirements:
- Keep the main product intact and recognizable.
- Replace the background with a realistic wall, floor, or texture scene matching the prompt.
- Add natural shadows or reflections where appropriate.
- Return only the final product image. Do not add text, labels, borders, or UI overlays.
`;

  const result = await withOpenAIImageFallback(
    prompt,
    [resizedProductImage],
    () => fileToDataUrl(productImage),
    'the OpenAI product edit request failed'
  );

  try {
    result.finalImageUrl = await cropToOriginalAspectRatio(result.finalImageUrl, originalWidth, originalHeight, MAX_DIMENSION);
  } catch {
    // Preserve the OpenAI result when it already fits the source ratio.
  }

  return result;
};
