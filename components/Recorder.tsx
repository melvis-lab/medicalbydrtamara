import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { blobToBase64 } from '../utils/audioUtils';

interface RecorderProps {
  onRecordingComplete: (base64Audio: string, mimeType: string) => void;
  onCancel: () => void;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        onRecordingComplete(base64, 'audio/webm');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please enable permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in zoom-in duration-300">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Snimi Lekciju</h2>
        <p className="text-gray-500">Pritisni mikrofon i govori na srpskom jeziku o anatomiji, tehnici ili proceduri.</p>
      </div>

      <div className="relative mb-12">
        {/* Pulse effect rings */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></div>
            <div className="absolute -inset-4 rounded-full border border-red-200 animate-pulse-slow"></div>
          </>
        )}
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative z-10 flex items-center justify-center w-32 h-32 rounded-full shadow-xl transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600 scale-105' 
              : 'bg-gradient-to-br from-gold-400 to-gold-600 text-white hover:scale-105 hover:shadow-2xl'
          }`}
        >
          {isRecording ? (
            <Icons.Stop className="w-12 h-12" />
          ) : (
            <Icons.Mic className="w-12 h-12" />
          )}
        </button>
      </div>

      <div className="text-4xl font-mono text-gray-700 mb-12 tabular-nums">
        {formatTime(duration)}
      </div>

      <button 
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600 font-medium px-6 py-2"
      >
        Otkaži
      </button>

      {isRecording && (
        <p className="mt-8 text-sm text-red-500 font-medium animate-pulse">
          • Snimanje u toku...
        </p>
      )}
    </div>
  );
};

export default Recorder;
