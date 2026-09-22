import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else if (import.meta.env.DEV) {
  console.warn("[Gemini] VITE_GEMINI_API_KEY manquante — fonctionnalité IA désactivée en dev");
}

export async function askGemini(prompt: string) {
  if (!ai) {
    throw new Error("Clé API Gemini non configurée (VITE_GEMINI_API_KEY).");
  }
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}