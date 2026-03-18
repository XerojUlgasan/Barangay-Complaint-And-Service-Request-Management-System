# Development Guidelines

## Code Quality Standards

### File Naming Conventions
- **React Components**: PascalCase (e.g., `ResidentSidebar.js`, `AuthContext.js`, `AdminDashboard.js`)
- **Utility Files**: camelCase (e.g., `reportWebVitals.js`, `setupTests.js`)
- **Database Modules**: snake_case for client files (e.g., `household_supabase_client.js`, `supabase_client.js`)
- **Folders**: lowercase with hyphens or underscores (e.g., `supabse_db/`, `memory-bank/`)

### Code Formatting
- **Line Endings**: CRLF (Windows-style `\r\n`)
- **Indentation**: 2 spaces (consistent across all files)
- **String Quotes**: Double quotes for JSX attributes, flexible for JavaScript
- **Semicolons**: Used consistently at end of statements
- **Arrow Functions**: Preferred for functional components and callbacks
- **Template Literals**: Used for multi-line strings and string interpolation

### Import Organization
Standard import order observed across the codebase:
1. External libraries (React, React Router, Supabase)
2. Internal utilities and contexts
3. Components
4. Styles
5. Assets

Example from `index.js`:
```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/theme.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
```

### Comment Standards
- **Inline Comments**: Used for complex logic explanation
- **Section Comments**: ALL CAPS for major sections (e.g., `// LOGOUT CONFIRMATION MODAL`)
- **TODO Comments**: Used to mark future improvements (e.g., `// TODO: Sanitize user inputs for security`)
- **Function Documentation**: Descriptive comments above complex functions explaining purpose

## React Patterns

### Component Structure
**Functional Components**: All components use modern React functional components with hooks

Standard component pattern:
```javascript
import React from "react";

const ComponentName = ({ prop1, prop2 }) => {
  // State declarations
  // Effect hooks
  // Event handlers
  // Render logic
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### State Management
- **Local State**: `useState` for component-specific state
- **Global State**: Context API via `AuthContext` for authentication and user data
- **Refs**: `useRef` for tracking values across renders without triggering re-renders (e.g., `lastLoadedUidRef` in AuthContext)

### Hooks Usage Patterns

**useState Pattern**:
```javascript
const [loading, setLoading] = useState(true);
const [userName, setUserName] = useState("Barangay User");
const [showModal, setShowModal] = useState(false);
```

**useEffect Pattern** (from AuthContext):
```javascript
useEffect(() => {
  let mounted = true;
  
  // Setup logic
  
  return () => {
    mounted = false;
    // Cleanup logic
  };
}, [dependencies]);
```

**useContext Pattern**:
```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### Event Handlers
- **Naming**: Prefix with `handle` (e.g., `handleLogout`, `handleSubmitChoice`)
- **Async Operations**: Use async/await with try-catch blocks
- **Error Handling**: Console.error for logging, user-friendly messages for UI

Example pattern:
```javascript
const handleLogout = async () => {
  try {
    await logout();
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
  }
};
```

### Conditional Rendering
- **Boolean Props**: Use short-circuit evaluation (`{showModal && <Modal />}`)
- **Ternary Operators**: For conditional classes (`className={isOpen ? "open" : ""}`)
- **Template Literals**: For dynamic class names (`className={\`sidebar\${isOpen ? " open" : ""}\`}`)

## Supabase Integration Patterns

### Client Configuration
Two separate Supabase clients for different databases:
- **Main Client** (`supabase_client.js`): Primary application database
- **Household Client** (`household_supabase_client.js`): Household/resident data

Standard client setup:
```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY"
);

export default supabase;
```

### Database Operations

**Query Pattern**:
```javascript
const { data, error } = await supabase
  .from("table_name")
  .select("columns")
  .eq("column", value)
  .maybeSingle();

if (error) {
  console.error("Error message:", error);
  return { success: false, message: error.message };
}
```

**Insert Pattern**:
```javascript
const { error } = await supabase
  .from("table_name")
  .insert({ field1: value1, field2: value2 });

if (error) {
  console.log("INSERT ERROR:", error);
  return { success: false, message: error.message };
}
```

**Update Pattern**:
```javascript
const { error } = await supabase
  .from("table_name")
  .update({ field: newValue })
  .eq("id", recordId);
```

**RPC (Remote Procedure Call) Pattern**:
```javascript
const { data, error } = await supabase.rpc("function_name", {
  param1: value1,
  param2: value2
});
```

### Authentication Patterns

**Auth State Listener** (from AuthContext):
```javascript
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    // Handle sign out
  }
  if (event === "TOKEN_REFRESHED") {
    // Handle token refresh
  }
  if (session?.user) {
    // Handle authenticated user
  }
});

return () => {
  subscription.unsubscribe();
};
```

**Sign Up Pattern**:
```javascript
const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: password,
});
```

