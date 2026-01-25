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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plantName, scientificName, category, climate, language = 'en' } = await req.json() as PlantCareRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === 'es' 
      ? `Eres un agrónomo experto especializado en el cuidado de plantas para fincas de lujo en climas tropicales y subtropicales. Proporciona recomendaciones de cuidado detalladas, prácticas y específicas para la ubicación.`
      : `You are an expert agronomist specializing in plant care for luxury estates in tropical and subtropical climates. Provide detailed, practical, and location-specific care recommendations.`;

    const userPrompt = language === 'es'
      ? `Genera un protocolo de cuidado completo para: ${plantName}${scientificName ? ` (${scientificName})` : ''}
${category ? `Categoría: ${category}` : ''}
${climate ? `Clima: ${climate}` : 'Clima: Tropical/Subtropical'}

Proporciona la respuesta en el siguiente formato JSON exacto:`
      : `Generate a comprehensive care protocol for: ${plantName}${scientificName ? ` (${scientificName})` : ''}
${category ? `Category: ${category}` : ''}
${climate ? `Climate: ${climate}` : 'Climate: Tropical/Subtropical'}

Provide the response in the following exact JSON format:`;

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
              description: "Generate comprehensive plant care recommendations",
              parameters: {
                type: "object",
                properties: {
                  watering: {
                    type: "object",
                    properties: {
                      frequency: { type: "string", description: "How often to water (e.g., 'Every 2-3 days', 'Weekly')" },
                      amount: { type: "string", description: "Amount of water needed" },
                      method: { type: "string", description: "Best watering method" },
                      seasonal_notes: { type: "string", description: "Seasonal adjustments" }
                    },
                    required: ["frequency", "amount", "method"]
                  },
                  sunlight: {
                    type: "object",
                    properties: {
                      requirement: { type: "string", description: "Light requirement (Full sun, Partial shade, etc.)" },
                      hours: { type: "string", description: "Ideal hours of sunlight" },
                      notes: { type: "string", description: "Additional light notes" }
                    },
                    required: ["requirement", "hours"]
                  },
                  soil: {
                    type: "object",
                    properties: {
                      type: { type: "string", description: "Ideal soil type" },
                      ph: { type: "string", description: "Optimal pH range" },
                      drainage: { type: "string", description: "Drainage requirements" }
                    },
                    required: ["type", "drainage"]
                  },
                  fertilization: {
                    type: "object",
                    properties: {
                      type: { type: "string", description: "Recommended fertilizer type" },
                      frequency: { type: "string", description: "Application frequency" },
                      timing: { type: "string", description: "Best time to fertilize" }
                    },
                    required: ["type", "frequency"]
                  },
                  pruning: {
                    type: "object",
                    properties: {
                      frequency: { type: "string", description: "How often to prune" },
                      timing: { type: "string", description: "Best time to prune" },
                      technique: { type: "string", description: "Pruning technique" }
                    },
                    required: ["frequency", "timing"]
                  },
                  common_issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        issue: { type: "string" },
                        symptoms: { type: "string" },
                        treatment: { type: "string" }
                      },
                      required: ["issue", "symptoms", "treatment"]
                    }
                  },
                  do_not_do: {
                    type: "array",
                    items: { type: "string" },
                    description: "Critical warnings - things that should NEVER be done to this plant"
                  },
                  monthly_tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "string" },
                        tasks: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                },
                required: ["watering", "sunlight", "soil", "fertilization", "pruning", "common_issues", "do_not_do"],
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const careProtocol = JSON.parse(toolCall.function.arguments);
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
