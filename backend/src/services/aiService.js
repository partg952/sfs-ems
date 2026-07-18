import { RiskScoringService, GrievanceNLPService } from '../ai/index.js'

export class AIService {
  static calculateRiskProfile(...args) {
    return RiskScoringService.calculateRiskProfile(...args)
  }

  static async analyzeWorkforce(forceRefresh = false) {
    return await RiskScoringService.analyzeWorkforce(forceRefresh)
  }

  static simulateRisk(req) {
    return RiskScoringService.simulateRisk(req)
  }

  static async analyzeGrievanceNLP(id, empName, text, originalType) {
    return await GrievanceNLPService.analyzeGrievance(id, empName, text, originalType)
  }
}
