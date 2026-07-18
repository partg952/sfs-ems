import { lookupEmployee, lookupEmployeeDeclaration } from './employeeTools.js'
import { getWorkforceSummary, getWorkforceSummaryDeclaration } from './workforceTools.js'
import { scanOvertimeAndFatigue, scanOvertimeAndFatigueDeclaration } from './overtimeTools.js'
import { scanAdvancesAndDebt, scanAdvancesAndDebtDeclaration } from './advanceTools.js'
import { getOpenGrievances, getOpenGrievancesDeclaration } from './grievanceTools.js'
import { simulateRiskImpact, simulateRiskImpactDeclaration } from './simulationTools.js'

export const toolRegistry = {
  lookup_employee: {
    declaration: lookupEmployeeDeclaration,
    execute: lookupEmployee,
  },
  get_workforce_summary: {
    declaration: getWorkforceSummaryDeclaration,
    execute: getWorkforceSummary,
  },
  scan_overtime_and_fatigue: {
    declaration: scanOvertimeAndFatigueDeclaration,
    execute: scanOvertimeAndFatigue,
  },
  scan_advances_and_debt: {
    declaration: scanAdvancesAndDebtDeclaration,
    execute: scanAdvancesAndDebt,
  },
  get_open_grievances: {
    declaration: getOpenGrievancesDeclaration,
    execute: getOpenGrievances,
  },
  simulate_risk_impact: {
    declaration: simulateRiskImpactDeclaration,
    execute: simulateRiskImpact,
  },
}

function toOpenAISchema(schema) {
  if (!schema || typeof schema !== 'object') return schema
  const res = Array.isArray(schema) ? [] : {}
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'type' && typeof v === 'string') {
      res[k] = v.toLowerCase()
    } else if (typeof v === 'object' && v !== null) {
      res[k] = toOpenAISchema(v)
    } else {
      res[k] = v
    }
  }
  return res
}

export function getOpenAIToolDeclarations() {
  return Object.values(toolRegistry).map(t => ({
    type: 'function',
    function: {
      name: t.declaration.name,
      description: t.declaration.description,
      parameters: toOpenAISchema(t.declaration.parameters),
    },
  }))
}

export function getGeminiToolDeclarations() {
  return [
    {
      functionDeclarations: Object.values(toolRegistry).map(t => t.declaration),
    },
  ]
}

export async function executeTool(toolName, args = {}) {
  const tool = toolRegistry[toolName]
  if (!tool) {
    return { error: `Unknown tool: '${toolName}'` }
  }
  try {
    return await tool.execute(args)
  } catch (err) {
    return { error: `Execution error in '${toolName}': ${err.message}` }
  }
}

export {
  lookupEmployee,
  getWorkforceSummary,
  scanOvertimeAndFatigue,
  scanAdvancesAndDebt,
  getOpenGrievances,
  simulateRiskImpact,
}
