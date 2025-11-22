
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameStats } from "../types";

export const analyzeBlueprint = async (base64Image: string): Promise<GameStats> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, using default stats");
    return {
      power: 5,
      armor: 5,
      speed: 5,
      description: "Offline Mode: Standard Scorpion Tank configuration loaded."
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = "Analyze this tank drawing for a kids' game. Based on its visual features (barrel size, armor thickness, wheels), assign it stats for Power, Armor, and Speed (1-10). Also write a short, fun, 1-sentence description suitable for a 7-year-old. Return JSON.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            power: { type: Type.NUMBER },
            armor: { type: Type.NUMBER },
            speed: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["power", "armor", "speed", "description"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as GameStats;
    }
    throw new Error("No text response");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      power: 7,
      armor: 8,
      speed: 4,
      description: "The scanner malfunctioned, but your Scorpion tank looks super tough!"
    };
  }
};

export const generateAuthorAvatar = async (): Promise<string | null> => {
  if (!process.env.API_KEY) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: 'A cute cartoon icon of a 9-year-old Chinese boy, smiling, wearing retro pilot goggles on forehead, flat vector art style, simple vibrant colors, white background, high quality character design.' },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    console.error("Avatar Generation Error:", error);
    return null;
  }
};
