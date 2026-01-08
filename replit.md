# SwapRunn Logistics Platform

## Overview

SwapRunn is a logistics platform connecting car dealerships, sales staff, and drivers for vehicle deliveries and dealer swaps. The application provides role-based dashboards for three user types: dealerships (manage operations), sales staff (request deliveries), and drivers (accept and complete assignments). Core features include real-time chat, delivery tracking, driver selection with preferences, schedule coordination, and notification systems.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM for client-side navigation with protected routes and role-based access control
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: React Context (AuthContext, ToastContext) for global state
- **Mobile Support**: Capacitor configured for iOS native app deployment

### Backend Architecture
- **Server**: Express.js with TypeScript running via tsx
- **API Structure**: RESTful endpoints under `/api` prefix
- **Session Management**: Express-session with configurable storage
- **Authentication**: Custom session-based auth with bcrypt password hashing
- **Database ORM**: Drizzle ORM for type-safe database operations

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines all tables using Drizzle's pgTable
- **Key Tables**: dealers, sales, drivers, deliveries, messages, notifications, driver_applications, admin_invitations
- **Migrations**: Drizzle Kit for schema management (`npm run db:push`)

### Authentication Flow
- Session-based authentication stored server-side
- Role-based access (dealer, sales, driver) determined at registration
- Protected routes redirect unauthenticated users to login
- Password hashing with bcrypt

### Real-time Features
- Supabase client configured for real-time subscriptions (legacy integration)
- Chat messaging with typing indicators
- Notification system with unread counters

### Project Structure
```
/src              - React frontend application
  /components     - Reusable UI components organized by feature
  /contexts       - React context providers
  /hooks          - Custom React hooks
  /lib            - Utility functions and API clients
  /pages          - Route-level page components
/server           - Express backend
  index.ts        - Server entry point
  routes.ts       - API route definitions
  storage.ts      - Database operations
  db.ts           - Database connection
/shared           - Shared TypeScript schemas between frontend and backend
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Database toolkit for schema definition and queries

### Authentication & Backend
- **Supabase Client**: Used for real-time subscriptions and some legacy auth features (requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
- **bcryptjs**: Password hashing
- **express-session**: Session management

### Mobile Deployment
- **Capacitor**: Native iOS app wrapper with plugins for:
  - Push notifications
  - Geolocation
  - Device info
  - Haptic feedback
  - Status bar control

### Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Type checking across frontend and backend
- **ESLint**: Code linting
- **tsx**: TypeScript execution for the server