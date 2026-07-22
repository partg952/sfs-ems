import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

export const pool = new Pool(config.db)

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err)
})

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  return res
}

export async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        contact_person VARCHAR(100),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(100),
        address TEXT,
        contract_start_date DATE,
        contract_end_date DATE,
        billing_rate NUMERIC(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        address TEXT,
        supervisor_name VARCHAR(100),
        supervisor_phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        date_of_birth DATE,
        mobile_number VARCHAR(50),
        address TEXT,
        photo_url TEXT,
        site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
        designation VARCHAR(100) NOT NULL,
        daily_wage NUMERIC(10,2) DEFAULT 0,
        monthly_wage NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
        joining_date DATE,
        leaving_date DATE,
        esic_number VARCHAR(50),
        epf_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) NOT NULL,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS status_history (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        remark TEXT,
        changed_at TIMESTAMP DEFAULT NOW(),
        changed_by VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS employment_history (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        old_site_id INTEGER,
        new_site_id INTEGER,
        old_designation VARCHAR(100),
        new_designation VARCHAR(100),
        old_daily_wage NUMERIC(10,2),
        new_daily_wage NUMERIC(10,2),
        old_monthly_wage NUMERIC(10,2),
        new_monthly_wage NUMERIC(10,2),
        changed_by VARCHAR(100),
        changed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        is_night_shift BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shift_assignments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        effective_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS overtime_records (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        hours NUMERIC(6,2) NOT NULL,
        rate NUMERIC(10,2) NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS advances (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        advance_date DATE NOT NULL,
        remark TEXT,
        is_recovered BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        fine_date DATE NOT NULL,
        site VARCHAR(150),
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        monthly_rent NUMERIC(10,2) NOT NULL,
        allotted_date DATE NOT NULL,
        is_vacated BOOLEAN DEFAULT false,
        vacated_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uniforms (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shirt_size VARCHAR(20),
        pant_size VARCHAR(20),
        shoes_size VARCHAR(20),
        allotted_date DATE,
        is_returned BOOLEAN DEFAULT false,
        returned_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        payroll_month INTEGER NOT NULL,
        payroll_year INTEGER NOT NULL,
        attendance_days INTEGER NOT NULL,
        total_working_days INTEGER DEFAULT 26,
        gross_salary NUMERIC(10,2) NOT NULL,
        overtime_earning NUMERIC(10,2) DEFAULT 0,
        esic_deduction NUMERIC(10,2) DEFAULT 0,
        epf_deduction NUMERIC(10,2) DEFAULT 0,
        advance_deduction NUMERIC(10,2) DEFAULT 0,
        fine_deduction NUMERIC(10,2) DEFAULT 0,
        rent_deduction NUMERIC(10,2) DEFAULT 0,
        total_deductions NUMERIC(10,2) DEFAULT 0,
        net_salary NUMERIC(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        processed_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, payroll_month, payroll_year)
      );

      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        annual_quota INTEGER NOT NULL,
        is_paid BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        total_allocated NUMERIC(4,1) NOT NULL,
        used NUMERIC(4,1) DEFAULT 0,
        remaining NUMERIC(4,1) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, leave_type_id, year)
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days NUMERIC(4,1) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        action_by VARCHAR(100),
        action_remark TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS grievances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN' NOT NULL,
        action_taken TEXT,
        handled_by VARCHAR(100),
        raised_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS salary_slip_templates (
        id SERIAL PRIMARY KEY,
        template_html TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        updated_by VARCHAR(100),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('✅ PostgreSQL database schema verified.')
  } finally {
    client.release()
  }
}
