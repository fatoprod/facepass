import { storage } from './firebase';
import { ref, uploadString, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';

/**
 * Upload a face image to Firebase Storage
 * @param base64Image - The base64 encoded image (with or without data URL prefix)
 * @param eventId - The event ID for organizing images
 * @param ticketId - The ticket ID for the filename
 * @returns The download URL of the uploaded image
 */
export const uploadFaceImage = async (
  base64Image: string,
  eventId: string,
  ticketId: string
): Promise<string> => {
  try {
    // Create a reference to the file location
    // Structure: faces/{eventId}/{ticketId}.jpg
    const storageRef = ref(storage, `faces/${eventId}/${ticketId}.jpg`);
    
    // Ensure the base64 string has the data URL prefix for uploadString
    const dataUrl = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;
    
    // Upload the base64 string
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Face image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading face image:', error);
    throw new Error('Falha ao fazer upload da imagem facial');
  }
};

/**
 * Delete a face image from Firebase Storage
 * @param eventId - The event ID
 * @param ticketId - The ticket ID
 */
export const deleteFaceImage = async (
  eventId: string,
  ticketId: string
): Promise<void> => {
  try {
    const storageRef = ref(storage, `faces/${eventId}/${ticketId}.jpg`);
    await deleteObject(storageRef);
    console.log('Face image deleted successfully');
  } catch (error) {
    console.error('Error deleting face image:', error);
    // Don't throw - image might not exist
  }
};

/**
 * Get the download URL for a face image
 * @param eventId - The event ID
 * @param ticketId - The ticket ID
 * @returns The download URL or null if not found
 */
export const getFaceImageUrl = async (
  eventId: string,
  ticketId: string
): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `faces/${eventId}/${ticketId}.jpg`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting face image URL:', error);
    return null;
  }
};

/**
 * Convert a Storage URL to base64 for AI processing using Firebase SDK
 * This avoids CORS issues by using the Firebase Storage SDK
 * @param url - The Firebase Storage download URL
 * @returns Base64 encoded image string with data URL prefix
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    // Extract the path from the URL to create a proper reference
    // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?...
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    
    if (pathMatch) {
      // Decode the path (it's URL encoded)
      const storagePath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, storagePath);
      
      // Use getBlob from Firebase SDK (no CORS issues)
      const blob = await getBlob(storageRef);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    throw new Error('Invalid Firebase Storage URL format');
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw new Error('Falha ao carregar imagem facial');
  }
};
