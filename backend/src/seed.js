import bcrypt from 'bcryptjs'
import { query } from './db.js'

export async function seedDefaultUsers() {
  const users = [
    { username: 'admin', password: 'admin123', fullName: 'System Administrator', role: 'SUPER_ADMIN' },
    { username: 'hr_manager', password: 'hr123', fullName: 'HR Manager', role: 'HR_MANAGER' },
    { username: 'hr_staff', password: 'staff123', fullName: 'HR Staff', role: 'HR_STAFF' },
    { username: 'accounts', password: 'acc123', fullName: 'Accounts User', role: 'ACCOUNTS' },
    { username: 'viewer', password: 'view123', fullName: 'Viewer', role: 'VIEWER' },
  ]

  for (const u of users) {
    const existing = await query('SELECT id FROM app_users WHERE username = $1', [u.username])
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10)
      await query(
        'INSERT INTO app_users (username, password, full_name, role, is_active) VALUES ($1, $2, $3, $4, true)',
        [u.username, hash, u.fullName, u.role]
      )
      console.log(`Default ${u.role} user initialized: ${u.username}`)
    }
  }
}

export async function seedDemoData() {
  const clientCheck = await query('SELECT count(*) FROM clients')
  if (parseInt(clientCheck.rows[0].count, 10) > 0) {
    return // Already seeded
  }

  console.log('🌱 Seeding initial Shreeji Facility Services demo dataset...')

  // 1. Clients
  const c1 = await query(`
    INSERT INTO clients (name, contact_person, contact_phone, contact_email, address, billing_rate, is_active)
    VALUES ('Adani Hazira Port Ltd', 'R. K. Mehta', '9825012345', 'mehta.rk@adani.com', 'Hazira Industrial Belt, Surat', 450000, true) RETURNING id
  `)
  const c2 = await query(`
    INSERT INTO clients (name, contact_person, contact_phone, contact_email, address, billing_rate, is_active)
    VALUES ('Surat Diamond Bourse (SDB)', 'Nilesh Shah', '9879054321', 'admin@sdb.org', 'DREAM City, Khajod, Surat', 680000, true) RETURNING id
  `)
  const c3 = await query(`
    INSERT INTO clients (name, contact_person, contact_phone, contact_email, address, billing_rate, is_active)
    VALUES ('Reliance Retail Hub', 'Pooja Trivedi', '9712098765', 'facility@reliance.com', 'Dumas Road, Surat', 320000, true) RETURNING id
  `)

  const c1Id = c1.rows[0].id
  const c2Id = c2.rows[0].id
  const c3Id = c3.rows[0].id

  // 2. Sites
  const s1 = await query(`
    INSERT INTO sites (client_id, name, address, supervisor_name, supervisor_phone, is_active)
    VALUES ($1, 'Hazira Marine Gate Post', 'Gate 4, Marine Terminal, Hazira', 'Ramesh Patel', '9825111111', true) RETURNING id
  `, [c1Id])
  const s2 = await query(`
    INSERT INTO sites (client_id, name, address, supervisor_name, supervisor_phone, is_active)
    VALUES ($1, 'SDB Tower B & Vault Access', 'Tower B, Surat Diamond Bourse', 'Digvijay Jadeja', '9825222222', true) RETURNING id
  `, [c2Id])
  const s3 = await query(`
    INSERT INTO sites (client_id, name, address, supervisor_name, supervisor_phone, is_active)
    VALUES ($1, 'VR Retail Hypermarket', 'Ground Floor, VR Mall, Dumas Road', 'Arun Kulkarni', '9825333333', true) RETURNING id
  `, [c3Id])

  const s1Id = s1.rows[0].id
  const s2Id = s2.rows[0].id
  const s3Id = s3.rows[0].id

  // 3. Shifts
  await query(`
    INSERT INTO shifts (name, start_time, end_time, is_night_shift)
    VALUES 
      ('Morning General', '08:00', '16:00', false),
      ('Evening Vigil', '16:00', '00:00', false),
      ('Night Perimeter Security', '00:00', '08:00', true);
  `)

  // 4. Employees
  const e1 = await query(`
    INSERT INTO employees (employee_code, name, designation, site_id, daily_wage, monthly_wage, status, joining_date, mobile_number, address, esic_number, epf_number)
    VALUES ('SFS-0101', 'Ramesh Patel', 'Security Supervisor', $1, 950, 24700, 'ACTIVE', '2024-03-01', '9825000101', 'Adajan, Surat', 'ESIC10001', 'EPF10001') RETURNING id
  `, [s1Id])

  const e2 = await query(`
    INSERT INTO employees (employee_code, name, designation, site_id, daily_wage, monthly_wage, status, joining_date, mobile_number, address, esic_number, epf_number)
    VALUES ('SFS-0102', 'Suresh Bhai Varma', 'Armed Security Guard', $1, 700, 18200, 'ACTIVE', '2025-06-15', '9825000102', 'Udhna, Surat', 'ESIC10002', 'EPF10002') RETURNING id
  `, [s1Id])

  const e3 = await query(`
    INSERT INTO employees (employee_code, name, designation, site_id, daily_wage, monthly_wage, status, joining_date, mobile_number, address, esic_number, epf_number)
    VALUES ('SFS-0103', 'Paresh D. Parmar', 'Housekeeping Attendant', $1, 550, 14300, 'ACTIVE', '2026-06-01', '9825000103', 'Katargam, Surat', 'ESIC10003', 'EPF10003') RETURNING id
  `, [s2Id])

  const e4 = await query(`
    INSERT INTO employees (employee_code, name, designation, site_id, daily_wage, monthly_wage, status, joining_date, mobile_number, address, esic_number, epf_number)
    VALUES ('SFS-0104', 'Manisha Ben Solanki', 'Facility Cleaning Staff', $1, 560, 14560, 'ACTIVE', '2025-01-10', '9825000104', 'Rander, Surat', 'ESIC10004', 'EPF10004') RETURNING id
  `, [s3Id])

  const e5 = await query(`
    INSERT INTO employees (employee_code, name, designation, site_id, daily_wage, monthly_wage, status, joining_date, mobile_number, address, esic_number, epf_number)
    VALUES ('SFS-0105', 'Vikram Singh Rathore', 'Night Patrol Guard', $1, 680, 17680, 'ACTIVE', '2025-09-20', '9825000105', 'Varachha, Surat', 'ESIC10005', 'EPF10005') RETURNING id
  `, [s2Id])

  const e1Id = e1.rows[0].id
  const e2Id = e2.rows[0].id
  const e3Id = e3.rows[0].id
  const e4Id = e4.rows[0].id
  const e5Id = e5.rows[0].id

  // 5. Seed Self-Service user for e2 (Suresh Varma)
  const hash = await bcrypt.hash('suresh123', 10)
  await query(`
    INSERT INTO app_users (username, password, full_name, role, employee_id, is_active)
    VALUES ('suresh', $1, 'Suresh Bhai Varma', 'EMPLOYEE', $2, true)
    ON CONFLICT (username) DO NOTHING;
  `, [hash, e2Id])

  // 6. Advances & Fines
  await query(`
    INSERT INTO advances (transaction_id, employee_id, amount, advance_date, remark, is_recovered)
    VALUES 
      ('ADV-DEMO-01', $1, 6500, CURRENT_DATE - INTERVAL '12 days', 'Family medical emergency', false),
      ('ADV-DEMO-02', $2, 3000, CURRENT_DATE - INTERVAL '18 days', 'Uniform & gear deposit', false);
  `, [e3Id, e2Id])

  await query(`
    INSERT INTO fines (transaction_id, employee_id, amount, fine_date, site, reason)
    VALUES ('FIN-DEMO-01', $1, 400, CURRENT_DATE - INTERVAL '5 days', 'SDB Vaults', 'Uninformed absence during VIP inspection');
  `, [e3Id])

  // 7. Overtime Records
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()

  await query(`
    INSERT INTO overtime_records (employee_id, month, year, hours, rate, amount)
    VALUES 
      ($1, $2, $3, 48.5, 150, 7275),
      ($4, $2, $3, 36.0, 140, 5040),
      ($5, $2, $3, 12.0, 200, 2400)
    ON CONFLICT (employee_id, month, year) DO NOTHING;
  `, [e2Id, curMonth, curYear, e5Id, e1Id])

  // 8. Payroll Records (Prior month)
  let prevMonth = curMonth - 1
  let prevYear = curYear
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear--
  }

  await query(`
    INSERT INTO payroll_records (transaction_id, employee_id, payroll_month, payroll_year, attendance_days, total_working_days, gross_salary, net_salary, total_deductions, status, processed_by)
    VALUES 
      ('PAY-DEMO-01', $1, $2, $3, 26, 26, 24700, 21736, 2964, 'PAID', 'admin'),
      ('PAY-DEMO-02', $4, $2, $3, 25, 26, 17500, 15400, 2100, 'PAID', 'admin'),
      ('PAY-DEMO-03', $5, $2, $3, 17, 26, 9350, 7228, 2122, 'PAID', 'admin')
    ON CONFLICT (employee_id, payroll_month, payroll_year) DO NOTHING;
  `, [e1Id, prevMonth, prevYear, e2Id, e3Id])

  // 9. Grievances
  await query(`
    INSERT INTO grievances (employee_id, type, description, status, raised_by, created_at)
    VALUES 
      ($1, 'CLIENT_COMPLAINT', 'Night perimeter halogen searchlights are dysfunctional near Marine Gate Post; extreme hazard during midnight rounds.', 'OPEN', 'suresh', NOW() - INTERVAL '3 days'),
      ($2, 'EMPLOYEE_GRIEVANCE', 'Last month ESIC deduction was charged twice from salary ledger despite valid card. Kindly rectify urgently.', 'IN_REVIEW', 'hr_staff', NOW() - INTERVAL '7 days'),
      ($3, 'EMPLOYEE_GRIEVANCE', 'Drinking water filtration system at VR Mall staff cafeteria has been non-operational.', 'OPEN', 'hr_staff', NOW() - INTERVAL '2 days');
  `, [e2Id, e3Id, e4Id])

  console.log('✅ Shreeji Facility Services demo dataset successfully initialized!')
}
