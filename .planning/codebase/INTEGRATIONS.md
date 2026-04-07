# External Integrations

## Databases
- **Primary Database**: PostgreSQL (accessed via Prisma)
- **Direct Access**: Configured via `DIRECT_DATABASE_URL` for migrations.
- **Supabase**: Referenced in `package.json` (`@supabase/supabase-js`) and logs, likely providing the PostgreSQL instance and potentially storage/auth services.

## Services & APIs
- **Authentication**:
  - Internal JWT-based auth managed by NestJS/Passport.
  - Refresh token rotation implemented in `api-client.ts`.
- **Storage**:
  - `Multer` used in backend for handling multipart/form-data (uploads).
  - `check-storage.js` script suggests an investigation into storage solutions.
- **Deployment & Hosting**:
  - **Vercel**: Backend has a custom webpack config for Vercel, and frontend is a Next.js app natively supported by Vercel.

## Environment Variables
### Backend
- `DATABASE_URL`: Prisma connection string.
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: For authentication.
- `CORS_ORIGINS`: Allowed frontend origins.

### Frontend
- `NEXT_PUBLIC_API_URL`: Points to the backend API (e.g., `http://localhost:4000/api/v1`).
