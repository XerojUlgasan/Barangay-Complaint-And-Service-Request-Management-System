# Project Structure

## Directory Organization

### Root Level
```
/
├── .amazonq/rules/memory-bank/    # AI assistant memory bank documentation
├── .firebase/                      # Firebase deployment cache
├── public/                         # Static assets and HTML template
├── src/                           # Application source code
├── package.json                   # Dependencies and scripts
├── firebase.json                  # Firebase hosting configuration
└── README.md                      # Project documentation
```

### Source Code Structure (`/src`)

#### `/src/components/` - Reusable UI Components
- **ChatBot.js**: AI chatbot interface for user assistance
- **Header.js**: Common header component
- **ImageLightbox.js**: Image viewer modal component
- **Layout.js**: Shared layout wrapper for Official/Admin portals
- **ResidentLayout.js**: Layout wrapper for Resident portal
- **ResidentSidebar.js**: Navigation sidebar for residents
- **Sidebar.js**: Navigation sidebar for officials/admins
- **RequestDetail.js**: Modal/component for viewing request details

#### `/src/pages/` - Page Components by User Role

**`/src/pages/guest/`** - Public Pages
- Home.js: Landing page
- Login.js: Authentication page

**`/src/pages/resident/`** - Resident Portal
- ResidentDashboard.js: Main dashboard with status overview
- SubmitRequest.js: Form for submitting certificates/complaints
- ResidentRequests.js: List of user's service requests
- ResidentComplaints.js: List of user's complaints
- ResidentAnnouncements.js: View barangay announcements

**`/src/pages/official/`** - Official Portal
- OfficialDashboard.js: Analytics and pending items overview
- OfficialRequests.js: Manage all service requests
- OfficialComplaints.js: Handle complaints
- OfficialAnnouncements.js: Create/manage announcements

**`/src/pages/admin/`** - Admin Portal
- AdminDashboard.js: System-wide analytics
- AdminRequests.js: Oversee all requests
- AdminAnnouncements.js: Full announcement management
- AdminUsers.js: User account management

#### `/src/supabse_db/` - Database Layer (Supabase Integration)

**Feature Modules:**
- `analytics/`: Analytics and reporting queries
- `announcement/`: Announcement CRUD operations
- `auth/`: Authentication and authorization
- `complaint/`: Complaint management operations
- `official/`: Official-specific operations
- `profile/`: User profile management
- `request/`: Service request operations
- `resident/`: Resident-specific operations
- `superadmin/`: Super admin operations

**Core Files:**
- `supabase_client.js`: Main Supabase client configuration
- `household_supabase_client.js`: Household data client
- `uploadImages.js`: Image upload utilities

#### `/src/context/` - React Context
- **AuthContext.js**: Global authentication state management

#### `/src/styles/` - CSS Stylesheets
- Auth.css: Authentication pages styling
- BarangayAdmin.css: Admin portal styles
- BarangayOfficial.css: Official portal styles
- ChatBot.css: Chatbot component styles
- Header.css: Header component styles
- Home.css: Landing page styles
- ImageLightbox.css: Lightbox modal styles
- Layout.css: Layout component styles
- RequestDetail.css: Request detail modal styles
- Requests.css: Request list styles
- Sidebar.css: Sidebar navigation styles
- UserPages.css: Resident portal styles
- theme.css: Global theme variables

#### Root Source Files
- **App.js**: Main application component with routing configuration
- **index.js**: Application entry point
- **App.test.js**: Application tests
- **setupTests.js**: Test configuration
- **reportWebVitals.js**: Performance monitoring

## Architectural Patterns

### Component Architecture
- **Role-Based Pages**: Separate page components for each user role (Guest, Resident, Official, Admin)
- **Layout Wrappers**: Shared layouts (Layout, ResidentLayout) provide consistent navigation and structure
- **Reusable Components**: Common UI elements (Sidebar, Header, Modals) used across portals

### Data Flow
1. **Authentication**: AuthContext provides global auth state to all components
2. **Database Layer**: Supabase client modules handle all backend operations
3. **Component State**: Local state for UI interactions, context for shared state
4. **Routing**: React Router manages navigation between role-based portals

### Separation of Concerns
- **Presentation**: React components in `/pages` and `/components`
- **Business Logic**: Database operations in `/supabse_db` modules
- **Styling**: Isolated CSS files in `/styles`
- **State Management**: Context API in `/context`

### Module Organization
- Feature-based organization in database layer (auth, request, complaint, etc.)
- Role-based organization in pages (guest, resident, official, admin)
- Component-based organization for reusable UI elements
