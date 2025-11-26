
import React from 'react';
import { Lesson } from '../types';
import { Icons } from './Icons';

interface DashboardProps {
  lessons: Lesson[];
  onNewLesson: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onScan: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ lessons, onNewLesson, onSelectLesson, onDeleteLesson, onScan }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-6 py-8 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">MediBuilder AI</h1>
            <p className="text-sm text-gray-500">Medicinski trening generator</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onNewLesson}
            className="flex-1 bg-gold-500 hover:bg-gold-600 text-white rounded-xl py-3 px-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Icons.Mic className="w-5 h-5" />
            Nova Lekcija
          </button>
          <button 
            onClick={onScan}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl py-3 px-4 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Icons.Camera className="w-5 h-5" />
            Skeniraj
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Icons.Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nema sačuvanih lekcija</h3>
            <p className="text-gray-500 max-w-xs mt-2">
              Započnite novu lekciju snimanjem glasa ili skeniranjem knjige.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-20">
            {lessons.map((lesson) => (
              <div 
                key={lesson.id}
                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                onClick={() => onSelectLesson(lesson)}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-gold-600 bg-gold-50 px-2 py-1 rounded-md uppercase tracking-wider">
                    Lekcija
                  </span>
                  
                  {/* Action Buttons - Always visible for mobile */}
                  <div className="flex gap-1">
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLesson(lesson);
                        }}
                        className="p-2 text-gray-400 hover:text-gold-600 hover:bg-gold-50 rounded-full transition-colors"
                        title="Izmeni"
                    >
                        <Icons.Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLesson(lesson.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Obriši"
                    >
                        <Icons.Delete className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-2 leading-snug pr-8">
                  {lesson.content.title}
                </h3>
                
                <div className="flex items-center text-xs text-gray-400 gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Icons.Lesson className="w-3 h-3" />
                    <span>{new Date(lesson.createdAt).toLocaleDateString('sr-RS')}</span>
                  </div>
                  {lesson.content.imagePrompts?.length > 0 && (
                     <div className="flex items-center gap-1">
                        <Icons.Anatomy className="w-3 h-3" />
                        <span>Ilustrovano</span>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
