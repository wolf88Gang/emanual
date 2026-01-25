import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlantCareRequest {
  plantName: string;
  scientificName?: string;
  category?: string;
  climate?: string;
  language?: string;
  elevationZone?: string; // coastal, transitional, highland
  propertyType?: string; // residential, commercial, agricultural
}

// Costa Rica specific knowledge base for the AI
const COSTA_RICA_KNOWLEDGE = `
## ALTITUDINAL ZONES OF COSTA RICA

### Lowland Coastal (0-300m)
- Regions: Guanacaste, North Pacific, South Pacific (Osa/Costa Ballena)
- Key stressors: Salt spray, UV intensity, seasonal drought
- Climate: Tropical Dry Forest or Lowland Rainforest
- Dry season: December-April requires strategic irrigation
- Special considerations: Salt-tolerant species essential within 500m of coastline

### Transitional/Middle (300-1,500m)  
- Regions: Central Valley, Premontane areas
- Key stressors: Moderate wind, variable humidity, high rainfall
- Climate: Premontane Moist Forest
- Optimal for: Coffee, many ornamentals
- Special considerations: Excellent drainage required

### Highland/Montane (1,500-3,500m+)
- Regions: Monteverde, Talamanca, Cartago highlands
- Key stressors: Cold stress, low light, perpetual saturation
- Climate: Cloud Forest, Sub-Páramo
- "Mountain lovers": Roses, Gardenias thrive here
- Special considerations: Fungal pathogen monitoring critical

## SPECIES-SPECIFIC PROTOCOLS (COSTA RICA)

### Guanacaste Tree (Enterolobium cyclocarpum)
- National tree of Costa Rica
- Purpose: Iconic shade, nitrogen fixation (improves soil fertility)
- Nutrition: Balanced 10-10-10 fertilizer biannually; quarterly during active growth (Spring)
- Water: Every 1-2 weeks; reduce in dormant season
- Issues: Root overcrowding in residential; leaf browning below 5°C
- Crew tasks: Inspect dead/crossing branches (Early Spring), mulch 2-4" deep NOT touching trunk, deep water post-fertilization

### Coffee (Coffea arabica)
- Optimal: 0-2,000m elevation
- Diseases: Rust (Roya) and Black Spot - treat with lime (cal) and specialized fungicides
- Pruning: Mandatory to prevent growth over 15 feet
- Crew tasks: Monthly rust/spot inspection, quarterly height pruning

### Roses (Rosa spp.)
- Highland plants (900m+) - "Mountain lovers"
- Environment: Dislike humidity and "wet feet"
- Diseases: White mold (hongos), black spots (manchas negras)
- Nutrition: Heavy feeders - 1 tablespoon fertilizer every 2 weeks
- Special: Cool highland air required but wind protection essential

### Heliconias (H. psittacorum, H. rostrata) - "Lobster Claws"
- Purpose: Aesthetic impact, hummingbird attraction
- Nutrition: Magnesium-rich slow-release fertilizer every 3-4 months
- Water: Constant moisture; may need twice daily in dry heat
- Issues: Spider mites if soil dries out
- Crew tasks: Remove spent inflorescences/wilted leaves, daily moisture check in dry season

### Bougainvillea (Veranera)
- Purpose: Climbing color; salt-tolerant for coastal
- Nutrition: High-phosphorus "bloom booster" every 2-3 weeks; monthly Epsom salt
- Pruning: AGGRESSIVE immediately after bloom cycle - critical for new wood
- Light: Full sun minimum 8 hours
- Warning: Acts as "weed" in growth velocity - requires control

### Limoncillo Hedges (Swinglea glutinosa)
- Purpose: Fast-growing privacy wall; sustainable
- Water: Once established, NO supplemental irrigation in tropical climates
- Maintenance: Extremely low - just shape pruning for density
- Used extensively in: Las Catalinas and modern developments

### Pochote (Pachira quinata / Ceiba acuminata)
- Purpose: Security (spiny trunk deters intruders), shade
- Requirements: Full sun, well-drained soil, drought-tolerant
- Pruning: Late winter/early spring during dormancy
- Crew tasks: Thin dense canopy areas for air circulation

### Palms (Various species)
- Issues: Manganese or Boron deficiency can be fatal if mistaken for fungal disease
- Signs: Yellowing fronds
- Nutrition: Potassium/Magnesium specialized mix
- Coastal: Check tie-downs on young palms during high wind warnings

## SALT MITIGATION PROTOCOLS (Coastal Properties)

Severe coastal zone: Within 500m of high-tide line
- Plants: Salt-tolerant species required; bi-weekly freshwater rinsing
- Metal: Grade 316 Stainless Steel required; monthly detergent cleaning
- Hardscape: Non-acidic sealants; re-apply every 1-3 years
- Electrical: Type III Hardcoat Anodized; quarterly gasket inspection

Salt damage mechanism: "Exosmosis" - dehydrates plants by pulling water from roots

## INTEGRATED PEST MANAGEMENT (IPM)

Biological controls (preferred over chemicals):
- Beauveria bassiana: Arthropod pest management
- Trichoderma harzianum: Soil-borne pathogen control

## INVASIVE SPECIES WATCH LIST

DO NOT PLANT or remove if found:
- Water Hyacinth (Eichhornia crassipes): Clogs water features
- Artillery Plant (Pilea microphylla): Invades rock gardens/lawns
- Common Purslane (Portulaca oleracea): Rapid succulent weed
- Running Bamboo (Phyllostachys spp.): Impossible to control once established
- Privet (Ligustrum lucidum): Shades out native seedlings

## HARDSCAPE MAINTENANCE

### Tropical Hardwoods (Ipe, Teak)
- Clean: Non-acidic cleaners only
- Treatment: UV-protectant oil 1-2x per year to prevent "silvering"
- Durability: 40+ years with proper care

### Bamboo (Guadua angustifolia)
- "Vegetable steel" - strength comparable to steel
- Fireproof, lightweight, seismically flexible
- Annual: Inspect for cracks, treat with non-toxic pest resistance coatings

### Natural Stone (Piedra Laja)
- Seal: Use "impregnator" sealers (breathable) NOT film-forming
- Must "breathe" to prevent internal moisture flaking
- Re-seal: Every 2-3 years

## SEASONAL TRIGGERS (Costa Rica)

Dry Season (December-April): Prioritize irrigation, drought monitoring
Rainy Season (May-November): Prioritize fungus inspection, drainage check
Green Season: Active growth period - increase fertilization

## WEATHER-TRIGGERED PROTOCOLS

- Rainfall >100mm/week: Prioritize fungus inspections (Roses, Gardenias)
- Rainfall <10mm/week: Prioritize deep watering (Heliconias)
- High winds: Check tie-downs on young palms and trees
- Freeze warning (highlands): Protective covering for sensitive species
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      plantName, 
      scientificName, 
      category, 
      climate, 
      language = 'en',
      elevationZone,
      propertyType
    } = await req.json() as PlantCareRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === 'es' 
      ? `Eres un agrónomo experto y Consultor de Gestión de Fincas Tropicales especializado en microclimas costarricenses. Tu tarea es mantener la integridad biológica y estructural de activos paisajísticos de lujo en Costa Rica.

