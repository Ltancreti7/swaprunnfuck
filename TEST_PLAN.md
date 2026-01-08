# TEST_PLAN.md — SwapRunn QA Test Plan

This document defines all critical user flows and edge cases that must be verified before production launch.

Reference: PRODUCT_SPEC.md (authoritative)

---

## 1. REGISTRATION & AUTHENTICATION

### 1.1 Dealer Registration
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| REG-D01 | Register dealership with valid data | Creates user + dealer record, session established |
| REG-D02 | Register with existing email | Returns 400 "already exists" error |
| REG-D03 | Register with missing required fields | Returns 400 validation error |
| REG-D04 | Register with weak password | Returns 400 password validation error |

### 1.2 Sales Staff Registration
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| REG-S01 | Register sales with valid dealerId | Creates user + sales record linked to dealer |
| REG-S02 | Register sales with invalid dealerId | Returns 400/404 error |
| REG-S03 | Register sales with existing email | Returns 400 "already exists" error |

### 1.3 Driver Registration
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| REG-R01 | Register driver with valid data | Creates user + driver record (independent) |
| REG-R02 | Register driver with existing email | Returns 400 "already exists" error |
| REG-R03 | Register driver with missing fields | Returns 400 validation error |

### 1.4 Login
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| AUTH-01 | Login with valid credentials | Returns user data, session cookie set |
| AUTH-02 | Login with wrong password | Returns 401 error |
| AUTH-03 | Login with non-existent email | Returns 401 error |
| AUTH-04 | Session persists across requests | Subsequent /api/auth/me returns user |

### 1.5 Logout
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| AUTH-05 | Logout clears session | Session destroyed, cookie cleared |
| AUTH-06 | Access protected route after logout | Returns 401 |

### 1.6 Password Reset
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| PWD-01 | Request reset with valid email | Token created, email sent (or logged) |
| PWD-02 | Request reset with unknown email | Returns 200 (no info leak) |
| PWD-03 | Reset with valid token | Password updated, token invalidated |
| PWD-04 | Reset with expired token | Returns 400 error |
| PWD-05 | Reset with already-used token | Returns 400 error |
| PWD-06 | Reset with invalid token | Returns 400 error |

---

## 2. ROLE ENFORCEMENT & AUTHORIZATION

### 2.1 Dealer Role
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| ROLE-D01 | Dealer can view own dealership deliveries | Returns deliveries |
| ROLE-D02 | Dealer cannot view other dealership data | Returns 403 |
| ROLE-D03 | Dealer can create delivery | Delivery created |
| ROLE-D04 | Dealer can approve driver applications | Application status updated |
| ROLE-D05 | Dealer can export CSV | CSV returned |
| ROLE-D06 | Dealer cannot accept deliveries | Returns 403 or no such endpoint |

### 2.2 Sales Role
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| ROLE-S01 | Sales can view own dealership deliveries | Returns deliveries |
| ROLE-S02 | Sales cannot view other dealership data | Returns 403 |
| ROLE-S03 | Sales can create delivery | Delivery created |
| ROLE-S04 | Sales cannot approve drivers | Returns 403 |
| ROLE-S05 | Sales can chat on assigned deliveries | Message sent |

### 2.3 Driver Role
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| ROLE-R01 | Driver can view own deliveries | Returns driver's deliveries |
| ROLE-R02 | Driver cannot view dealer admin data | Returns 403 |
| ROLE-R03 | Driver cannot create deliveries | Returns 403 |
| ROLE-R04 | Driver can accept available jobs | Delivery assigned |
| ROLE-R05 | Driver can update delivery status | Status updated |
| ROLE-R06 | Driver can only chat on accepted jobs | Message sent or 403 if not assigned |

### 2.4 Unauthenticated Access
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| ROLE-U01 | Access protected endpoint without session | Returns 401 |
| ROLE-U02 | Access /api/auth/me without session | Returns 401 or null user |

---

## 3. DRIVER HIRING FLOW

### 3.1 Driver Applications
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| HIRE-01 | Driver applies to dealership | Application created with "pending" status |
| HIRE-02 | Driver applies to same dealership twice | Returns error or updates existing |
| HIRE-03 | Dealer views applications | Returns list of pending applications |
| HIRE-04 | Dealer approves application | Status updated to "approved" |
| HIRE-05 | Dealer rejects application | Status updated to "rejected" |

### 3.2 Approved Driver Access
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| HIRE-06 | Approved driver can see dealership jobs | Jobs visible |
| HIRE-07 | Non-approved driver cannot see dealership jobs | Jobs not visible or returns 403 |
| HIRE-08 | Rejected driver cannot accept jobs | Returns 403 |

---

## 4. DELIVERY LIFECYCLE

### 4.1 Delivery Creation
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| DEL-01 | Dealer creates delivery | Delivery created with "pending" status |
| DEL-02 | Sales creates delivery | Delivery created with "pending" status |
| DEL-03 | Driver attempts to create delivery | Returns 403 |
| DEL-04 | Create delivery with missing required fields | Returns 400 validation error |

