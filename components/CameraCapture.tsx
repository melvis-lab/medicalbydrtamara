
import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './Icons';

interface CameraCaptureProps {
  onCapture: (base64Images: string[]) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Ref for double-tap detection
  const lastTap = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Nije moguće pristupiti kameri. Proverite dozvole.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capture = () => {
    if (videoRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        setCapturedImages(prev => [...prev, base64]);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent default to avoid zooming or other browser gestures if needed, 
    // but be careful not to block scrolling if this was a scrollable area. 
    // Since it's a fixed camera view, it's mostly fine.
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap.current;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      e.preventDefault();
      capture();
    }
    
    lastTap.current = currentTime;
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (capturedImages.length > 0) {
      onCapture(capturedImages);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      
      {/* Top Bar Controls (Always visible, safe from bottom browser bar) */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-30 pointer-events-none">
          {/* Left: Spacer */}
          <div className="w-16"></div> 

          {/* Center: Status Badge */}
          <span className="bg-black/60 text-white px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-md shadow-lg border border-white/10 whitespace-nowrap">
             {capturedImages.length === 0 
                ? "Dupli dodir za slikanje 📸" 
                : `${capturedImages.length} slika snimljeno`}
          </span>

          {/* Right: Finish Button (Pointer events enabled) */}
          <div className="w-16 flex justify-end pointer-events-auto">
            {capturedImages.length > 0 && (
                <button 
                    onClick={handleFinish}
                    className="bg-gold-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg flex items-center gap-1 hover:bg-gold-600 transition-all animate-in fade-in slide-in-from-right-4"
                >
                    Završi
                    <Icons.CheckCircle className="w-3 h-3" />
                </button>
            )}
          </div>
      </div>

      {/* Viewfinder with Double Tap Handler */}
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-900 touch-manipulation"
        onTouchEnd={handleTouchEnd}
      >
        {error ? (
            <div className="text-white text-center p-6">
                <Icons.Risks className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p>{error}</p>
            </div>
        ) : (
            <>
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              {isFlashing && (
                <div className="absolute inset-0 bg-white animate-out fade-out duration-150 z-20"></div>
              )}
            </>
        )}
        
        {/* Overlay guides */}
        {!error && (
            <div className="absolute inset-12 border-2 border-white/50 rounded-lg pointer-events-none opacity-50">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
            </div>
        )}
      </div>

      {/* Gallery Strip */}
      {capturedImages.length > 0 && (
        <div className="h-24 bg-black/80 flex items-center px-4 overflow-x-auto gap-3 border-t border-white/10 shrink-0">
           {capturedImages.map((img, idx) => (
             <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-500 group">
                <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white"
                >
                  <Icons.Close className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 right-0 bg-gold-500 text-[10px] text-white px-1">
                  {idx + 1}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Controls */}
      <div 
        className="bg-slate-900 flex items-center justify-between px-8 pt-4 pb-[env(safe-area-inset-bottom)] shrink-0 min-h-[100px]"
      >
        <button 
            onClick={onCancel}
            className="text-white/80 hover:text-white flex flex-col items-center gap-1 w-16"
        >
            <span className="text-sm font-medium">Otkaži</span>
        </button>

        <button 
            onClick={capture}
            disabled={!!error}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
            <div className="w-16 h-16 rounded-full bg-white border-2 border-black"></div>
        </button>

        <button 
            onClick={handleFinish}
            disabled={capturedImages.length === 0}
            className={`w-16 flex flex-col items-center gap-1 transition-all ${
              capturedImages.length === 0 ? 'opacity-30 grayscale' : 'opacity-100 hover:scale-105'
            }`}
        >
            <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-white shadow-md">
               <Icons.CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-xs text-gold-400 font-bold">Kreiraj</span>
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
