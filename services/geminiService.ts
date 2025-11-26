
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LessonContent, AppState, AiMessage, AiAction } from "../types";

// Ensure API Key is available
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const LESSON_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The professional medical title of the lesson/organ/system in Serbian" },
    introduction: { type: Type.STRING, description: "Overview/Definition of the organ, system, or procedure in Serbian" },
    anatomy: { type: Type.STRING, description: "Detailed structural anatomy (location, parts, layers) in Serbian" },
    technique: { type: Type.STRING, description: "Physiology (how it works) OR Procedure Technique (how to treat) in Serbian" },
    risks: { type: Type.STRING, description: "Pathology (diseases), Clinical signs, OR Complications/Risks in Serbian" },
    aftercare: { type: Type.STRING, description: "Treatment options, Therapy, OR Patient Aftercare in Serbian" },
    imagePrompts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 distinct, detailed prompts in English for medical scientific illustrations. 1. Main Organ/System View, 2. Detailed Anatomy/Cross-section, 3. Functional/Action View, 4. Pathology/Problem View, 5. Treatment/Healing View."
    }
  },
  required: ["title", "introduction", "anatomy", "technique", "risks", "aftercare", "imagePrompts"],
};

// Schema for AI Assistant Response
const CHAT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING, description: "Conversational response in Serbian." },
    suggestions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "2-3 short suggested user responses or next steps in Serbian." 
    },
    action: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        type: { type: Type.STRING, enum: ['UPDATE_SECTION', 'NAVIGATE', 'GENERATE_IMAGE', 'NONE'] },
        label: { type: Type.STRING, description: "Button label for the action (e.g., 'Ažuriraj Anatomiju')" },
        payload: {
          type: Type.OBJECT,
          properties: {
            section: { type: Type.STRING, enum: ['title', 'introduction', 'anatomy', 'technique', 'risks', 'aftercare'] },
            content: { type: Type.STRING, description: "The FULL content for the section if updating (merge old + new)." },
            target: { type: Type.STRING, description: "Target screen if navigating (e.g., RECORDING)" }
          }
        }
      }
    }
  },
  required: ["message"]
};

export const generateLessonFromAudio = async (base64Audio: string, mimeType: string): Promise<LessonContent> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `
              You are an expert Medical Educator & Anatomist.
              Listen to the audio recording in Serbian (or Balkan languages).
              
              Task: Create a structured medical lesson.
              Context: The user might talk about General Human Anatomy (e.g., The Heart, The Brain, Skeleton) OR Aesthetic Medicine (e.g., Botox).
              
              Mapping Rules:
              - Title: Name of the Organ, System, or Procedure.
              - Introduction: Definition and overview.
              - Anatomy: Structure, location, relations, layers.
              - Technique: 
                 * If Anatomy topic: Describe Physiology (Function).
                 * If Procedure topic: Describe the Technique/Steps.
              - Risks: 
                 * If Anatomy topic: Describe Pathology (Common diseases).
                 * If Procedure topic: Describe Complications/Risks.
              - Aftercare: 
                 * If Anatomy topic: Describe Treatment/Therapy options.
                 * If Procedure topic: Describe Aftercare.
              
              Output Language: Serbian.
              Image Prompts: 5 Detailed English prompts for scientific medical illustrations (Netter style).
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: LESSON_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as LessonContent;
  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw error;
  }
};

export const generateLessonFromImage = async (base64Images: string[]): Promise<LessonContent> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    // Construct parts from multiple images
    const parts: any[] = base64Images.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img,
      }
    }));

    // Add text prompt
    parts.push({
      text: `
        You are an expert Medical Educator.
        Analyze the medical textbook page(s), diagram(s), or photo(s) provided.
        
        Task: Create a structured medical lesson based on the visual content from ALL images.
        Output Language: Serbian.
        
        Mapping Rules:
        - Title: Main topic visible.
        - Introduction: Overview of the subject.
        - Anatomy: Structural details visible or inferred.
        - Technique: Functional or procedural details.
        - Risks: Pathology or clinical relevance.
        - Aftercare: Clinical management or summary.
        
        Image Prompts: 5 Detailed English prompts for scientific medical illustrations.
      `
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: LESSON_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as LessonContent;
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error;
  }
};

export const generateMedicalImage = async (prompt: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a high-quality, scientific medical illustration. White background. Educational, detailed, anatomical accuracy. Style: Clean, Modern Medical Diagram. Subject: ${prompt}` }
        ]
      },
      config: {
        // No specific config needed for simple generation
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
         return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return `https://picsum.photos/800/600?random=${Math.random()}`;

  } catch (error) {
    console.error("Image Gen Error:", error);
    return "https://picsum.photos/800/600";
  }
};

export const chatWithAi = async (
  history: AiMessage[], 
  appState: AppState, 
  currentLessonContext: LessonContent | null,
  userText?: string,
  userAudioBase64?: string
): Promise<{ message: string, suggestions: string[], action?: AiAction }> => {
  
  if (!apiKey) throw new Error("API Key missing");

  // Summarize lesson context for the AI
  const contextStr = currentLessonContext 
    ? `
      CURRENT TOPIC: ${currentLessonContext.title}
      Anatomy/Structure: ${currentLessonContext.anatomy}
      Physiology/Technique: ${currentLessonContext.technique}
      Pathology/Risks: ${currentLessonContext.risks}
      `
    : "User is in Dashboard. No lesson selected.";

  const parts: any[] = [
    { text: `
      ROLE: You are a Senior Medical Professor (Anatomy & Clinical Practice).
      LANGUAGE: Serbian (Latin script).
      
      GOAL: 
      1. Help the user create medical training content.
      2. If discussing general anatomy (e.g., "Srce"), focus on structure, valves, blood flow.
      3. If discussing aesthetics/procedures, focus on safety and technique.
      4. Suggest missing medical details proactively (e.g., "Should we add the blood supply?" or "Explain the innervation?").
      
      APP STATE: ${appState}
      ${contextStr}
    ` }
  ];

  if (userAudioBase64) {
    parts.push({
      inlineData: {
        mimeType: 'audio/webm',
        data: userAudioBase64
      }
    });
  }

  if (userText) {
    parts.push({ text: userText });
  }

  // Add recent conversation history
  const recentHistory = history.slice(-5).map(msg => `${msg.role}: ${msg.text}`).join('\n');
  if (recentHistory) {
      parts.push({ text: `CONVERSATION HISTORY:\n${recentHistory}` });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: CHAT_SCHEMA,
        systemInstruction: `
          You are a helpful AI Medical Assistant. 
          Always be scientifically accurate.
        `
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Chat Error:", error);
    return {
      message: "Izvinite, došlo je do greške. Pokušajte ponovo.",
      suggestions: ["Pokušaj ponovo"]
    };
  }
};
