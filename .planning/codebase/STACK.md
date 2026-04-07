# Technology Stack

## Core Technologies
- **Runtime**: Node.js (>=20)
- **Package Manager**: pnpm (>=9.15.0)
- **Monorepo Tooling**: Turbo (v2.3.0)
- **Language**: TypeScript (v5.6.0)

## Backend (apps/backend)
- **Framework**: NestJS (v10.4.0)
- **ORM**: Prisma (v6.5.0)
- **Database**: PostgreSQL
- **Authentication**: Passport.js with JWT Strategy
- **API Documentation**: Swagger (@nestjs/swagger v8.1.0)
- **Validation**: class-validator, class-transformer
- **Deployment**: Configured for Vercel (webpack.vercel.config.js)

## Frontend (apps/frontend)
- **Framework**: Next.js (v15.1.11) with App Router
- **Library**: React (v19.0.0)
- **Styling**: Tailwind CSS (v3.4.16), PostCSS, CSS Modules
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Tables**: TanStack Table (v8.21.3)
- **Rich Text**: Tiptap (v3.20.1)
- **Animations**: Framer Motion (v12.38.0)
- **Icons**: Lucide React
- **Notifications**: Sonner

## Shared Packages
- **@sms-saas/shared-types**: Common TypeScript interfaces and types used by both backend and frontend.

## Infrastructure & Tooling
- **Linting**: ESLint (v9.x)
- **Formatting**: Prettier
- **Testing**: Jest (Backend co-located or co-named `.spec.ts`)
