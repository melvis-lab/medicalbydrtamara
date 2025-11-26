
import React, { useRef, useState, useEffect } from 'react';
import { Lesson, LessonContent } from '../types';
import { Icons } from './Icons';
import { jsPDF } from "jspdf";

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  onGenerateImage: (prompt: string, index: number) => void;
  onUpdateLesson: (lesson: Lesson) => void;
  isGeneratingImage: boolean;
}

const LessonView: React.FC<LessonViewProps> = ({ lesson, onBack, onGenerateImage, onUpdateLesson, isGeneratingImage }) => {
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<LessonContent>(lesson.content);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const generatePdf = (): jsPDF => {
     const doc = new jsPDF();
     const pageWidth = doc.internal.pageSize.getWidth();
     const margin = 20;
     const maxLineWidth = pageWidth - margin * 2;
     
     let yPos = 20;

     // Helper for text wrapping
     const addText = (text: string, fontSize: number, isBold = false) => {
         doc.setFontSize(fontSize);
         doc.setFont("helvetica", isBold ? "bold" : "normal");
         const lines = doc.splitTextToSize(text, maxLineWidth);
         doc.text(lines, margin, yPos);
         yPos += (lines.length * fontSize * 0.4) + 6;
         if (yPos > 280) {
             doc.addPage();
             yPos = 20;
         }
     };

     // Title
     addText(lesson.content.title, 24, true);
     yPos += 5;

     // Sections
     const sections = [
         { title: "Uvod", content: lesson.content.introduction },
         { title: "Anatomija", content: lesson.content.anatomy },
         { title: "Tehnika / Fiziologija", content: lesson.content.technique },
         { title: "Rizici", content: lesson.content.risks },
         { title: "Terapija / Aftercare", content: lesson.content.aftercare }
     ];

     sections.forEach(sec => {
         addText(sec.title.toUpperCase(), 14, true);
         addText(sec.content, 11, false);
         yPos += 5;
     });
     
     // Footer
     doc.setFontSize(8);
     doc.text("Generisano pomoću MediBuilder AI", margin, 290);
     
     return doc;
  };

  const handleShare = async (platform: 'whatsapp' | 'viber' | 'download') => {
    setIsGeneratingPdf(true);
    try {
        const doc = generatePdf();
        const fileName = `${lesson.content.title.replace(/\s+/g, '_')}.pdf`;
        
        // Save PDF immediately for "safe the pdf" requirement
        doc.save(fileName);
        
        const message = `Pogledaj lekciju: ${lesson.content.title}`;
        const encodedMsg = encodeURIComponent(message);
        
        // Open sharing channel
        if (platform === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodedMsg}`);
        } else if (platform === 'viber') {
            window.open(`viber://forward?text=${encodedMsg}`);
        }
    } catch (e) {
        console.error("PDF Gen error", e);
        alert("Greška pri generisanju PDF-a");
    } finally {
        setIsGeneratingPdf(false);
        setShowShareModal(false);
    }
  };

  // Helper to render sections with Edit/View logic and Image Slots
  const renderSection = (
    title: string, 
    field: keyof LessonContent, 
    imageIndex?: number, 
    imagePrompt?: string
  ) => {
    const hasImage = imageIndex !== undefined && lesson.images[imageIndex];
    const showGenButton = imageIndex !== undefined && !hasImage && imagePrompt;

    return (
      <section className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-xl font-serif font-bold text-gray-800 mb-3 border-l-4 border-gold-400 pl-3">
          {title}
        </h2>
        
        {isEditing ? (
          <textarea
            value={editedContent[field] as string}
            onChange={(e) => handleChange(field, e.target.value)}
            className="w-full min-h-[160px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-transparent font-sans text-gray-800 bg-white shadow-inner resize-y"
            placeholder={`Unesite tekst za ${title}...`}
          />
        ) : (
          <div className="prose prose-slate max-w-none text-gray-600 whitespace-pre-line leading-relaxed">
            {lesson.content[field] as string}
          </div>
        )}

        {/* Image Display */}
        {hasImage && (
          <div className="mt-4 rounded-xl overflow-hidden shadow-lg border border-gray-100">
             <img 
               src={lesson.images[imageIndex!]?.url} 
               alt={`${title} illustration`}
               className="w-full h-auto object-cover max-h-80" 
             />
          </div>
        )}

        {/* Generate Image Button */}
        {!isEditing && showGenButton && (
          <button
            onClick={() => onGenerateImage(imagePrompt!, imageIndex!)}
            disabled={isGeneratingImage}
            className="mt-4 flex items-center gap-2 text-sm text-gold-600 bg-gold-50 hover:bg-gold-100 px-4 py-2 rounded-lg transition-colors border border-gold-200"
          >
            {isGeneratingImage ? (
              <span className="w-4 h-4 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Icons.Sparkles className="w-4 h-4" />
            )}
            Generiši ilustraciju za: {title}
          </button>
        )}
      </section>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Share Modal Overlay */}
      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">Podeli PDF Lekciju</h3>
                    <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <Icons.Close className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                   PDF će biti sačuvan na vašem uređaju, a zatim možete odabrati aplikaciju za slanje.
                </p>

                <button 
                  onClick={() => handleShare('whatsapp')}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                   {isGeneratingPdf ? <span className="animate-spin text-xl">⏳</span> : <Icons.MessageSquare className="w-5 h-5" />}
                   WhatsApp
                </button>

                <button 
                  onClick={() => handleShare('viber')}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 px-4 bg-[#7360f2] hover:bg-[#6655d8] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                   {isGeneratingPdf ? <span className="animate-spin text-xl">⏳</span> : <Icons.MessageSquare className="w-5 h-5" />}
                   Viber
                </button>

                <button 
                  onClick={() => handleShare('download')}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                   <Icons.Download className="w-5 h-5" />
                   Samo preuzmi PDF
                </button>
             </div>
          </div>
      )}

      {/* Header */}
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
                onClick={() => setShowShareModal(true)}
                className="p-2 text-gold-600 hover:bg-gold-50 rounded-full transition-colors"
                title="Podeli PDF"
              >
                <Icons.Share className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Cover Image */}
        <div className="relative h-64 w-full bg-gray-200">
           {lesson.images[0] ? (
             <img src={lesson.images[0].url} alt="Cover" className="w-full h-full object-cover" />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-gold-100 text-gold-400">
                <Icons.Anatomy className="w-16 h-16 opacity-50" />
             </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
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
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-white shadow-sm">
                  {lesson.content.title}
                </h1>
              )}
           </div>
        </div>

        {/* Audio Player (Fixed below header/image) */}
        {audioSrc && (
          <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 shadow-sm">
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
                className="w-10 h-10 flex items-center justify-center bg-gold-500 text-white rounded-full hover:bg-gold-600 transition-colors shadow"
              >
                {isPlaying ? <Icons.Pause className="w-5 h-5" /> : <Icons.Play className="w-5 h-5 ml-1" />}
              </button>
              <div className="flex-1 flex flex-col justify-center">
                 <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8 pb-32">
          
          {/* Introduction */}
          {renderSection("Uvod", "introduction")}

          {/* Anatomy */}
          {renderSection("Anatomija", "anatomy", 1, lesson.content.imagePrompts?.[1])}

          {/* Technique / Physiology */}
          {renderSection("Fiziologija / Procedura", "technique", 2, lesson.content.imagePrompts?.[2])}

          {/* Risks / Pathology */}
          {renderSection("Patologija / Komplikacije", "risks", 3, lesson.content.imagePrompts?.[3])}

          {/* Aftercare / Therapy */}
          {renderSection("Terapija / Zaključak", "aftercare", 4, lesson.content.imagePrompts?.[4])}

        </div>
      </div>
    </div>
  );
};

export default LessonView;