**Sign In Pattern**:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password,
});
```

**Sign Out Pattern**:
```javascript
const { data, error } = await supabase.auth.signOut();
```

### Response Handling
Consistent response object structure:
```javascript
return {
  success: true/false,
  message: "User-friendly message",
  data: resultData, // optional
  role: userRole,   // optional for auth
};
```

## Routing Patterns

### Route Organization (from App.js)
- **Public Routes**: No authentication required (`/`, `/homepage`, `/login`)
- **Resident Routes**: Wrapped in `<ResidentLayout>` (`/dashboard`, `/requests`, `/complaints`)
- **Official Routes**: Nested under `/BarangayOfficial` with shared `<Layout>`
- **Admin Routes**: Nested under `/BarangayAdmin` with shared `<Layout>`

### Navigation Pattern
```javascript
<Route path="/parent" element={<Layout menuItems={[...]} />}>
  <Route index element={<DashboardComponent />} />
  <Route path="subroute" element={<SubComponent />} />
</Route>
```

### Programmatic Navigation
```javascript
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
navigate("/dashboard", { replace: true });
```

## Security Practices

### Input Sanitization
- TODO comment indicates need for user input sanitization
- Email normalization: `email.trim().toLowerCase()`
- Validation before database operations

### Authentication Guards
- Auth state checked via `AuthContext`
- Role-based access control (resident, official, superadmin)
- Redirect to login for unauthenticated users

### Credential Management
- **SECURITY ISSUE IDENTIFIED**: Hardcoded Supabase credentials in client files
- **RECOMMENDATION**: Move to environment variables (`.env` file)
- Use `process.env.REACT_APP_SUPABASE_URL` and `process.env.REACT_APP_SUPABASE_ANON_KEY`

## Testing Standards

### Test Setup
- **Testing Library**: React Testing Library
- **Test Runner**: Jest (via Create React App)
- **Custom Matchers**: `@testing-library/jest-dom` for DOM assertions

### Test Pattern (from App.test.js):
```javascript
import { render, screen } from '@testing-library/react';
import ComponentName from './ComponentName';

test('descriptive test name', () => {
  render(<ComponentName />);
  const element = screen.getByText(/expected text/i);
  expect(element).toBeInTheDocument();
});
```

## Performance Monitoring

### Web Vitals Integration
Performance metrics tracked via `reportWebVitals.js`:
- **CLS**: Cumulative Layout Shift
- **FID**: First Input Delay
- **FCP**: First Contentful Paint
- **LCP**: Largest Contentful Paint
- **TTFB**: Time to First Byte

Usage pattern:
```javascript
import reportWebVitals from './reportWebVitals';

// Log to console or send to analytics
reportWebVitals(console.log);
```

## Common Code Idioms

### Mounted Flag Pattern
Prevents state updates on unmounted components:
```javascript
useEffect(() => {
  let mounted = true;
  
  const fetchData = async () => {
    const result = await apiCall();
    if (mounted) setState(result);
  };
  
  fetchData();
  
  return () => {
    mounted = false;
  };
}, []);
```

### Null Coalescing for Display
```javascript
<h1>Welcome, {userName || "..."}!</h1>
<h2>{loading ? "..." : count}</h2>
```

### Array Filter and Join for Names
```javascript
const fullName = [firstname, middlename, lastname]
  .filter(Boolean)
  .join(" ");
```

### Modal Overlay Pattern
```javascript
<div className="modal-overlay" onClick={closeModal}>
  <div className="modal" onClick={(e) => e.stopPropagation()}>
    {/* Modal content */}
  </div>
</div>
```

### SVG Icon Pattern
Inline SVG icons with consistent viewBox and stroke properties:
```javascript
<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  width="20"
  height="20"
>
  <path d="..." />
</svg>
```

## Module Exports

### Default Exports
- Components: `export default ComponentName;`
- Clients: `export default supabase;`
- Utilities: `export default reportWebVitals;`

### Named Exports
- Multiple functions from utility modules
- Context hooks: `export function useAuth() { ... }`
- Database operations: `export const loginByEmail = async () => { ... }`

## Error Handling

### Console Logging Pattern
- `console.log()`: Debug information and flow tracking
- `console.error()`: Error conditions
- Descriptive prefixes: `"Error checking user role:"`, `"LOGIN ATTEMPT:"`

### User-Facing Errors
Return structured error objects with user-friendly messages:
```javascript
if (error) {
  return {
    success: false,
    message: "User-friendly error message"
  };
}
```

## Accessibility Considerations

### ARIA Labels
```javascript
<button aria-label="Close menu">
  <svg>...</svg>
</button>
```

### Semantic HTML
- Use appropriate HTML elements (`<aside>`, `<main>`, `<button>`)
- Proper heading hierarchy (`<h1>`, `<h2>`, `<h3>`, `<h4>`)

## CSS Architecture

### File Organization
- Component-specific styles in separate CSS files
- Global theme variables in `theme.css`
- Framework styles (Bootstrap) imported globally

### Class Naming
- BEM-like conventions: `logout-modal-overlay`, `submit-modal-option`
- State classes: `active`, `open`, `visible`
- Utility classes from Bootstrap

## Development Workflow

### Local Development
```bash
npm start  # Start dev server on localhost:3000
```

### Production Build
```bash
npm run build  # Create optimized production build
```

### Deployment
- Firebase Hosting configured
- Build artifacts in `/build` folder
- Configuration in `firebase.json` and `.firebaserc`
