
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Recorder from './components/Recorder';
import LoadingView from './components/LoadingView';
import LessonView from './components/LessonView';
import AiTerminal from './components/AiTerminal';
import CameraCapture from './components/CameraCapture';
import { generateLessonFromAudio, generateMedicalImage, generateLessonFromImage } from './services/geminiService';
import { saveLessonToDB, deleteLessonFromDB, getAllLessonsFromDB } from './services/storageService';
import { Lesson, AppState, LessonContent, AiAction } from './types';

const App = () => {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.DASHBOARD);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadLessons = async () => {
      try {
        const loadedLessons = await getAllLessonsFromDB();
        setLessons(loadedLessons);
      } catch (e) {
        console.error("Failed to load lessons from DB", e);
        setDbError(true);
      }
    };
    loadLessons();
  }, []);

  // Helper to refresh list
  const refreshLessons = async () => {
    try {
      const loadedLessons = await getAllLessonsFromDB();
      setLessons(loadedLessons);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordingComplete = async (base64Audio: string, mimeType: string) => {
    setAppState(AppState.GENERATING);
    setLoadingStatus('Transkripcija audio zapisa...');

    try {
      // 1. Generate Text Structure
      setLoadingStatus('Analiza medicinskih pojmova...');
      const content = await generateLessonFromAudio(base64Audio, mimeType);
      
      setLoadingStatus('Kreiranje web stranice...');
      
      const newLesson: Lesson = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        content: content,
        images: [], 
        audioDurationSec: 0,
        audioBase64: base64Audio,
        audioMimeType: mimeType
      };

      // 2. Generate cover image
      setLoadingStatus('Generisanje naslovne slike...');
      try {
         const coverPrompt = content.imagePrompts[0] || 'Medical aesthetic clinic professional';
         const coverUrl = await generateMedicalImage(coverPrompt);
         newLesson.images[0] = { prompt: coverPrompt, url: coverUrl };
      } catch (e) {
         console.error("Auto image gen failed", e);
      }

      // Save to DB
      await saveLessonToDB(newLesson);
      await refreshLessons();
      
      setCurrentLesson(newLesson);
      setAppState(AppState.VIEWING);

    } catch (error) {
      console.error(error);
      alert("Došlo je do greške prilikom generisanja. Molimo pokušajte ponovo.");
      setAppState(AppState.DASHBOARD);
    }
  };

  const handleImageCapture = async (base64Images: string[]) => {
    setAppState(AppState.GENERATING);
    setLoadingStatus(`Analiza ${base64Images.length} slika...`);

    try {
      const content = await generateLessonFromImage(base64Images);
      
      const newLesson: Lesson = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        content: content,
        images: [],
        audioDurationSec: 0
        // No audio for image capture
      };

      // Generate cover
      setLoadingStatus('Generisanje dijagrama...');
      try {
         const coverPrompt = content.imagePrompts[0] || 'Medical anatomy diagram';
         const coverUrl = await generateMedicalImage(coverPrompt);
         newLesson.images[0] = { prompt: coverPrompt, url: coverUrl };
      } catch (e) { console.error(e); }

      await saveLessonToDB(newLesson);
      await refreshLessons();

      setCurrentLesson(newLesson);
      setAppState(AppState.VIEWING);

    } catch (error) {
       console.error(error);
       alert("Greška pri analizi slike.");
       setAppState(AppState.DASHBOARD);
    }
  };

  const handleGenerateImage = async (prompt: string, index: number) => {
    if (!currentLesson) return;
    setIsGeneratingImage(true);
    
    try {
        const url = await generateMedicalImage(prompt);
        
        const updatedLesson = { ...currentLesson };
        updatedLesson.images[index] = { prompt, url };
        
        // Save update to DB
        await saveLessonToDB(updatedLesson);
        await refreshLessons();
        
        setCurrentLesson(updatedLesson);
    } catch (error) {
        console.error("Image gen error", error);
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleUpdateLesson = async (updatedLesson: Lesson) => {
     try {
       await saveLessonToDB(updatedLesson);
       await refreshLessons();
       setCurrentLesson(updatedLesson);
     } catch (e) {
       console.error("Failed to update lesson", e);
       alert("Greška pri čuvanju izmena.");
     }
  };

  const handleDeleteLesson = async (id: string) => {
    if(confirm('Da li ste sigurni da želite da obrišete ovu lekciju?')) {
        try {
          await deleteLessonFromDB(id);
          await refreshLessons();
          if (currentLesson?.id === id) {
              setAppState(AppState.DASHBOARD);
              setCurrentLesson(null);
          }
        } catch (e) {
          console.error("Failed to delete", e);
        }
    }
  };

  const handleAiAction = (action: AiAction) => {
    switch(action.type) {
      case 'NAVIGATE':
        if (action.payload?.target === 'RECORDING') setAppState(AppState.RECORDING);
        if (action.payload?.target === 'DASHBOARD') setAppState(AppState.DASHBOARD);
        if (action.payload?.target === 'CAMERA') setAppState(AppState.CAMERA);
        break;
      
      case 'UPDATE_SECTION':
        if (currentLesson && action.payload?.section && action.payload?.content) {
           const updatedContent = { ...currentLesson.content, [action.payload.section]: action.payload.content };
           const updatedLesson = { ...currentLesson, content: updatedContent };
           handleUpdateLesson(updatedLesson);
        }
        break;
        
      default:
        console.log("Unknown AI Action", action);
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.DASHBOARD:
        return (
          <Dashboard 
            lessons={lessons}
            onNewLesson={() => setAppState(AppState.RECORDING)}
            onScan={() => setAppState(AppState.CAMERA)}
            onSelectLesson={(lesson) => {
              setCurrentLesson(lesson);
              setAppState(AppState.VIEWING);
            }}
            onDeleteLesson={handleDeleteLesson}
          />
        );
      case AppState.RECORDING:
        return (
          <Recorder 
            onRecordingComplete={handleRecordingComplete}
            onCancel={() => setAppState(AppState.DASHBOARD)}
          />
        );
      case AppState.CAMERA:
        return (
          <CameraCapture
            onCapture={handleImageCapture}
            onCancel={() => setAppState(AppState.DASHBOARD)}
          />
        );
      case AppState.GENERATING:
        return <LoadingView status={loadingStatus} />;
      case AppState.VIEWING:
        if (!currentLesson) return null;
        return (
          <LessonView 
            lesson={currentLesson}
            onBack={() => setAppState(AppState.DASHBOARD)}
            onGenerateImage={handleGenerateImage}
            onUpdateLesson={handleUpdateLesson}
            isGeneratingImage={isGeneratingImage}
          />
        );
      default:
        return <div>Unknown State</div>;
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-gray-50 flex items-center justify-center font-sans text-slate-800">
      <div className="w-full h-full max-w-md md:max-w-4xl bg-white shadow-2xl md:rounded-2xl overflow-hidden relative flex flex-col">
        {/* Error Banner */}
        {dbError && (
          <div className="bg-red-50 border-b border-red-100 text-red-600 px-4 py-2 text-xs font-medium text-center z-50">
             ⚠️ Greška sa bazom podataka. Proverite dozvole pregledača.
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative w-full h-full">
            {renderContent()}
        </div>

        {/* AI Terminal Overlay - Hidden in Camera Mode */}
        {appState !== AppState.CAMERA && (
          <AiTerminal 
            appState={appState} 
            currentLesson={currentLesson ? currentLesson.content : null}
            onAction={handleAiAction}
          />
        )}
      </div>
    </div>
  );
};

export default App;
