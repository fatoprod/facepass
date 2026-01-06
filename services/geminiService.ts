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
): Promise<{ matchFound: boolean; ticketId?: string; confidence?: string; faceDetected?: boolean }> => {
  
  // Filter candidates that have base64 images
  const validCandidates = candidates.filter(t => t.faceImageBase64);

  if (validCandidates.length === 0) {
    return { matchFound: false, confidence: 'N/A', faceDetected: false };
  }

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    // Construct the prompt with the target image and labeled candidate images
    const parts: any[] = [
      { text: `You are an advanced FACIAL RECOGNITION system at a security checkpoint.

STEP 1 - FACE DETECTION:
First, check if there is a CLEAR, UNOBSTRUCTED human face in the TARGET_IMAGE.
- The face must be visible (not covered by hands, objects, masks, etc.)
- The face must be recognizable (eyes, nose, mouth visible)
- If NO clear face is detected, return: { "faceDetected": false, "matchFound": false, "candidateId": null, "confidence": "N/A" }

STEP 2 - FACIAL COMPARISON (only if face detected):
Compare the BIOMETRIC FEATURES of the face in TARGET_IMAGE with REGISTERED_IMAGE:
- Face shape and structure
- Eye shape, spacing, and position
- Nose shape and size
- Mouth shape
- Eyebrow shape
- Forehead and jawline

CRITICAL SECURITY RULES:
1. ONLY compare FACIAL FEATURES - ignore background, clothing, lighting differences
2. The faces must belong to THE SAME PERSON to return matchFound=true
3. If the face is partially obscured or unclear, return faceDetected=false
4. Be STRICT - false positives are a security risk
5. Different angles/expressions are OK, but core features must match

Return JSON with:
- faceDetected (boolean): true only if a clear face is visible in TARGET_IMAGE
- matchFound (boolean): true only if faces match AND faceDetected is true
- candidateId (string): matching ID if matchFound, otherwise null
- confidence (string): 'High', 'Medium', or 'Low'` },
      { text: "TARGET_IMAGE (person at the gate - verify face is visible first):" },
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
        parts.push({ text: `REGISTERED_IMAGE (ID: ${ticket.id}):` });
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64(ticket.faceImageBase64)
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceDetected: { type: Type.BOOLEAN, description: "Is a clear, unobstructed face visible in TARGET_IMAGE?" },
            matchFound: { type: Type.BOOLEAN },
            candidateId: { type: Type.STRING, nullable: true },
            confidence: { type: Type.STRING, description: "Confidence level: High, Medium, or Low" }
          },
          required: ["faceDetected", "matchFound", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    console.log('Gemini raw response:', result);
    
    // Se não detectou rosto, retornar imediatamente
    if (!result.faceDetected) {
      return { 
        matchFound: false, 
        faceDetected: false,
        confidence: 'N/A'
      };
    }
    
    if (result.matchFound && result.candidateId) {
      return { 
        matchFound: true, 
        ticketId: result.candidateId,
        confidence: result.confidence || 'Unknown',
        faceDetected: true
      };
    }

    return { matchFound: false, confidence: result.confidence || 'Unknown', faceDetected: true };

  } catch (error) {
    console.error("Gemini Identification Error:", error);
    return { matchFound: false, faceDetected: false };
  }
};
