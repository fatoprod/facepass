import * as faceapi from 'face-api.js';

// Status do carregamento dos modelos
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Carrega os modelos de reconhecimento facial
 * Modelos necessários:
 * - tinyFaceDetector: Detecção rápida de faces
 * - faceLandmark68Net: 68 pontos de referência facial
 * - faceRecognitionNet: Extração de face descriptors (128 vetores)
 */
export const loadFaceApiModels = async (): Promise<void> => {
  if (modelsLoaded) return;
  
  // Se já está carregando, aguardar
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      
      console.log('Carregando modelos de reconhecimento facial...');
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      modelsLoaded = true;
      console.log('Modelos de reconhecimento facial carregados!');
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      loadingPromise = null;
      throw new Error('Falha ao carregar modelos de reconhecimento facial');
    }
  })();
  
  return loadingPromise;
};

/**
 * Verifica se os modelos foram carregados
 */
export const areModelsLoaded = (): boolean => modelsLoaded;

/**
 * Cria um elemento de imagem a partir de base64
 */
const createImageElement = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
};

/**
 * Interface para resultado de detecção facial
 */
export interface FaceDetectionResult {
  faceDetected: boolean;
  descriptor?: number[]; // Float32Array convertido para array
  confidence?: number;
  error?: string;
}

/**
 * Detecta um rosto e extrai o face descriptor (128 vetores numéricos)
 * @param imageBase64 - Imagem em base64
 * @returns Face descriptor ou null se não detectar rosto
 */
export const detectAndDescribeFace = async (imageBase64: string): Promise<FaceDetectionResult> => {
  try {
    // Garantir que os modelos estão carregados
    await loadFaceApiModels();
    
    // Criar elemento de imagem
    const img = await createImageElement(imageBase64);
    
    // Detectar rosto com landmarks e descriptor
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      return {
        faceDetected: false,
        error: 'Nenhum rosto detectado na imagem'
      };
    }
    
    // Converter Float32Array para array normal (para salvar no Firestore)
    const descriptorArray = Array.from(detection.descriptor);
    
    return {
      faceDetected: true,
      descriptor: descriptorArray,
      confidence: detection.detection.score
    };
  } catch (error) {
    console.error('Erro na detecção facial:', error);
    return {
      faceDetected: false,
      error: 'Erro ao processar imagem'
    };
  }
};

/**
 * Interface para resultado de comparação facial
 */
export interface FaceComparisonResult {
  isMatch: boolean;
  distance: number; // Menor = mais similar
  confidence: 'High' | 'Medium' | 'Low' | 'No Match';
  faceDetected: boolean;
  error?: string;
}

/**
 * Compara dois face descriptors usando distância euclidiana
 * @param descriptor1 - Primeiro descritor (array de 128 números)
 * @param descriptor2 - Segundo descritor (array de 128 números)
 * @returns Distância euclidiana (0 = idêntico, <0.6 = mesma pessoa geralmente)
 */
export const compareDescriptors = (descriptor1: number[], descriptor2: number[]): number => {
  const d1 = new Float32Array(descriptor1);
  const d2 = new Float32Array(descriptor2);
  return faceapi.euclideanDistance(d1, d2);
};

/**
 * Thresholds de distância para determinar match
 * Baseado em benchmarks do face-api.js:
 * - < 0.4: Muito provável mesma pessoa (High confidence)
 * - < 0.5: Provavelmente mesma pessoa (Medium confidence)
 * - < 0.6: Possivelmente mesma pessoa (Low confidence)
 * - >= 0.6: Provavelmente pessoas diferentes
 */
const THRESHOLD_HIGH = 0.4;
const THRESHOLD_MEDIUM = 0.5;
const THRESHOLD_LOW = 0.6;

/**
 * Compara uma face escaneada com uma face registrada
 * @param scannedImageBase64 - Imagem capturada na catraca
 * @param registeredDescriptor - Face descriptor salvo no cadastro
 * @returns Resultado da comparação
 */
export const compareFaces = async (
  scannedImageBase64: string,
  registeredDescriptor: number[]
): Promise<FaceComparisonResult> => {
  try {
    // Detectar rosto na imagem escaneada
    const detection = await detectAndDescribeFace(scannedImageBase64);
    
    if (!detection.faceDetected || !detection.descriptor) {
      return {
        isMatch: false,
        distance: 1,
        confidence: 'No Match',
        faceDetected: false,
        error: detection.error || 'Nenhum rosto detectado'
      };
    }
    
    // Calcular distância euclidiana
    const distance = compareDescriptors(detection.descriptor, registeredDescriptor);
    
    console.log('Face comparison distance:', distance);
    
    // Determinar confiança baseado na distância
    let confidence: 'High' | 'Medium' | 'Low' | 'No Match';
    let isMatch = false;
    
    if (distance < THRESHOLD_HIGH) {
      confidence = 'High';
      isMatch = true;
    } else if (distance < THRESHOLD_MEDIUM) {
      confidence = 'Medium';
      isMatch = true;
    } else if (distance < THRESHOLD_LOW) {
      confidence = 'Low';
      isMatch = true;
    } else {
      confidence = 'No Match';
      isMatch = false;
    }
    
    return {
      isMatch,
      distance,
      confidence,
      faceDetected: true
    };
  } catch (error) {
    console.error('Erro na comparação facial:', error);
    return {
      isMatch: false,
      distance: 1,
      confidence: 'No Match',
      faceDetected: false,
      error: 'Erro ao processar comparação'
    };
  }
};

/**
 * Valida se uma imagem é adequada para cadastro facial
 * @param imageBase64 - Imagem em base64
 * @returns Resultado da validação
 */
export const validateFaceForRegistration = async (
  imageBase64: string
): Promise<{ isValid: boolean; reason: string; descriptor?: number[] }> => {
  try {
    const detection = await detectAndDescribeFace(imageBase64);
    
    if (!detection.faceDetected) {
      return {
        isValid: false,
        reason: detection.error || 'Nenhum rosto detectado. Posicione seu rosto na câmera.'
      };
    }
    
    // Verificar confiança da detecção
    if (detection.confidence && detection.confidence < 0.7) {
      return {
        isValid: false,
        reason: 'Rosto detectado com baixa confiança. Melhore a iluminação.'
      };
    }
    
    return {
      isValid: true,
      reason: 'Rosto detectado com sucesso!',
      descriptor: detection.descriptor
    };
  } catch (error) {
    console.error('Erro na validação facial:', error);
    return {
      isValid: false,
      reason: 'Erro ao processar imagem facial.'
    };
  }
};
