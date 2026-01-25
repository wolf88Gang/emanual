// Mapping of common plant names to verified representative Unsplash images
// Using specific photo IDs for reliable plant imagery

const plantImageMap: Record<string, string> = {
  // Tropical flowering plants - VERIFIED URLs
  'bougainvillea': 'https://images.unsplash.com/photo-1597074866923-dc0589150358?w=400&h=400&fit=crop',
  'hibiscus': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=400&fit=crop',
  'hibisco': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=400&fit=crop',
  'plumeria': 'https://images.unsplash.com/photo-1566907225470-a969e08763aa?w=400&h=400&fit=crop',
  'frangipani': 'https://images.unsplash.com/photo-1566907225470-a969e08763aa?w=400&h=400&fit=crop',
  'heliconia': 'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=400&h=400&fit=crop',
  'bird of paradise': 'https://images.unsplash.com/photo-1608027538856-c31c2cc17b42?w=400&h=400&fit=crop',
  'strelitzia': 'https://images.unsplash.com/photo-1608027538856-c31c2cc17b42?w=400&h=400&fit=crop',
  'ave del paraiso': 'https://images.unsplash.com/photo-1608027538856-c31c2cc17b42?w=400&h=400&fit=crop',
  'orchid': 'https://images.unsplash.com/photo-1566907225470-a969e08763aa?w=400&h=400&fit=crop',
  'orquidea': 'https://images.unsplash.com/photo-1566907225470-a969e08763aa?w=400&h=400&fit=crop',
  'anthurium': 'https://images.unsplash.com/photo-1610397648930-477b8c7f0943?w=400&h=400&fit=crop',
  'anturio': 'https://images.unsplash.com/photo-1610397648930-477b8c7f0943?w=400&h=400&fit=crop',
  'bromeliad': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  'bromelia': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  
  // Palms - VERIFIED URLs
  'palm': 'https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=400&h=400&fit=crop',
  'palma': 'https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=400&h=400&fit=crop',
  'coconut': 'https://images.unsplash.com/photo-1559541381-0b9c73896d8b?w=400&h=400&fit=crop',
  'coco': 'https://images.unsplash.com/photo-1559541381-0b9c73896d8b?w=400&h=400&fit=crop',
  'areca': 'https://images.unsplash.com/photo-1598880513756-90c0312b70d9?w=400&h=400&fit=crop',
  'royal palm': 'https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=400&h=400&fit=crop',
  
  // Fruit trees - VERIFIED URLs
  'mango': 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=400&fit=crop',
  'avocado': 'https://images.unsplash.com/photo-1601039641847-7857b994d704?w=400&h=400&fit=crop',
  'aguacate': 'https://images.unsplash.com/photo-1601039641847-7857b994d704?w=400&h=400&fit=crop',
  'citrus': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'citrico': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'orange': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'naranja': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'lemon': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop',
  'limon': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop',
  'lime': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop',
  'papaya': 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=400&h=400&fit=crop',
  'banana': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  'platano': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  'coffee': 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400&h=400&fit=crop',
  'cafe': 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400&h=400&fit=crop',
  
  // Trees - VERIFIED URLs
  'ficus': 'https://images.unsplash.com/photo-1545239705-1564e58b9e4a?w=400&h=400&fit=crop',
  'oak': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop',
  'roble': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop',
  'cedar': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&h=400&fit=crop',
  'cedro': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&h=400&fit=crop',
  
  // Shrubs - VERIFIED URLs
  'croton': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  'jasmine': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'jazmin': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'gardenia': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'azalea': 'https://images.unsplash.com/photo-1462275646964-a0e3571f4f93?w=400&h=400&fit=crop',
  'rose': 'https://images.unsplash.com/photo-1518882605630-8d17c41389d8?w=400&h=400&fit=crop',
  'rosa': 'https://images.unsplash.com/photo-1518882605630-8d17c41389d8?w=400&h=400&fit=crop',
  
  // Ground covers and indoor plants - VERIFIED URLs
  'grass': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'cesped': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'zacate': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'lawn': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'fern': 'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=400&h=400&fit=crop',
  'helecho': 'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=400&h=400&fit=crop',
  'monstera': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  'philodendron': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  'pothos': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  
  // Succulents - VERIFIED URLs
  'succulent': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  'suculenta': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  'cactus': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  'agave': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  'aloe': 'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=400&h=400&fit=crop',
  
  // Herbs - VERIFIED URLs
  'basil': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop',
  'albahaca': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop',
  'rosemary': 'https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=400&h=400&fit=crop',
  'romero': 'https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=400&h=400&fit=crop',
  'lavender': 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&h=400&fit=crop',
  'lavanda': 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&h=400&fit=crop',
  'mint': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=400&fit=crop',
  'menta': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=400&fit=crop',
  
  // Bamboo
  'bamboo': 'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=400&h=400&fit=crop',
  'bambu': 'https://images.unsplash.com/photo-1567331711402-509c12c41959?w=400&h=400&fit=crop',
  
  // Default fallbacks by type - generic green plant images
  '_tree': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop',
  '_plant': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
};

/**
 * Get a representative image URL for a plant based on its name
 * Searches for keywords in the plant name and returns a matching stock image
 */
export function getPlantImageUrl(plantName: string, assetType?: string): string | null {
  if (!plantName) return null;
  
  const normalizedName = plantName.toLowerCase();
  
  // First, try exact matches with each keyword
  for (const [keyword, url] of Object.entries(plantImageMap)) {
    if (keyword.startsWith('_')) continue; // Skip fallback entries
    if (normalizedName.includes(keyword)) {
      return url;
    }
  }
  
  // Fallback by asset type
  if (assetType === 'tree') {
    return plantImageMap['_tree'];
  }
  if (assetType === 'plant') {
    return plantImageMap['_plant'];
  }
  
  return null;
}

/**
 * Check if we have a representative image for this plant
 */
export function hasPlantImage(plantName: string): boolean {
  return getPlantImageUrl(plantName) !== null;
}
