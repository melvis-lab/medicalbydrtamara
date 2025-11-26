
import React, { useRef, useState, useEffect } from 'react';
import { Lesson, LessonContent } from '../types';
import { Icons } from './Icons';
import { generateAndSharePdf } from '../utils/pdfUtils';
import Recorder from './Recorder';

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  onGenerateImage: (prompt: string, index: number) => void;
  onGeneratePoints: (section: keyof LessonContent, text: string) => void;
  onUpdateLesson: (lesson: Lesson) => void;
  isGeneratingImage: boolean;
  printOnly?: boolean;
  containerId?: string;
}

const LessonView: React.FC<LessonViewProps> = ({ 
    lesson, 
    onBack, 
    onGenerateImage, 
    onGeneratePoints,
    onUpdateLesson, 
    isGeneratingImage, 
    printOnly = false,
    containerId = "lesson-print-container"
}) => {
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<LessonContent>(lesson.content);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync edited content when lesson changes (e.g. from AI)
  useEffect(() => {
    setEditedContent(lesson.content);
  }, [lesson]);

  const audioSrc = lesson.audioBase64 
    ? `data:${lesson.audioMimeType || 'audio/webm'};base64,${lesson.audioBase64}` 
    : undefined;

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSave = () => {
    onUpdateLesson({ ...lesson, content: editedContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(lesson.content);
    setIsEditing(false);
  };

  const handleChange = (field: keyof LessonContent, value: string) => {
    setEditedContent(prev => ({ ...prev, [field]: value }));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    setIsGeneratingPdf(true);
    try {
        await generateAndSharePdf(lesson, containerId);
    } catch (e) {
        console.error("PDF/Share error", e);
        alert("Došlo je do greške prilikom generisanja ili deljenja PDF-a.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleNewRecording = (base64Audio: string, mimeType: string) => {
    // Update the lesson with the new audio
    const updatedLesson = {
        ...lesson,
        audioBase64: base64Audio,
        audioMimeType: mimeType,
        audioDurationSec: 0 // Duration will be calculated when loaded by audio tag
    };
    onUpdateLesson(updatedLesson);
    setShowRecorder(false);
  };

  // Helper to render sections with Edit/View logic and Image/Points Slots
  const renderSection = (
    title: string, 
    field: keyof LessonContent, 
    Icon: React.ElementType,
    imageIndex?: number, 
    imagePrompt?: string
  ) => {
    const hasImage = imageIndex !== undefined && lesson.images[imageIndex];
    
    // Dynamic access for points key (e.g. anatomy -> anatomyPoints)
    const pointsKey = `${field}Points` as keyof LessonContent;
    const hasPoints = (lesson.content as any)[pointsKey] && (lesson.content as any)[pointsKey].length > 0;
    const points = (lesson.content as any)[pointsKey] as string[];

    return (
      <section className="mb-8 animate-in slide-in-from-bottom-4 duration-500 break-inside-avoid" data-section={field}>
        <h2 className="text-xl font-serif font-bold text-gray-800 mb-3 border-l-4 border-gold-400 pl-3 flex items-center gap-2">
          <Icon className="w-6 h-6 text-gold-500" />
          <span>{title}</span>
        </h2>
        
        {isEditing ? (
          <textarea
            value={editedContent[field] as string}
            onChange={(e) => handleChange(field, e.target.value)}
            className="w-full min-h-[160px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-transparent font-sans text-gray-800 bg-white shadow-inner resize-y"
            placeholder={`Unesite tekst za ${title}...`}
          />
        ) : (
          <div className="prose prose-slate max-w-none text-gray-600 whitespace-pre-line leading-relaxed text-justify pl-1">
            {lesson.content[field] as string}
          </div>
        )}

        {/* Display Key Points if available */}
        {hasPoints && !isEditing && (
           <div className="mt-4 bg-medical-50 border-l-4 border-medical-500 p-4 rounded-r-lg shadow-sm">
              <h4 className="text-sm font-bold text-medical-700 uppercase mb-2 flex items-center gap-2">
                 <Icons.Activity className="w-4 h-4" />
                 Ključne Tačke
              </h4>
              <ul className="space-y-1">
                 {points.map((pt, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                       <span className="text-medical-500 mt-1.5">•</span>
                       <span>{pt}</span>
                    </li>
                 ))}
              </ul>
           </div>
        )}

        {/* Display Image if available */}
        {hasImage && (
          <div className="mt-4 rounded-xl overflow-hidden shadow-lg border border-gray-100 relative group">
             <img 
               src={lesson.images[imageIndex!]?.url} 
               alt={`${title} illustration`}
               className="w-full h-auto object-cover max-h-96" 
               crossOrigin="anonymous" 
             />
             {!isEditing && imagePrompt && !printOnly && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onGenerateImage(imagePrompt, imageIndex!)}
                        disabled={isGeneratingImage}
                        className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-md backdrop-blur-sm"
                        title="Generiši ponovo"
                    >
                         {isGeneratingImage ? (
                            <span className="w-4 h-4 border-2 border-gold-600 border-t-transparent rounded-full animate-spin block"></span>
                        ) : (
                            <Icons.RefreshCw className="w-4 h-4" />
                        )}
                    </button>
                </div>
             )}
          </div>
        )}

        {/* Action Choice Buttons (If no image AND no points) */}
        {!isEditing && !hasImage && !hasPoints && imagePrompt && !printOnly && (
          <div className="mt-6 flex flex-wrap gap-3">
             <button
               onClick={() => onGenerateImage(imagePrompt!, imageIndex!)}
               disabled={isGeneratingImage}
               className="flex-1 min-w-[140px] flex items-center justify-center gap-2 text-sm text-gold-700 bg-gold-50 hover:bg-gold-100 px-4 py-3 rounded-xl transition-colors border border-gold-200 shadow-sm"
             >
               {isGeneratingImage ? (
                 <span className="w-4 h-4 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></span>
               ) : (
                 <Icons.Sparkles className="w-4 h-4" />
               )}
               Generiši Sliku
             </button>
             
             <button
               onClick={() => onGeneratePoints(field, lesson.content[field] as string)}
               disabled={isGeneratingImage}
               className="flex-1 min-w-[140px] flex items-center justify-center gap-2 text-sm text-medical-700 bg-medical-50 hover:bg-medical-100 px-4 py-3 rounded-xl transition-colors border border-medical-200 shadow-sm"
             >
               {isGeneratingImage ? (
                 <span className="w-4 h-4 border-2 border-medical-600 border-t-transparent rounded-full animate-spin"></span>
               ) : (
                 <Icons.FileText className="w-4 h-4" />
               )}
               Ključne Tačke
             </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Header - Hidden in Print Mode */}
      {!printOnly && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-20 shadow-sm">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <Icons.Back className="w-6 h-6" />
          </button>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full font-medium text-sm transition-all"
                >
                  <Icons.Close className="w-4 h-4" />
                  Otkaži
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white hover:bg-gold-600 rounded-full shadow-lg font-medium text-sm transition-all"
                >
                  <Icons.Save className="w-4 h-4" />
                  Sačuvaj
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gold-600 hover:bg-gold-50 rounded-full transition-colors"
                  title="Izmeni tekst"
                >
                  <Icons.Edit className="w-5 h-5" />
                  <span className="text-sm font-medium">Izmeni</span>
                </button>
                <button 
                  onClick={handleShare}
                  disabled={isGeneratingPdf}
                  className={`p-2 text-gold-600 hover:bg-gold-50 rounded-full transition-colors ${isGeneratingPdf ? 'opacity-50' : ''}`}
                  title="Podeli PDF"
                >
                  {isGeneratingPdf ? <span className="animate-spin block">⏳</span> : <Icons.Share className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50">
        
        {/* PRINTABLE CONTAINER */}
        <div id={containerId} className="bg-white">
            
            {/* Cover Image */}
            <div className="relative h-64 md:h-80 w-full bg-gray-200 print:h-[400px]">
                {lesson.images[0] ? (
                    <img 
                      src={lesson.images[0].url} 
                      alt="Cover" 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gold-100 text-gold-400">
                        <Icons.Anatomy className="w-16 h-16 opacity-50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 z-10">
                    {isEditing ? (
                        <div className="bg-white/95 p-3 rounded-lg shadow-lg">
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Naslov Lekcije</label>
                            <input 
                            value={editedContent.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-transparent text-gray-900 font-serif font-bold text-2xl border-b-2 border-gold-200 focus:border-gold-500 outline-none pb-1 placeholder-gray-400"
                            placeholder="Unesite naslov..."
                            />
                        </div>
                    ) : (
                        <div>
                             <span className="inline-block px-3 py-1 mb-2 text-xs font-bold tracking-wider text-gold-400 uppercase bg-black/50 backdrop-blur-md rounded-full border border-gold-500/30">
                                Medicinska Lekcija
                            </span>
                            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white shadow-sm leading-tight">
                                {lesson.content.title}
                            </h1>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-10 pb-32">
            
            {/* Introduction */}
            {renderSection("Uvod", "introduction", Icons.FileText)}

            {/* Anatomy */}
            {renderSection("Anatomija", "anatomy", Icons.Anatomy, 1, lesson.content.imagePrompts?.[1])}

            {/* Technique / Physiology */}
            {renderSection("Fiziologija / Procedura", "technique", Icons.Technique, 2, lesson.content.imagePrompts?.[2])}

            {/* Risks / Pathology */}
            {renderSection("Patologija / Komplikacije", "risks", Icons.Risks, 3, lesson.content.imagePrompts?.[3])}

            {/* Aftercare / Therapy */}
            {renderSection("Terapija / Zaključak", "aftercare", Icons.Aftercare, 4, lesson.content.imagePrompts?.[4])}

            {/* Footer for PDF */}
            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm font-serif italic">
                Generisano pomoću MediBuilder AI
            </div>

            </div>
        </div>
      </div>

       {/* Audio Player (Fixed below header/image) - Outside Print Container */}
       {audioSrc && !isEditing && !printOnly && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <audio 
              ref={audioRef} 
              src={audioSrc} 
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleAudioEnded}
              onLoadedMetadata={handleTimeUpdate}
            />
            <div className="flex items-center gap-4 max-w-2xl mx-auto">
              <button 
                onClick={handlePlayPause}
                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gold-500 text-white rounded-full hover:bg-gold-600 transition-colors shadow-lg"
              >
                {isPlaying ? <Icons.Pause className="w-5 h-5" /> : <Icons.Play className="w-5 h-5 ml-1" />}
              </button>
              <div className="flex-1 flex flex-col justify-center">
                 <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                 </div>
                 <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
              </div>
            </div>
          </div>
        )}

        {/* Record New Audio Button (If no audio exists) */}
        {!audioSrc && !isEditing && !printOnly && (
           <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="max-w-2xl mx-auto flex justify-center">
                  <button 
                    onClick={() => setShowRecorder(true)}
                    className="flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full shadow-lg font-medium transition-transform hover:scale-105"
                  >
                    <Icons.Mic className="w-5 h-5" />
                    Snimi Audio za ovu lekciju
                  </button>
              </div>
           </div>
        )}

        {/* Recorder Modal */}
        {showRecorder && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                <Recorder 
                    onRecordingComplete={handleNewRecording}
                    onCancel={() => setShowRecorder(false)}
                />
            </div>
        )}
    </div>
  );
};

export default LessonView;
