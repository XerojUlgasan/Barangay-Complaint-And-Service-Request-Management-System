# Technology Stack

## Programming Languages
- **JavaScript (ES6+)**: Primary language for application logic
- **JSX**: React component markup
- **CSS3**: Styling and layouts
- **HTML5**: Base markup (via React)

## Core Framework & Libraries

### Frontend Framework
- **React 19.2.4**: UI component library
- **React DOM 19.2.4**: React rendering for web
- **React Router DOM 7.13.0**: Client-side routing and navigation

### Build System
- **Create React App (react-scripts 5.0.1)**: Build tooling and development server
  - Webpack bundling
  - Babel transpilation
  - Development server with hot reload
  - Production build optimization

## Key Dependencies

### Backend & Database
- **@supabase/supabase-js 2.95.3**: Supabase client for backend services
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage for file uploads

### UI & Styling
- **Bootstrap 5.3.8**: CSS framework for responsive layouts
- **Lucide React 0.563.0**: Icon library for UI elements

### Data Visualization
- **Recharts 3.7.0**: Charting library for analytics dashboards

### Testing
- **@testing-library/react 16.3.2**: React component testing utilities
- **@testing-library/jest-dom 6.9.1**: Custom Jest matchers for DOM
- **@testing-library/user-event 13.5.0**: User interaction simulation
- **@testing-library/dom 10.4.1**: DOM testing utilities

### Performance Monitoring
- **web-vitals 2.1.4**: Core Web Vitals measurement

## Development Tools

### Package Management
- **npm 11.9.0**: Package manager and script runner

### Code Quality
- **ESLint**: Linting (configured via react-app preset)
  - react-app
  - react-app/jest

## Deployment & Hosting

### Firebase
- **Firebase Hosting**: Static site hosting
- Configuration files:
  - `.firebaserc`: Firebase project configuration
  - `firebase.json`: Hosting rules and settings

## Available Scripts

### Development
```bash
npm start
```
- Runs development server at http://localhost:3000
- Enables hot module replacement
- Shows lint errors in console

### Testing
```bash
npm test
```
- Launches Jest test runner in watch mode
- Runs all test files matching `*.test.js` pattern

### Production Build
```bash
npm run build
```
- Creates optimized production build in `/build` folder
- Minifies code and assets
- Generates hashed filenames for cache busting
- Ready for deployment

### Eject (One-way operation)
```bash
npm run eject
```
- Exposes all configuration files
- Removes Create React App abstraction
- Provides full control over build configuration

## Browser Support

### Production
- >0.2% market share
- Not dead browsers
- Excludes Opera Mini

### Development
- Latest Chrome version
- Latest Firefox version
- Latest Safari version

## Environment Configuration
- Supabase connection configured via environment variables
- Firebase project settings in `.firebaserc`
- Public assets served from `/public` directory

## Project Metadata
- **Name**: baranggay_service
- **Version**: 0.1.0
- **Private**: true (not published to npm)
