import React from 'react';
import { Icons } from './Icons';

interface LoadingViewProps {
  status: string;
}

const LoadingView: React.FC<LoadingViewProps> = ({ status }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 border-4 border-gold-200 border-t-gold-600 rounded-full animate-spin mb-6"></div>
      <h3 className="text-xl font-serif font-semibold text-gray-800 mb-2">AI Generiše Lekciju</h3>
      <p className="text-gray-500 max-w-xs">{status}</p>
      
      <div className="mt-8 grid grid-cols-3 gap-4 opacity-50">
        <div className="flex flex-col items-center">
           <Icons.Anatomy className="w-6 h-6 text-gold-500 mb-1" />
           <span className="text-xs">Struktura</span>
        </div>
        <div className="flex flex-col items-center">
           <Icons.Technique className="w-6 h-6 text-gold-500 mb-1" />
           <span className="text-xs">Tehnika</span>
        </div>
        <div className="flex flex-col items-center">
           <Icons.Lesson className="w-6 h-6 text-gold-500 mb-1" />
           <span className="text-xs">Web Sajt</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingView;
