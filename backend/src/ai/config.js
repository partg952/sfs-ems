import dotenv from 'dotenv'
dotenv.config()

export const aiConfig = {
  openrouterApiKey:
    process.env.OPENROUTER_API_KEY ||
    (process.env.GEMINI_API_KEY?.startsWith('sk-or-') ? process.env.GEMINI_API_KEY : '') ||
    (process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? process.env.OPENAI_API_KEY : '') ||
    '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  model:
    process.env.OPENROUTER_MODEL ||
    process.env.AI_MODEL ||
    process.env.GEMINI_MODEL ||
    process.env.OPENAI_MODEL ||
    'google/gemini-2.5-flash',
  maxReActSteps: parseInt(process.env.REACT_MAX_STEPS || '5', 10),
  cacheTTL: {
    workforceInsights: parseInt(process.env.CACHE_TTL_WORKFORCE_SEC || '60', 10),
    grievanceNLP: parseInt(process.env.CACHE_TTL_GRIEVANCE_SEC || '300', 10),
  },
}