### 4.2 Delivery Acceptance (Atomic Lock)
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| DEL-05 | Driver accepts available delivery | Status changes, driverId set |
| DEL-06 | Second driver attempts to accept same delivery | Returns 409 conflict |
| DEL-07 | Driver accepts delivery from non-approved dealership | Returns 403 |

### 4.3 Status Transitions
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| DEL-08 | pending → pending_driver_acceptance | Allowed |
| DEL-09 | pending_driver_acceptance → assigned | Allowed |
| DEL-10 | assigned → driver_en_route_pickup | Allowed |
| DEL-11 | driver_en_route_pickup → arrived_at_pickup | Allowed |
| DEL-12 | arrived_at_pickup → in_transit | Allowed |
| DEL-13 | in_transit → arrived_at_dropoff | Allowed |
| DEL-14 | arrived_at_dropoff → completed | Allowed |
| DEL-15 | Any non-terminal → cancelled | Allowed |
| DEL-16 | completed → any status | Rejected (terminal) |
| DEL-17 | cancelled → any status | Rejected (terminal) |
| DEL-18 | Invalid transition (e.g., pending → completed) | Returns 400 |

### 4.4 Backward Transitions (Corrections)
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| DEL-19 | assigned → pending (driver cancels) | Allowed |
| DEL-20 | pending_driver_acceptance → pending | Allowed |
| DEL-21 | driver_en_route_pickup → assigned | Allowed |

---

## 5. CHAT / MESSAGING

### 5.1 Message Creation
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| MSG-01 | Send message on accepted delivery | Message created |
| MSG-02 | Send message on delivery not assigned to user | Returns 403 |
| MSG-03 | Send empty message | Returns 400 |

### 5.2 Message Retrieval
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| MSG-04 | Get messages for delivery (authorized) | Returns messages |
| MSG-05 | Get messages for delivery (unauthorized) | Returns 403 |

### 5.3 Conversations
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| MSG-06 | List user's conversations | Returns conversation list |
| MSG-07 | Conversation shows unread count | Correct unread count |

---

## 6. NOTIFICATIONS

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| NOT-01 | User receives notification on relevant event | Notification created |
| NOT-02 | Get unread notification count | Returns count |
| NOT-03 | Mark notification as read | isRead updated |

---

## 7. SECURITY & RATE LIMITING

### 7.1 Rate Limiting
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| SEC-01 | Exceed rate limit on polling endpoint | Returns 429 |
| SEC-02 | Exceed rate limit on sensitive operation | Returns 429 |

### 7.2 Cross-Tenant Isolation
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| SEC-03 | Dealer A cannot access Dealer B's deliveries | Returns 403 or empty |
| SEC-04 | Driver cannot access another driver's data | Returns 403 |
| SEC-05 | Search with forged dealerId | Returns 403 |
| SEC-06 | Export with forged dealerId | Returns 403 |

### 7.3 Session Security
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| SEC-07 | Session persists in database | Session row exists |
| SEC-08 | Session expires after timeout | Access denied |

---

## 8. DATA INTEGRITY

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| INT-01 | Delete dealer cascades to sales, deliveries | Related records deleted |
| INT-02 | Delete driver cascades to applications | Related records deleted |
| INT-03 | Foreign key constraint prevents orphan records | Insert fails |

---

## 9. EDGE CASES

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| EDGE-01 | Create delivery with very long VIN | Truncated or validated |
| EDGE-02 | Special characters in messages | Stored and retrieved correctly |
| EDGE-03 | Concurrent delivery acceptance | Only one succeeds |
| EDGE-04 | Empty delivery list returns empty array | Returns [] not error |
| EDGE-05 | Pagination with zero results | Returns empty page |

---

## TEST COVERAGE SUMMARY

| Category | Test Cases | Priority |
|----------|------------|----------|
| Registration & Auth | 16 | Critical |
| Role Enforcement | 14 | Critical |
| Driver Hiring | 8 | High |
| Delivery Lifecycle | 21 | Critical |
| Chat/Messaging | 7 | High |
| Notifications | 3 | Medium |
| Security | 8 | Critical |
| Data Integrity | 3 | High |
| Edge Cases | 5 | Medium |
| **TOTAL** | **85** | |

---

## AUTOMATION SCOPE

### Automated (Backend Tests)
- All auth flows (REG-*, AUTH-*, PWD-*)
- Role enforcement (ROLE-*)
- Driver hiring (HIRE-*)
- Delivery lifecycle (DEL-*)
- Chat basics (MSG-01 to MSG-05)
- Security (SEC-03 to SEC-06)

### Smoke Runner
- Full happy path: dealer signup → sales signup → driver signup → driver applies → dealer approves → delivery created → driver accepts → status updates → chat → completion

### Manual Testing Required
1. Email delivery (password reset emails)
2. Session timeout behavior
3. Rate limiting at exact thresholds
4. Browser cookie handling
5. Mobile responsive UI
6. CSV export file format validation
7. Notification UI display
8. Real-time polling behavior
9. Error message display
10. Form validation UX
