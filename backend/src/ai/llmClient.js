import OpenAI from 'openai'
import { aiConfig } from './config.js'

let clientInstance = null
let quotaExhaustedUntil = 0
let quotaExhaustedReason = ''
let quotaWarningLogged = false

export function isQuotaExhausted() {
  return Date.now() < quotaExhaustedUntil
}

export function markQuotaExhausted(retryAfterMs = 60000, reason = 'Free tier limit reached') {
  quotaExhaustedUntil = Date.now() + retryAfterMs
  quotaExhaustedReason = reason
  if (!quotaWarningLogged) {
    console.info(` [AI Subsystem] External LLM API rate limit / quota ceiling reached. Seamlessly utilizing on-premise Re-Act engine.`)
    quotaWarningLogged = true
  }
}

export function resetQuotaStatus() {
  quotaExhaustedUntil = 0
  quotaWarningLogged = false
}

/**
 * Returns dynamic configuration based on available API keys.
 * Supports Google Gemini (via official OpenAI-compatible endpoint) and native OpenAI.
 */
export function getLLMProviderConfig() {
  if (isQuotaExhausted()) {
    return {
      provider: 'On-Premise Re-Act Agent Engine (API Quota Cooldown)',
      providerType: 'local',
      apiKey: '',
      baseURL: '',
      model: 'local-deterministic-v1',
      configured: false,
      quotaExhausted: true,
      cooldownSeconds: Math.ceil((quotaExhaustedUntil - Date.now()) / 1000),
    }
  }

  // 1. OpenRouter (Multi-model gateway, e.g. google/gemini-2.5-flash)
  if (aiConfig.openrouterApiKey && aiConfig.openrouterApiKey.trim().length > 0) {
    let model = aiConfig.openrouterModel || aiConfig.model || 'google/gemini-2.5-flash'
    if (!model.includes('/') && model.toLowerCase().includes('gemini')) {
      model = `google/${model}`
    }
    return {
      provider: 'OpenRouter (Gemini 2.5 Flash)',
      providerType: 'openrouter',
      apiKey: aiConfig.openrouterApiKey.trim(),
      baseURL: aiConfig.openrouterBaseUrl || 'https://openrouter.ai/api/v1',
      model,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Shreeji Facility Services EMS',
      },
      configured: true,
      quotaExhausted: false,
    }
  }

  // 2. Google Gemini direct via OpenAI endpoint
  if (aiConfig.geminiApiKey && aiConfig.geminiApiKey.trim().length > 0 && !aiConfig.geminiApiKey.startsWith('sk-or-')) {
    return {
      provider: 'Google Gemini (OpenAI SDK)',
      providerType: 'gemini',
      apiKey: aiConfig.geminiApiKey.trim(),
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: aiConfig.model || aiConfig.geminiModel || 'gemini-1.5-flash',
      configured: true,
      quotaExhausted: false,
    }
  }

  // 3. OpenAI official API or custom base URL
  if (aiConfig.openaiApiKey && aiConfig.openaiApiKey.trim().length > 0 && !aiConfig.openaiApiKey.startsWith('sk-or-')) {
    return {
      provider: 'OpenAI',
      providerType: 'openai',
      apiKey: aiConfig.openaiApiKey.trim(),
      baseURL: aiConfig.openaiBaseUrl || 'https://api.openai.com/v1',
      model: aiConfig.model || aiConfig.openaiModel || 'gpt-4o-mini',
      configured: true,
      quotaExhausted: false,
    }
  }

  // 4. On-Premise Deterministic Engine
  return {
    provider: 'On-Premise Re-Act Agent Engine',
    providerType: 'local',
    apiKey: '',
    baseURL: '',
    model: 'local-deterministic-v1',
    configured: false,
    quotaExhausted: false,
  }
}

export function isLLMConfigured() {
  if (isQuotaExhausted()) return false
  return getLLMProviderConfig().configured
}

export function getOpenAIClient() {
  const conf = getLLMProviderConfig()
  if (!conf.configured) {
    return null
  }
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: conf.apiKey,
      baseURL: conf.baseURL,
      defaultHeaders: conf.defaultHeaders || undefined,
    })
  }
  return clientInstance
}

// Backward compatibility aliases
export const isGeminiConfigured = isLLMConfigured
export const getGeminiClient = getOpenAIClient