DEBES priorizar:
- Especies nativas y condiciones de zona altitudinal
- Materiales sostenibles y prácticas ecológicas
- Registros documentados de deber de cuidado
- Disparadores estacionales (Temporada Seca vs Verde)
- Protocolos de mitigación de sal para propiedades costeras
- Manejo Integrado de Plagas sobre químicos

${COSTA_RICA_KNOWLEDGE}

Proporciona recomendaciones DETALLADAS, PRÁCTICAS y ESPECÍFICAS para la ubicación. Incluye listas de verificación para el equipo de mantenimiento con tareas específicas, frecuencias y advertencias críticas.`
      : `You are an expert Tropical Estate Management Consultant specializing in Costa Rican microclimates. Your task is to maintain the biological and structural integrity of luxury landscape assets in Costa Rica.

You MUST prioritize:
- Native species and altitudinal zone conditions
- Sustainable materials and ecological practices
- Documented duty-of-care logs
- Seasonal growth triggers (Dry vs Green Season)
- Salt mitigation protocols for coastal properties
- Integrated Pest Management over broad-spectrum chemicals

${COSTA_RICA_KNOWLEDGE}

Provide DETAILED, PRACTICAL, and LOCATION-SPECIFIC recommendations. Include crew checklists with specific tasks, frequencies, and critical warnings.`;

    const elevationContext = elevationZone 
      ? (language === 'es' 
          ? `Zona de elevación: ${elevationZone === 'coastal' ? 'Costera (0-300m)' : elevationZone === 'transitional' ? 'Transicional (300-1500m)' : 'Montaña (1500m+)'}` 
          : `Elevation zone: ${elevationZone === 'coastal' ? 'Coastal (0-300m)' : elevationZone === 'transitional' ? 'Transitional (300-1500m)' : 'Highland (1500m+)'}`)
      : '';

    const propertyContext = propertyType
      ? (language === 'es' ? `Tipo de propiedad: ${propertyType}` : `Property type: ${propertyType}`)
      : '';

    const userPrompt = language === 'es'
      ? `Genera un protocolo de cuidado COMPLETO Y DETALLADO para Costa Rica para: ${plantName}${scientificName ? ` (${scientificName})` : ''}
