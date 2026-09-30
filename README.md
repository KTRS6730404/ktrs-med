# KTRS MED external MVP

Supabase-backed external web app for KTRS MED.

## Setup
1. Copy `.env.example` to `.env`.
2. `npm install`
3. `npm run dev`

## Deploy
GitHub Pages deployment is configured via Actions.

## Included
- Email/password login
- Player/staff signup
- Approval-gated access
- Admin approval UI
- Player injury self-report
- Staff conversion of report to formal case
- Active case/player list
- Team summary
- Case overview

## Security
Uses only the Supabase publishable key in the frontend. Access is enforced by Supabase RLS.
Never place a service_role/secret key in this project.