import { PRODUCT_LIBRARY, ProductLibraryItem } from '../data/productLibrary';

export const suggestMatchingItems = async (
  currentObjects: any[],
  currentRoomType: string = "living-room",
  currentDesignStyle: string = "quiet-luxury"
): Promise<ProductLibraryItem[]> => {
  // Step 1: Analyze current objects to generate a style profile
  // In a real AI system, we'd pass images to a vision model, but here we can heuristically
  // determine based on the metadata of placed objects if available, 
  // or default to the provided parameters.
  
  const placedIds = currentObjects.map(obj => obj.id || obj.name); // Using name as fallback since old schema didn't match perfectly
  
  const profile = {
    style: currentDesignStyle,
    roomType: currentRoomType,
    preferredMaterials: ["travertine", "walnut", "marble", "bouclé"],
    palette: "warm-neutral"
  };

  // Step 2 & 3: Filter and score library items
  const scoredItems = PRODUCT_LIBRARY.map(item => {
    let score = item.premiumScore + (item.legendsFitScore * 1.5); // Weight style fit heavily
    
    // Style Match
    if (item.styleTags.includes(profile.style)) score += 20;
    
    // Room Match
    if (item.roomTypes.includes(profile.roomType)) score += 15;
    
    // Material Match
    const hasPreferredMaterial = item.materials.some(m => 
      profile.preferredMaterials.some(pm => m.toLowerCase().includes(pm.toLowerCase()))
    );
    if (hasPreferredMaterial) score += 25;
    
    // Variety: penalize if we already have something in the same exact subcategory
    const hasSameSubCategory = currentObjects.some(obj => {
       const matchedProduct = PRODUCT_LIBRARY.find(p => p.id === obj.id || p.name === obj.name);
       return matchedProduct?.subCategory === item.subCategory;
    });
    if (hasSameSubCategory) score -= 50;

    return { item, score };
  });

    // Filter out items already placed
  const availableItems = scoredItems.filter(
    ({ item }) => !placedIds.includes(item.id) && !placedIds.includes(item.name)
  );

  // Group by brand
  const byBrand = new Map<string, typeof availableItems>();
  for (const item of availableItems) {
    if (!byBrand.has(item.item.brand)) byBrand.set(item.item.brand, []);
    byBrand.get(item.item.brand)!.push(item);
  }

  // Sort brands by their top item score
  const sortedBrands = Array.from(byBrand.keys()).sort((a, b) => {
    return byBrand.get(b)![0].score - byBrand.get(a)![0].score;
  });

  // Calculate distribution based on 40/25/15/10/10 luxury brand distribution
  const targetCount = 6;
  const result: ProductLibraryItem[] = [];
  const slotsCount = [2, 2, 1, 1, 0];

  for (let i = 0; i < sortedBrands.length; i++) {
    const brand = sortedBrands[i];
    const items = byBrand.get(brand)!;
    const slots = i < slotsCount.length ? slotsCount[i] : 0;
    
    // Sort items within brand by score
    items.sort((a, b) => b.score - a.score);

    for (let j = 0; j < slots && j < items.length; j++) {
      result.push(items[j].item);
    }
  }

  // If we didn't fill all 6 slots, fill with remaining highest scored items
  if (result.length < targetCount) {
     const remaining = availableItems.filter(x => !result.includes(x.item)).map(x => x.item);
     remaining.sort((a, b) => {
         const scoreA = scoredItems.find(s => s.item.id === a.id)!.score;
         const scoreB = scoredItems.find(s => s.item.id === b.id)!.score;
         return scoreB - scoreA;
     });
     result.push(...remaining.slice(0, targetCount - result.length));
  }
  
  return result;
};
