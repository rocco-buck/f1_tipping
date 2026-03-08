# F1 Tipping App Architecture & Technical Specification

## 1. Overview
A web application for a Formula 1 tipping competition where users can make predictions for each race. An administrator manages invitations, sets race schedules, handles scoring criteria (including "crazy predictions"), and enters race results. Users earn points based on their predictions across the season.

## 2. Technical Stack
- **Frontend/Framework:** Next.js (React)
- **Database & Authentication:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS (recommended for rapid UI development)
- **Deployment/Hosting:** Vercel (seamless Next.js integration)
- **Notifications (Email/SMS):** Resend (Emails), Twilio or similar (SMS) - To be integrated via Next.js API routes or Supabase Edge Functions.

## 3. Core Features & Architecture

### 3.1 Authentication & Authorization
- Supabase Auth for handling user registration (via admin email invite) and login.
- Two roles: `admin` (can manage races, users, results) and `user` (can make predictions, view leaderboards).
- Protected routes in Next.js ensuring only authenticated users can access the app.

### 3.2 Database Schema (PostgreSQL via Supabase)

#### `users`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (matches Supabase Auth `uid`) |
| `email` | String | Unique |
| `name` | String | User's display name |
| `role` | String | 'admin' or 'user' (default) |
| `created_at` | Timestamp | |

#### `drivers`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | E.g., Max Verstappen |
| `team_id` | UUID | Foreign Key to `teams` |
| `image_url` | String | URL to driver's photo |

#### `teams`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | E.g., Red Bull Racing |
| `logo_url` | String | URL to team logo |

#### `races`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | String | E.g., Bahrain Grand Prix |
| `date` | Timestamp | Date of the actual race |
| `prediction_deadline` | Timestamp | When picks lock (e.g., start of Qualifying) |
| `crazy_prediction_desc` | String | E.g., "Most places made up", set by admin |
| `crazy_prediction_points`| Integer | Variable points for crazy prediction |
| `track_image_url` | String | URL to the track layout image |
| `race_logo_url` | String | URL to the official race logo |
| `location_image_url` | String | URL to a photo of the location |
| `status` | String | 'upcoming', 'locked', 'completed' |
| `completed` | Boolean | Whether results have been finalized |

#### `predictions`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key to `users` |
| `race_id` | UUID | Foreign Key to `races` |
| `pole_driver_id` | UUID | Foreign Key to `drivers` |
| `p1_driver_id` | UUID | Foreign Key to `drivers` |
| `p2_driver_id` | UUID | Foreign Key to `drivers` |
| `p3_driver_id` | UUID | Foreign Key to `drivers` |
| `p10_driver_id` | UUID | Foreign Key to `drivers` |
| `crazy_prediction_value`| String | A text/number value depending on what the crazy prediction is (e.g., driver ID, time string "1:23.456", team ID, or raw text) |
| `is_locked` | Boolean | If user locked picks manually, or auto-locked past deadline |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

*Constraint: Unique constraint on `(user_id, race_id)` to ensure one prediction per race.*

#### `race_results`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `race_id` | UUID | Foreign Key to `races` (Unique) |
| `pole_driver_id` | UUID | Foreign Key to `drivers` |
| `p1_driver_id` | UUID | Foreign Key to `drivers` |
| `p2_driver_id` | UUID | Foreign Key to `drivers` |
| `p3_driver_id` | UUID | Foreign Key to `drivers` |
| `p10_driver_id` | UUID | Foreign Key to `drivers` |
| `crazy_prediction_answer`| String | The winning answer for the crazy prediction (e.g., "1:23.456" or a UUID) |

#### `user_race_scores` (Could be a view or a physical table updated after race completion)
| Column | Type | Notes |
| :--- | :--- | :--- |
| `user_id` | UUID | Foreign Key to `users` |
| `race_id` | UUID | Foreign Key to `races` |
| `points_pole` | Integer | (0 or 15) |
| `points_p1` | Integer | (0 or 25) |
| `points_p2` | Integer | (0 or 18) |
| `points_p3` | Integer | (0 or 15) |
| `points_p10` | Integer | (0 or 10) |
| `points_crazy` | Integer | Variable based on race |
| `total_points` | Integer | Sum for the race |

## 4. UI/UX Flow & Page Structure

### General Layout
- **Navigation Bar:** Dashboard (Next Race), Leaderboard, Past Results, Admin Panel (if admin).

### Pages
1. **Login/Register Page**
   - Supabase Auth UI or custom form for email registration (from invite).
2. **Dashboard (Home)**
   - Highlights the next upcoming race and countdown to deadline.
   - Form to input predictions (dropdowns or visual grids with driver faces/team logos).
   - "Lock Picks" button.
3. **Race Details / Predictions Page**
   - Shows user's picks for a specific race.
   - If before deadline: allows editing (if not locked).
   - If after deadline: shows a table/grid of *everyone's* picks.
4. **Leaderboard**
   - Table showing users ranked by total season points.
5. **Results Hub**
   - List of completed races. Clicking a race shows the official results and points awarded to each user for that specific race.
6. **Admin Dashboard (Protected)**
   - Form to trigger email invites.
   - Form to create/edit races (setting dates, deadlines, crazy predictions).
   - Form to input final `race_results` and trigger scoring calculation.

## 5. Scoring Logic & Rules
- **Points Structure:**
  - Pole: 15
  - 1st: 25
  - 2nd: 18
  - 3rd: 15
  - 10th: 10
  - Crazy Prediction: Variable (set by admin per race)
- **Locking Logic:**
  - Users can manually click "Lock".
  - If a user doesn't click lock, picks are automatically considered locked when the current time passes the `races.prediction_deadline`.
- **Visibility:**
  - `predictions` rows belong strictly to the user until `races.prediction_deadline` is passed. Supabase Row Level Security (RLS) policies will enforce this.

## 6. Next Steps for Implementation
1. Set up the Next.js project and Supabase instance.
2. Run SQL scripts to create the tables, foreign keys, and RLS policies.
3. Build the Auth flow and layout.
4. Implement the Admin data entry views (adding teams, drivers, races).
5. Build the core Prediction interface for users.
6. Implement the results processing and Leaderboard logic.
7. Integrate email/SMS reminders (e.g., cron job using Supabase pg_cron or Vercel cron invoking an API route 24 hours before deadline).
