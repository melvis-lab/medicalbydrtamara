
import React, { useRef, useState, useEffect } from 'react';
import { Lesson, LessonContent } from '../types';
import { Icons } from './Icons';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

  const generateHighQualityPdf = async (): Promise<File> => {
    const input = document.getElementById('lesson-print-container');
    if (!input) throw new Error("Print container not found");

    // Capture visual state
    const canvas = await html2canvas(input, {
      scale: 2, // Retina quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output('blob');
    const fileName = `${lesson.content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  const handleShare = async () => {
    setIsGeneratingPdf(true);
    try {
        const file = await generateHighQualityPdf();

        // Native Sharing (Mobile)
        if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: lesson.content.title,
                text: `Pogledaj lekciju: ${lesson.content.title}`,
            });
        } else {
            // Fallback for desktop: Download
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
            alert("PDF je preuzet jer vaš pretraživač ne podržava direktno deljenje.");
        }
    } catch (e) {
        console.error("PDF/Share error", e);
        alert("Došlo je do greške prilikom generisanja ili deljenja PDF-a.");
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
      <section className="mb-8 animate-in slide-in-from-bottom-4 duration-500 break-inside-avoid">
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
          <div className="prose prose-slate max-w-none text-gray-600 whitespace-pre-line leading-relaxed text-justify">
            {lesson.content[field] as string}
          </div>
        )}

        {/* Image Display */}
        {hasImage && (
          <div className="mt-4 rounded-xl overflow-hidden shadow-lg border border-gray-100 relative group">
             <img 
               src={lesson.images[imageIndex!]?.url} 
               alt={`${title} illustration`}
               className="w-full h-auto object-cover max-h-96" 
               crossOrigin="anonymous" // Important for html2canvas
             />
             {/* Regenerate Button Overlay */}
             {!isEditing && imagePrompt && (
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
      
      {/* Header - Not Captured in PDF */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/90 backdrop-blur sticky top-0 z-20 shadow-sm print:hidden">
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

      <div className="flex-1 overflow-y-auto bg-gray-50">
        
        {/* PRINTABLE CONTAINER */}
        <div id="lesson-print-container" className="bg-white">
            
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
            {renderSection("Uvod", "introduction")}

            {/* Anatomy */}
            {renderSection("Anatomija", "anatomy", 1, lesson.content.imagePrompts?.[1])}

            {/* Technique / Physiology */}
            {renderSection("Fiziologija / Procedura", "technique", 2, lesson.content.imagePrompts?.[2])}

            {/* Risks / Pathology */}
            {renderSection("Patologija / Komplikacije", "risks", 3, lesson.content.imagePrompts?.[3])}

            {/* Aftercare / Therapy */}
            {renderSection("Terapija / Zaključak", "aftercare", 4, lesson.content.imagePrompts?.[4])}

            {/* Footer for PDF */}
            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm font-serif italic">
                Generisano pomoću MediBuilder AI
            </div>

            </div>
        </div>
      </div>

       {/* Audio Player (Fixed below header/image) - Outside Print Container */}
       {audioSrc && !isEditing && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
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
    </div>
  );
};

export default LessonView;