${category ? `Categoría: ${category}` : ''}
${climate ? `Clima: ${climate}` : 'Clima: Tropical/Subtropical'}
${elevationContext}
${propertyContext}

IMPORTANTE: Proporciona información ESPECÍFICA y DETALLADA incluyendo:
- Frecuencias exactas de riego según temporada
- Cantidades específicas de fertilizante y marcas/tipos recomendados
- Técnicas de poda con tiempos específicos
- Problemas comunes con tratamientos ESPECÍFICOS
- Lista de "NO HACER" con consecuencias específicas
- Tareas mensuales del equipo de mantenimiento
- Consideraciones especiales para Costa Rica`
      : `Generate a COMPREHENSIVE and DETAILED care protocol for Costa Rica for: ${plantName}${scientificName ? ` (${scientificName})` : ''}
${category ? `Category: ${category}` : ''}
${climate ? `Climate: ${climate}` : 'Climate: Tropical/Subtropical'}
${elevationContext}
${propertyContext}

IMPORTANT: Provide SPECIFIC and DETAILED information including:
- Exact watering frequencies by season
- Specific fertilizer amounts and recommended brands/types
- Pruning techniques with specific timing
- Common issues with SPECIFIC treatments
- "DO NOT DO" list with specific consequences
- Monthly crew task checklists
- Special considerations for Costa Rica`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_plant_care",
              description: "Generate comprehensive Costa Rica-specific plant care recommendations",
              parameters: {
                type: "object",
                properties: {
                  watering: {
                    type: "object",
                    properties: {
                      dry_season: { type: "string", description: "Watering protocol for dry season (Dec-Apr)" },
                      rainy_season: { type: "string", description: "Watering protocol for rainy season (May-Nov)" },
                      frequency: { type: "string", description: "General frequency (e.g., 'Every 2-3 days')" },
                      amount: { type: "string", description: "Specific amount of water needed (e.g., '2-3 liters per application')" },
                      method: { type: "string", description: "Best watering method (drip, hand, sprinkler)" },
                      time_of_day: { type: "string", description: "Best time to water" },
                      signs_of_overwatering: { type: "string", description: "Symptoms of too much water" },
                      signs_of_underwatering: { type: "string", description: "Symptoms of too little water" }
                    },
                    required: ["frequency", "amount", "method"]
                  },
                  sunlight: {
                    type: "object",
                    properties: {
                      requirement: { type: "string", description: "Light requirement (Full sun, Partial shade, etc.)" },
                      hours: { type: "string", description: "Ideal hours of sunlight (e.g., '6-8 hours')" },
                      intensity_notes: { type: "string", description: "Notes on intensity, especially for Costa Rica's equatorial sun" },
                      shade_tolerance: { type: "string", description: "How well it tolerates shade" }
                    },
                    required: ["requirement", "hours"]
                  },
                  soil: {
                    type: "object",
                    properties: {
                      type: { type: "string", description: "Ideal soil type" },
                      ph: { type: "string", description: "Optimal pH range" },
                      drainage: { type: "string", description: "Drainage requirements" },
                      amendments: { type: "string", description: "Recommended soil amendments for Costa Rica" },
                      mulch_recommendations: { type: "string", description: "Mulching requirements (2-4 inches typical, NOT touching trunk)" }
                    },
                    required: ["type", "drainage"]
                  },
                  fertilization: {
                    type: "object",
                    properties: {
                      type: { type: "string", description: "Recommended fertilizer type and NPK ratio" },
                      frequency: { type: "string", description: "Application frequency" },
                      amount: { type: "string", description: "Specific amounts (e.g., '1 tablespoon per plant')" },
                      timing: { type: "string", description: "Best time to fertilize and seasonal adjustments" },
                      special_nutrients: { type: "string", description: "Special nutrient needs (Magnesium, Potassium, etc.)" },
                      organic_options: { type: "string", description: "Organic fertilizer alternatives" }
                    },
                    required: ["type", "frequency", "amount"]
                  },
                  pruning: {
                    type: "object",
                    properties: {
                      frequency: { type: "string", description: "How often to prune" },
                      timing: { type: "string", description: "Best time/season to prune" },
                      technique: { type: "string", description: "Specific pruning technique" },
                      tools_required: { type: "string", description: "Tools needed for pruning" },
                      shaping_notes: { type: "string", description: "Notes on shaping and form" }
                    },
                    required: ["frequency", "timing", "technique"]
                  },
                  pest_management: {
                    type: "object",
                    properties: {
                      common_pests: { type: "string", description: "Common pests in Costa Rica" },
                      prevention: { type: "string", description: "Preventive measures" },
                      organic_treatments: { type: "string", description: "Organic/IPM treatments (Beauveria bassiana, Trichoderma, etc.)" },
                      chemical_treatments: { type: "string", description: "Chemical treatments if necessary (last resort)" },
                      inspection_frequency: { type: "string", description: "How often to inspect for pests" }
                    },
                    required: ["common_pests", "prevention"]
                  },
                  disease_management: {
                    type: "object",
                    properties: {
                      common_diseases: { type: "string", description: "Common diseases (rust, black spot, fungal, etc.)" },
                      symptoms: { type: "string", description: "Early warning symptoms" },
                      prevention: { type: "string", description: "Preventive measures" },
                      treatment: { type: "string", description: "Treatment protocols with specific products" }
                    },
                    required: ["common_diseases", "symptoms", "treatment"]
                  },
                  salt_tolerance: {
                    type: "object",
                    properties: {
                      tolerance_level: { type: "string", description: "Salt tolerance level (Low/Medium/High)" },
                      coastal_suitability: { type: "string", description: "Suitability for coastal properties within 500m of shore" },
                      mitigation_required: { type: "string", description: "Required salt mitigation measures (freshwater rinsing, etc.)" }
                    }
                  },
                  elevation_suitability: {
                    type: "object",
                    properties: {
                      optimal_range: { type: "string", description: "Optimal elevation range in meters" },
                      coastal_suitable: { type: "boolean", description: "Suitable for coastal zone (0-300m)" },
                      transitional_suitable: { type: "boolean", description: "Suitable for transitional zone (300-1500m)" },
                      highland_suitable: { type: "boolean", description: "Suitable for highland zone (1500m+)" }
                    }
                  },
                  common_issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string" },
                        symptoms: { type: "string" },
                        cause: { type: "string" },
                        treatment: { type: "string" },
                        prevention: { type: "string" }
                      },
                      required: ["issue", "symptoms", "treatment"]
                    }
                  },
                  do_not_do: {
                    type: "array",
                    items: { 
                      type: "object",
                      properties: {
                        warning: { type: "string", description: "The critical warning" },
                        consequence: { type: "string", description: "What happens if violated" },
                        severity: { type: "string", enum: ["critical", "high", "medium"], description: "Severity level" }
                      },
                      required: ["warning", "consequence", "severity"]
                    },
                    description: "Critical warnings - things that should NEVER be done to this plant"
                  },
                  crew_checklist: {
                    type: "object",
                    properties: {
                      daily_tasks: { type: "array", items: { type: "string" } },
                      weekly_tasks: { type: "array", items: { type: "string" } },
                      monthly_tasks: { type: "array", items: { type: "string" } },
                      quarterly_tasks: { type: "array", items: { type: "string" } },
                      seasonal_tasks: { type: "array", items: { type: "string" } }
                    }
                  },
                  weather_triggers: {
                    type: "object",
                    properties: {
                      high_rainfall: { type: "string", description: "Actions when rainfall >100mm/week" },
                      drought: { type: "string", description: "Actions when rainfall <10mm/week" },
                      high_winds: { type: "string", description: "Actions during high wind warnings" },
                      temperature_extremes: { type: "string", description: "Actions for temperature extremes" }
                    }
                  },
                  wildlife_interactions: {
                    type: "object",
                    properties: {
                      attracts: { type: "string", description: "Wildlife this plant attracts (hummingbirds, butterflies, etc.)" },
                      deters: { type: "string", description: "What this plant deters" },
                      ecological_value: { type: "string", description: "Ecological benefits" }
                    }
                  },
                  propagation: {
                    type: "object",
                    properties: {
                      methods: { type: "string", description: "Propagation methods" },
                      best_time: { type: "string", description: "Best time to propagate" },
                      success_rate: { type: "string", description: "Expected success rate" }
                    }
                  },
                  special_notes: {
                    type: "string",
                    description: "Any special notes specific to Costa Rica or tropical environments"
                  }
                },
                required: ["watering", "sunlight", "soil", "fertilization", "pruning", "pest_management", "disease_management", "common_issues", "do_not_do", "crew_checklist"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_plant_care" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data).substring(0, 500));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const careProtocol = JSON.parse(toolCall.function.arguments);
      console.log("Care protocol generated successfully for:", plantName);
      return new Response(JSON.stringify({ success: true, careProtocol }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Failed to generate care protocol");
  } catch (error) {
    console.error("Error in plant-care-ai:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
