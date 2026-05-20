import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || process.env.SERVER_PORT || 8080,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'ems_user',
    password: process.env.DB_PASSWORD || 'ems_password',
    database: process.env.DB_NAME || 'ems_db',
  },
  jwtSecret: process.env.JWT_SECRET || 'EMS_SECRET_KEY_CHANGE_IN_PRODUCTION_MUST_BE_256_BITS_LONG_!',
  jwtExpiration: process.env.JWT_EXPIRATION_MS || '86400000',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}
