# SwapRunn Logistics Platform

## Overview

SwapRunn is a logistics platform designed to streamline vehicle deliveries and dealer swaps by connecting car dealerships, sales staff, and drivers. It offers role-based dashboards with features like real-time communication, delivery tracking, driver assignment with preferences, schedule coordination, and a robust notification system. The platform aims to optimize logistics operations within the automotive industry.

## User Preferences

Preferred communication style: Simple, everyday language.

### Design Preferences
- **Color Scheme**: Dark monochromatic theme with warm amber accents
  - Primary actions (buttons): amber-600/amber-700 gradient
  - Active tab indicators: amber-400 with underline
  - Tab badges: amber-600 background
  - Secondary/cancel buttons: neutral-700 with visible borders (neutral-500/600)
  - Hero accent text: amber-400 to amber-500 gradient
- **Goal**: Buttons must look clearly clickable and active, not greyed out or disabled
- **Avoid**: Pure gray/stone colors for action buttons (looks disabled)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM with protected, role-based routes
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React Context (AuthContext, ToastContext)
- **Mobile Support**: Capacitor for iOS native app deployment

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Structure**: RESTful endpoints
- **Session Management**: Express-session with PostgreSQL storage
- **Authentication**: Custom session-based auth with bcrypt
- **Database ORM**: Drizzle ORM

### Data Storage
- **Database**: PostgreSQL
- **Schema Management**: Drizzle ORM and Drizzle Kit

### Authentication
- Session-based with role-based access control (dealer, sales, driver).
- Password hashing using bcrypt.
- Password reset functionality with SHA-256 hashed tokens and email delivery via Resend.

### Real-time Features
- Polling-based chat messaging with typing indicators.
- Polling-based notification system with unread counters.

### Production Infrastructure
- **Email Service**: Resend API integration.
- **In-App Notifications**: NotificationCenter component with polling.
- **Push Notifications**: Firebase Cloud Messaging for native mobile apps (new delivery alerts, driver acceptance, chat messages, application updates).
- **Account Deletion**: Safe cascade deletion.
- **Rate Limiting**: In-memory rate limiting for polling and sensitive operations.
- **Race Condition Handling**: Atomic delivery acceptance using conditional updates.
- **Security Headers**: Comprehensive set of security headers.
- **Authorization**: Role-based access control and ownership verification across all API endpoints.
- **Delivery Tracking**: 8 granular status levels with validated transitions.
- **Search & Export**: Delivery search with filters and CSV export.
- **Legal Compliance**: Privacy Policy and Terms of Service.
- **Driver Verification**: Automatic upon dealer approval.
- **Estimated Pay**: Drivers see estimated earnings based on distance and hourly rate.
- **Manual Transmission Preference**: Drivers indicate capability during signup.
- **Atomic Dealer Registration**: Combined endpoint for user, dealer, and admin creation.
- **Simplified Sales Signup**: Self-registration with dealer approval workflow.
- **Manager Admin Access Request**: In-app request and approval for existing dealership managers.
- **Profile Picture Upload**: Drivers can upload profile pictures via Replit Object Storage.

### Project Structure
- `/src`: React frontend (components, contexts, hooks, lib, pages)
- `/server`: Express backend (index, routes, storage, db)
- `/shared`: Shared TypeScript schemas

### UI/UX and Feature Specifications
- **Dashboards**: Refactored for mobile-first experience with specific tab structures for Dealer, Sales, and Driver.
- **Theme**: Consistent dark charcoal theme across all pages with intentional contrast for readability.
- **User Onboarding**: OnboardingChecklist for guided setup.
- **Profile Management**: Detailed profile tab with avatar upload, statistics, and settings.
- **Availability Toggle**: Integrated into driver profile.
- **Calendar & Scheduling**: Month view calendar showing scheduled deliveries, delivery scheduling with driver availability checks.
- **Native App Feel**: iOS-style overscroll, active-press feedback, skeleton loading, pull-to-refresh.

## External Dependencies

### Database
- **PostgreSQL**
- **Drizzle ORM**

### Authentication & Backend
- **bcryptjs**
- **express-session**

### Mobile Deployment
- **Capacitor** (with plugins for Push notifications, Geolocation, Device info, Haptic feedback, Status bar control)
- **Firebase Cloud Messaging**

### Email Service
- **Resend API**

### Development Tools
- **Vite**
- **TypeScript**
- **ESLint**
- **tsx**
- **Vitest**
- **Supertest**