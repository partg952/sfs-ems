import {
  ReactAgent,
  lookupEmployee,
  getWorkforceSummary,
  scanOvertimeAndFatigue,
  scanAdvancesAndDebt,
  getOpenGrievances,
  simulateRiskImpact,
} from '../ai/index.js'

export class CopilotService {
  static async executeReActLoop(question, history = []) {
    return await ReactAgent.execute(question, history)
  }

  static async toolLookupEmployee(args) {
    return await lookupEmployee(args)
  }

  static async toolGetWorkforceSummary(args) {
    return await getWorkforceSummary(args)
  }

  static async toolScanOvertimeAndFatigue(args) {
    return await scanOvertimeAndFatigue(args)
  }

  static async toolScanAdvancesAndDebt(args) {
    return await scanAdvancesAndDebt(args)
  }

  static async toolGetOpenGrievances(args) {
    return await getOpenGrievances(args)
  }

  static async toolSimulateRiskImpact(args) {
    return await simulateRiskImpact(args)
  }
}
