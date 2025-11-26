
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { AiMessage, AppState, LessonContent, AiAction } from '../types';
import { chatWithAi } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';

interface AiTerminalProps {
  appState: AppState;
  currentLesson: LessonContent | null;
  onAction: (action: AiAction) => void;
}

const AiTerminal: React.FC<AiTerminalProps> = ({ appState, currentLesson, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (messages.length === 0) {
      const greeting = appState === AppState.DASHBOARD 
        ? "Pozdrav! Ja sam tvoj AI asistent. Želiš li da kreiramo novu lekciju?"
        : "Kako mogu da ti pomognem da poboljšaš ovu lekciju? Mogu dodati tekst ili generisati slike.";
      
      setMessages([{
        id: 'init',
        role: 'ai',
        text: greeting,
        suggestions: appState === AppState.DASHBOARD 
          ? ["Nova lekcija", "Kako ovo radi?"] 
          : ["Dodaj detalje u Anatomiju", "Proširi Uvod"]
      }]);
    }
  }, [appState]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text?: string, audioBase64?: string) => {
    const userMsgText = text || (audioBase64 ? "Audio poruka..." : "");
    if (!userMsgText) return;

    const newMessage: AiMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatWithAi(messages, appState, currentLesson, text, audioBase64);
      
      const aiMsg: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.message,
        action: response.action,
        suggestions: response.suggestions
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Greška u povezivanju." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        handleSendMessage(undefined, base64);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-slate-800 to-slate-900 text-gold-400 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 border-2 border-gold-500/30"
        >
          <Icons.Chat className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
          </span>
        </button>
      )}

      {/* Terminal Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden font-sans">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Icons.Sparkles className="w-5 h-5 text-gold-400" />
              <span className="font-bold tracking-wide">AI Asistent</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <Icons.Close className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                
                {/* AI Action Button */}
                {msg.role === 'ai' && msg.action && msg.action.type !== 'NONE' && (
                  <button 
                    onClick={() => onAction(msg.action!)}
                    className="mt-2 text-xs flex items-center gap-1 bg-gold-50 text-gold-700 border border-gold-200 px-3 py-2 rounded-lg hover:bg-gold-100 transition-colors"
                  >
                    <Icons.Magic className="w-3 h-3" />
                    {msg.action.label || "Primeni izmenu"}
                  </button>
                )}

                {/* AI Suggestions Chips */}
                {msg.role === 'ai' && msg.suggestions && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((sug, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSendMessage(sug)}
                        disabled={isLoading}
                        className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-xs p-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                AI razmišlja...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage(inputText)}
                placeholder="Piši ili snimi poruku..."
                disabled={isLoading}
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-gold-400 focus:outline-none disabled:opacity-50"
              />
              
              {inputText ? (
                <button 
                  onClick={() => handleSendMessage(inputText)}
                  disabled={isLoading}
                  className="p-2 bg-gold-500 text-white rounded-full hover:bg-gold-600 transition-colors disabled:opacity-50"
                >
                  <Icons.Send className="w-5 h-5" />
                </button>
              ) : (
                 <button 
                  onMouseDown={!isLoading ? startRecording : undefined}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={!isLoading ? startRecording : undefined}
                  onTouchEnd={stopRecording}
                  disabled={isLoading}
                  className={`p-2 rounded-full transition-all disabled:opacity-50 ${
                    isRecording 
                      ? 'bg-red-500 text-white scale-110 shadow-lg animate-pulse' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <Icons.Mic className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="text-[10px] text-center text-gray-400 mt-2">
              {isRecording ? "Slušam... (Pusti da pošalješ)" : "Drži mikrofon za govor"}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiTerminal;
