
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiVisionResponse } from "../types";

const SYSTEM_INSTRUCTION = `You are a high-speed mobility assistant for the visually impaired. 
Analyze the image frame from a first-person perspective.
PRIORITY:
1. Identify immediate physical hazards (stairs, holes, wet floors, moving objects).
2. Provide navigation cues (clear paths, handrails, doors).
3. Ignore faces and private details.

RULES:
- Be concise. Max 12 words per message.
- Use calm, objective tone.
- If risk is HIGH, the first guidance item MUST have an action like 'stop' or 'slow'.
- Always include the mandatory disclaimer as the last item in the 'guidance' array: "Use caution; verify with cane/dog/assistance."
- Compare context with the provided "Last Spoken Messages" to avoid redundant alerts unless the situation escalated (e.g., hazard is now NEAR instead of MEDIUM).

OUTPUT SCHEMA:
Return ONLY strict JSON matching the requested structure.`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Initialize GoogleGenAI correctly using the named parameter and direct environment variable.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeFrame(
    base64Image: string, 
    lastMessages: string[]
  ): Promise<GeminiVisionResponse | null> {
    try {
      const prompt = `Current Frame Analysis Request.
      Last Spoken Messages (Deduplicate against these): ${JSON.stringify(lastMessages)}
      
      Tasks:
      1. Assess overall_risk (low/medium/high).
      2. Provide 1-3 guidance items.
      3. Append disclaimer.`;

      // Use ai.models.generateContent with the correct model name and contents structure.
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image,
              },
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              timestamp: { type: Type.STRING },
              overall_risk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
              guidance: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    priority: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['hazard', 'navigation', 'info'] },
                    message: { type: Type.STRING },
                    direction: { type: Type.STRING, enum: ['left', 'center', 'right', 'unknown'] },
                    distance: { type: Type.STRING, enum: ['near', 'medium', 'far', 'unknown'] },
                    action: { type: Type.STRING, enum: ['stop', 'slow', 'step_left', 'step_right', 'proceed', 'unknown'] },
                    confidence: { type: Type.NUMBER },
                  },
                  required: ["priority", "type", "message", "direction", "distance", "action", "confidence"]
                }
              },
              dont_repeat_for_seconds: { type: Type.NUMBER }
            },
            required: ["timestamp", "overall_risk", "guidance", "dont_repeat_for_seconds"]
          }
        },
      });

      // Extract text output from GenerateContentResponse using the .text property.
      const text = response.text?.trim();
      if (!text) return null;
      return JSON.parse(text) as GeminiVisionResponse;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
