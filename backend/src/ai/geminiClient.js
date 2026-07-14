import { GoogleGenerativeAI } from '@google/generative-ai'
import { aiConfig } from './config.js'

let genAI = null

export function isGeminiConfigured() {
  return Boolean(aiConfig.geminiApiKey && aiConfig.geminiApiKey.trim().length > 0)
}

export function getGeminiClient() {
  if (!isGeminiConfigured()) {
    return null
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(aiConfig.geminiApiKey)
  }
  return genAI
}

export function getGenerativeModel(options = {}) {
  const client = getGeminiClient()
  if (!client) return null

  return client.getGenerativeModel({
    model: options.model || aiConfig.geminiModel,
    systemInstruction: options.systemInstruction,
    tools: options.tools,
    generationConfig: options.generationConfig || {
      temperature: 0.2,
      topP: 0.8,
    },
  })
}
