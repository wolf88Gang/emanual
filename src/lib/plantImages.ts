// Mapping of common plant names to representative Unsplash images
// These are free stock photos to help identify plant varieties

const plantImageMap: Record<string, string> = {
  // Tropical flowering plants
  'bougainvillea': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  'hibiscus': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=400&fit=crop',
  'plumeria': 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&h=400&fit=crop',
  'frangipani': 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&h=400&fit=crop',
  'ixora': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=400&fit=crop',
  'heliconia': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&h=400&fit=crop',
  'bird of paradise': 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=400&h=400&fit=crop',
  'strelitzia': 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=400&h=400&fit=crop',
  'ginger': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop',
  'orchid': 'https://images.unsplash.com/photo-1566907225470-a969e08763aa?w=400&h=400&fit=crop',
  'anthurium': 'https://images.unsplash.com/photo-1610397648930-477b8c7f0943?w=400&h=400&fit=crop',
  'bromeliad': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop',
  
  // Palms
  'palm': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop',
  'coconut': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop',
  'areca': 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&h=400&fit=crop',
  'royal palm': 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&h=400&fit=crop',
  'traveler': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&h=400&fit=crop',
  
  // Trees
  'mango': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop',
  'avocado': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=400&fit=crop',
  'citrus': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'orange': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&h=400&fit=crop',
  'lemon': 'https://images.unsplash.com/photo-1582087463261-ddea03f80e5d?w=400&h=400&fit=crop',
  'lime': 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=400&h=400&fit=crop',
  'guava': 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400&h=400&fit=crop',
  'papaya': 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400&h=400&fit=crop',
  'banana': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  'cacao': 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=400&fit=crop',
  'coffee': 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=400&fit=crop',
  'ficus': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
  'cedar': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&h=400&fit=crop',
  'oak': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop',
  
  // Shrubs and hedges
  'croton': 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=400&h=400&fit=crop',
  'oleander': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'jasmine': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'gardenia': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop',
  'boxwood': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  'privet': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  'azalea': 'https://images.unsplash.com/photo-1462275646964-a0e3571f4f93?w=400&h=400&fit=crop',
  'rhododendron': 'https://images.unsplash.com/photo-1462275646964-a0e3571f4f93?w=400&h=400&fit=crop',
  'camellia': 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=400&h=400&fit=crop',
  
  // Ground covers and grasses
  'grass': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'lawn': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'zoysia': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'bermuda': 'https://images.unsplash.com/photo-1558731838-4ec0c10a6d3f?w=400&h=400&fit=crop',
  'fern': 'https://images.unsplash.com/photo-1516893842880-5d8aada7ac05?w=400&h=400&fit=crop',
  'monstera': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  'philodendron': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  'pothos': 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=400&fit=crop',
  
  // Succulents and cacti
  'succulent': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  'cactus': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  'agave': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  'aloe': 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=400&fit=crop',
  
  // Vines and climbers
  'vine': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  'passion fruit': 'https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=400&h=400&fit=crop',
  'passiflora': 'https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=400&h=400&fit=crop',
  'wisteria': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=400&h=400&fit=crop',
  'clematis': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=400&h=400&fit=crop',
  
  // Herbs
  'basil': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop',
  'rosemary': 'https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=400&h=400&fit=crop',
  'lavender': 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400&h=400&fit=crop',
  'mint': 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400&h=400&fit=crop',
  'oregano': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop',
  'thyme': 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop',
  
  // Bamboo
  'bamboo': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  
  // Default fallbacks by type
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
  
  // First, try exact matches
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
