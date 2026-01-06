import { GoogleGenAI, Type } from "@google/genai";
import { Ticket } from "../types";

// Helper to strip data url prefix
const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

/**
 * Validates if an uploaded image contains a clear face suitable for registration.
 */
export const validateFaceForRegistration = async (imageBase64: string): Promise<{ isValid: boolean; reason: string }> => {
  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    console.log("API Key loaded:", apiKey ? "Yes (length: " + apiKey.length + ")" : "No");
    
    if (!apiKey) {
      return { isValid: false, reason: "Chave de API não configurada. Verifique o arquivo .env.local" };
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(imageBase64)
            }
          },
          {
            text: "Analyze this image. Does it contain exactly one clear human face suitable for facial recognition registration? It should be well-lit, facing forward, and not obstructed. Return JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING, description: "Short explanation in Portuguese" }
          },
          required: ["isValid", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Validation Error:", error);
    return { isValid: false, reason: "Erro ao conectar com o serviço de IA." };
  }
};

/**
 * Compares a scanned face (gate) against a list of registered ticket holders.
 * Note: In a real production app, you would use a Vector Database.
 * For this demo, we use Gemini's multimodal context window to find a match.
 */
export const identifyUserAtGate = async (
  scannedImageBase64: string, 
  candidates: Ticket[]
): Promise<{ matchFound: boolean; ticketId?: string; confidence?: string }> => {
  
  // Filter candidates that have base64 images
  const validCandidates = candidates.filter(t => t.faceImageBase64);

  if (validCandidates.length === 0) {
    return { matchFound: false, confidence: 'N/A' };
  }

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    // Construct the prompt with the target image and labeled candidate images
    const parts: any[] = [
      { text: "You are a security officer at an event turnstile. Your task is to identify if the person in the 'TARGET_IMAGE' matches any of the persons in the 'CANDIDATE_IMAGES'.\n\nAnalyze facial features carefully.\n\nReturn JSON with:\n- `matchFound` (boolean): true if the person matches any candidate\n- `candidateId` (string): the matching ID, or null if no match\n- `confidence` (string): ALWAYS provide a confidence level as 'High', 'Medium', or 'Low' based on how certain you are of the match or non-match" },
      { text: "TARGET_IMAGE:" },
      { 
        inlineData: { 
          mimeType: "image/jpeg", 
          data: cleanBase64(scannedImageBase64) 
        } 
      }
    ];

    // Add candidates to the prompt
    for (const ticket of validCandidates) {
      if (ticket.faceImageBase64) {
        parts.push({ text: `CANDIDATE_ID: ${ticket.id}` });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64(ticket.faceImageBase64)
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Efficient for multimodal comparison
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchFound: { type: Type.BOOLEAN },
            candidateId: { type: Type.STRING, nullable: true },
            confidence: { type: Type.STRING, description: "Confidence level: High, Medium, or Low" }
          },
          required: ["matchFound", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.matchFound && result.candidateId) {
      return { 
        matchFound: true, 
        ticketId: result.candidateId,
        confidence: result.confidence || 'Unknown'
      };
    }

    return { matchFound: false, confidence: result.confidence || 'Unknown' };

  } catch (error) {
    console.error("Gemini Identification Error:", error);
    return { matchFound: false };
  }
};
