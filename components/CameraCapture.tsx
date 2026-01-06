import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  label?: string;
  autoStart?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label = "Capturar Foto", autoStart = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setError("Não foi possível acessar a câmera.");
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Flip horizontally for mirror effect if needed, but keeping raw for recognition is usually safer
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  }, [onCapture, stopCamera]);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  useEffect(() => {
    if (autoStart) startCamera();
    return () => stopCamera();
  }, [autoStart, startCamera, stopCamera]);

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {error && <div className="text-red-400 bg-red-900/30 p-3 rounded">{error}</div>}
      
      <div className="relative w-full max-w-md aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl">
        {!capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            onLoadedMetadata={() => {
                if(videoRef.current) videoRef.current.play();
            }}
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror for user UX
          />
        ) : (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
        
        {!isStreaming && !capturedImage && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button onClick={startCamera} className="bg-brand-600 p-3 rounded-full text-white hover:bg-brand-500 transition">
              <Camera size={32} />
            </button>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        {!capturedImage ? (
          <button 
            onClick={capture} 
            disabled={!isStreaming}
            className={`px-6 py-3 rounded-full font-bold text-white flex items-center space-x-2 transition ${isStreaming ? 'bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30' : 'bg-gray-700 cursor-not-allowed'}`}
          >
            <Camera size={20} />
            <span>{label}</span>
          </button>
        ) : (
          <button 
            onClick={retake}
            className="px-6 py-3 rounded-full font-bold text-white bg-gray-700 hover:bg-gray-600 flex items-center space-x-2 transition"
          >
            <RefreshCw size={20} />
            <span>Tirar Outra</span>
          </button>
        )}
      </div>
    </div>
  );
};
