import { query } from '../../db.js'

export const getOpenGrievancesDeclaration = {
  name: 'get_open_grievances',
  description: 'Retrieves active complaints, worker disputes, and safety hazards logged across sites, with operational category and urgency ratings.',
  parameters: {
    type: 'OBJECT',
    properties: {
      category: {
        type: 'STRING',
        description: 'Optional operational category filter: WORKPLACE_SAFETY, HARASSMENT, WAGE_COMPLIANCE, HOUSING_FACILITY, or OPERATIONAL',
      },
    },
  },
}

export async function getOpenGrievances({ category = null } = {}) {
  let sql = `
    SELECT g.*, e.name as employee_name, e.employee_code, s.name as site_name
    FROM grievances g
    JOIN employees e ON e.id = g.employee_id
    LEFT JOIN sites s ON s.id = e.site_id
    WHERE g.status IN ('OPEN', 'IN_REVIEW', 'INVESTIGATING')
  `
  const params = []
  if (category) {
    params.push(`%${category.toLowerCase()}%`)
    sql += ` AND LOWER(g.type) LIKE $${params.length}`
  }
  sql += ` ORDER BY g.created_at DESC`

  const res = await query(sql, params)
  return {
    totalOpenGrievances: res.rows.length,
    categoryFilterApplied: category || 'All Categories',
    grievances: res.rows.map(g => ({
      id: g.id,
      employeeName: g.employee_name,
      employeeCode: g.employee_code,
      site: g.site_name || 'Unassigned',
      reportedCategory: g.type,
      statement: g.description,
      status: g.status,
      filedAt: g.created_at,
    })),
  }
}
