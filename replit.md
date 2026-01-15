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
- **Session Management**: Express-session with PostgreSQL storage (connect-pg-simple)
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
- Polling-based alternatives being implemented (replacing Supabase real-time)
- Chat messaging with typing indicators
- Notification system with unread counters

### Migration Status (Supabase to Replit API)
**100% Complete - All Supabase imports removed from src/**

**Completed:**
- Core backend infrastructure: Express server with session-based auth, bcrypt password hashing
- PostgreSQL database with all 15+ tables via Drizzle ORM
- All 3 registration flows: RegisterDealer, SignUpSales, SignUpDriver use API routes
- DealerDashboard fully migrated: data loading functions and action handlers use API calls
- SalesDashboard fully migrated: all data loading and action handlers use API calls
- DriverDashboard fully migrated: polling-based updates (15s interval), all data loading and action handlers use API calls
- Chat and messaging fully migrated: AllConversations, Chat components use polling-based updates
- All hooks migrated: useUnreadMessagesCount, useDriverRating, useDeliveryData use API layer
- Admin management migrated: AdminManagement.tsx uses API for dealer admins and invitations
- Profile management migrated: Profile.tsx uses API for profile updates and password changes
- API client (src/lib/api.ts) extended with user, adminInvitations, and dealerAdmins namespaces
- Backend routes include endpoints for admin management, profile updates, password changes
- Types exported from shared/schema.ts (Dealer, Driver, Sales, DealerAdmin, AdminInvitation, etc.)

### Production Infrastructure (January 2026)
- **Password Reset**: SHA-256 hashed tokens, 1-hour expiry, single-use enforcement, email delivery via Resend
- **Session Persistence**: PostgreSQL-backed sessions via connect-pg-simple, 7-day cookie expiry
- **Email Service**: Resend API integration (requires RESEND_API_KEY env variable), graceful degradation when not configured
- **Account Deletion**: Safe cascade deletion across all 15+ dependent tables in a single transaction
- **Rate Limiting**: In-memory rate limiter on polling endpoints (20 req/10s) and sensitive operations (5 req/hour)
- **Race Condition Handling**: Atomic delivery acceptance using conditional UPDATE with database-level locking
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, strict CSP in production
- **Authorization**: Role-based access control on all API endpoints with ownership verification to prevent cross-tenant data exposure
  - `isDeliveryParticipant()` helper validates user is driver, sales, or dealer admin on the delivery
  - `canAccessDealerData()` helper validates user has access to dealer-scoped data
  - All /api/messages endpoints require delivery participant authorization
  - All /api/deliveries endpoints require role-appropriate authorization
  - Driver/dealer-scoped endpoints (applications, approved drivers, statistics) require matching access
- **Delivery Tracking**: 8 granular status levels with validated state transitions allowing cancellation and safe backward corrections
- **Search & Export**: Delivery search with query/status/date filters; CSV export for history reports - both with strict role authorization
- **Legal Compliance**: Privacy Policy (Termly iframe), Terms of Service pages, mandatory checkbox acceptance on all registration forms
- **Driver Verification**: Dealers can mark approved drivers as "verified" after checking credentials; only verified drivers can accept deliveries
- **Estimated Pay Display**: Drivers see estimated earnings before accepting jobs, calculated from round-trip distance × dealer hourly rate (default $25/hr)
- **Manual Transmission Preference**: Drivers indicate if they can drive manual transmission during signup; replaces irrelevant "vehicle type" field since drivers use dealership vehicles
- **Atomic Dealer Registration**: Combined /api/auth/register-dealer endpoint creates user, dealer, and admin records in a single database transaction with Zod validation - avoids cross-site cookie issues on production domains

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
- **bcryptjs**: Password hashing
- **express-session**: Session management
- **Drizzle ORM**: Type-safe database operations with PostgreSQL

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
- **Vitest**: Unit testing framework
- **Supertest**: HTTP endpoint testing

### Dashboard UX Simplification (January 2026)
All three dashboards refactored for cleaner, mobile-first experience:
- **DealerDashboard**: 1111 lines (from 1771, 37% reduction), 3 tabs (Overview, Deliveries, Team) instead of 7
- **SalesDashboard**: Profile-style header with gradient, avatar initials, dealership info, contact details, 3-step modal wizard with strict validation
- **DriverDashboard**: Profile-style header with status badge, availability toggle, contact info, service radius, 3 tabs (Jobs, History, Dealerships)
- Added OnboardingChecklist to all dashboards for guided user setup
- Unread message indicator added to Driver dashboard header with badge
- Profile headers with gradient backgrounds and user initials avatars
- Quick stats cards overlapping the header for visual depth
- Prominent action buttons (New Delivery, Go Online/Offline)
- Settings button in header for easy profile access
- Modal-based forms instead of inline forms with enhanced validation

### Calendar & Scheduling (January 2026)
- **Calendar Page**: Month view calendar accessible from Sales and Driver dashboard headers showing scheduled deliveries
- **Delivery Scheduling**: ScheduleConfirmationModal allows sales staff to confirm delivery date/time after driver accepts
- **Driver Availability Check**: When scheduling, shows if driver has other deliveries on selected date with time conflicts displayed
- **Role-Scoped Access**: Calendar API endpoints enforce role-based access - sales/drivers only see their own deliveries; availability check restricted to approved drivers
- **Navigation**: Calendar icon buttons added to Sales (red header) and Driver (gray header) dashboards for quick access

### Quick Wins Implemented (January 2026)
- **Tailwind Theme Tokens**: Added design system colors (primary, secondary, destructive, accent, muted) and border-radius scale to tailwind.config.js for consistent Button component styling
- **Debug Log Cleanup**: Removed console.log statements from ScheduleConfirmationModal.tsx and adminInvitations.ts
- **API Method Fix**: Added missing api.sales.get(id) method
- **Native App Feel**: iOS-style overscroll bounce, active-press feedback on buttons, smooth momentum scrolling, skeleton loading components, pull-to-refresh hook/component (ready for future integration)

### Testing Infrastructure (January 2026)
- **Smoke Runner**: `npm run smoke` - validates 17 core user flows (100% pass rate)
  - Registration: dealer, sales, driver account creation with proper linking
  - Driver Hiring: application submission and approval flow
  - Delivery Lifecycle: all 8 status transitions from pending to completed
  - Chat/Messaging: send and retrieve messages per delivery
  - Data Retrieval: role-scoped delivery queries
- **Seed Data**: `npm run seed` - creates persistent test accounts that survive smoke tests
  - Dealer: seed-dealer@swaprunn.com / TestPass123!
  - Sales: seed-sales@swaprunn.com / TestPass123!
  - Driver: seed-driver@swaprunn.com / TestPass123!
  - Driver is pre-approved and verified for the dealership
- **Test Plan**: TEST_PLAN.md documents 85 test cases covering auth, roles, deliveries, chat, security
- **Vitest Tests**: Unit tests in `/tests` directory (database isolation issues under investigation)