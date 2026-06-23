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
        effective_date DATE NOT NULL,
        remark TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS room_allotments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        monthly_rent NUMERIC(10,2) DEFAULT 0,
        allotment_date DATE NOT NULL,
        vacated_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uniform_allotments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shirt_size VARCHAR(10),
        pant_size VARCHAR(10),
        shoe_size VARCHAR(10),
        allotment_date DATE NOT NULL,
        returned_date DATE,
        is_returned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_night_shift BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shift_assignments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS overtime (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        ot_hours NUMERIC(6,2) DEFAULT 0,
        hourly_rate NUMERIC(10,2) DEFAULT 0,
        total_ot_pay NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (employee_id, month, year)
      );

      CREATE TABLE IF NOT EXISTS advances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        reason TEXT,
        request_date DATE NOT NULL,
        approved_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'APPROVED' NOT NULL,
        remaining_balance NUMERIC(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fines (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        reason TEXT,
        fine_date DATE NOT NULL,
        imposed_by VARCHAR(100),
        status VARCHAR(50) DEFAULT 'IMPOSED' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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
    `)
    console.log('✅ PostgreSQL initial tables initialized successfully')
  } catch (err) {
    console.error('❌ Database schema initialization error:', err)
    throw err
  } finally {
    client.release()
  }
}
