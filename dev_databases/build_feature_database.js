#!/usr/bin/env node
/**
 * FringeIsland Feature Catalog Database Builder
 * Creates and populates the SQLite feature database
 */

const fs = require('fs');
const path = require('path');

// Check if better-sqlite3 is available
let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  console.error('Error: better-sqlite3 not found.');
  console.error('Please install it: npm install better-sqlite3');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, 'featuresDB.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('🔨 Building FringeIsland Feature Catalog Database...\n');

// Remove existing database
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('✓ Removed existing database');
}

// Create new database
const db = new Database(DB_PATH);
console.log('✓ Created new database:', DB_PATH);

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
console.log('✓ Schema created successfully\n');

// ============================================
// Feature Data
// ============================================

const features = [];

// Helper function to add features
function addFeature(data) {
  features.push(data);
  return features.length; // Return ID for parent reference
}

console.log('📝 Populating features...\n');

// ============================================
// LEVEL 0: Root Categories
// ============================================

const cat_pages = addFeature({
  parent_id: null,
  name: 'Pages & Routes',
  description: 'All application pages and routing structure',
  category: 'Pages',
  status: 'completed',
  level: 0,
  sort_order: 1,
  tags: JSON.stringify(['navigation', 'routes', 'pages']),
  version_added: 'v0.1.0'
});

const cat_auth = addFeature({
  parent_id: null,
  name: 'Authentication System',
  description: 'User authentication, authorization, and session management',
  category: 'Authentication',
  status: 'completed',
  level: 0,
  sort_order: 2,
  tags: JSON.stringify(['auth', 'security', 'session']),
  version_added: 'v0.1.0'
});

const cat_groups = addFeature({
  parent_id: null,
  name: 'Group Management',
  description: 'Features for creating, managing, and organizing groups',
  category: 'Groups',
  status: 'completed',
  level: 0,
  sort_order: 3,
  tags: JSON.stringify(['groups', 'teams', 'collaboration']),
  version_added: 'v0.2.0'
});

const cat_journeys = addFeature({
  parent_id: null,
  name: 'Journey System',
  description: 'Learning journey catalog, enrollment, and progress tracking',
  category: 'Journeys',
  status: 'in-progress',
  level: 0,
  sort_order: 4,
  tags: JSON.stringify(['journeys', 'learning', 'education']),
  version_added: 'v0.2.8'
});

const cat_ui = addFeature({
  parent_id: null,
  name: 'UI Components',
  description: 'Reusable UI components, modals, forms, and design patterns',
  category: 'UI',
  status: 'completed',
  level: 0,
  sort_order: 5,
  tags: JSON.stringify(['ui', 'components', 'design']),
  version_added: 'v0.1.0'
});

const cat_database = addFeature({
  parent_id: null,
  name: 'Database Architecture',
  description: 'Database schema, triggers, policies, and data integrity',
  category: 'Database',
  status: 'completed',
  level: 0,
  sort_order: 6,
  tags: JSON.stringify(['database', 'postgresql', 'supabase']),
  version_added: 'v0.1.0'
});

// ============================================
// LEVEL 1: Sub-categories
// ============================================

// Pages sub-categories
const subcat_public_pages = addFeature({
  parent_id: cat_pages,
  name: 'Public Pages',
  description: 'Pages accessible without authentication',
  category: 'Pages',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.1.0'
});

const subcat_protected_pages = addFeature({
  parent_id: cat_pages,
  name: 'Protected Pages',
  description: 'Pages requiring authentication',
  category: 'Pages',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.0'
});

const subcat_error_pages = addFeature({
  parent_id: cat_pages,
  name: 'Error Pages',
  description: 'Error handling and fallback pages',
  category: 'Pages',
  status: 'completed',
  level: 1,
  sort_order: 3,
  version_added: 'v0.2.9'
});

// Authentication sub-categories
const subcat_auth_core = addFeature({
  parent_id: cat_auth,
  name: 'Core Authentication',
  description: 'Login, signup, logout, and session management',
  category: 'Authentication',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.1.0'
});

const subcat_profile = addFeature({
  parent_id: cat_auth,
  name: 'Profile Management',
  description: 'User profile viewing and editing',
  category: 'Authentication',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.0'
});

// Groups sub-categories
const subcat_group_lifecycle = addFeature({
  parent_id: cat_groups,
  name: 'Group Lifecycle',
  description: 'Creating, editing, and managing groups',
  category: 'Groups',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.2.0'
});

const subcat_membership = addFeature({
  parent_id: cat_groups,
  name: 'Membership Management',
  description: 'Inviting, accepting, removing members',
  category: 'Groups',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.5'
});

const subcat_roles = addFeature({
  parent_id: cat_groups,
  name: 'Role Management',
  description: 'Assigning and managing user roles within groups',
  category: 'Groups',
  status: 'completed',
  level: 1,
  sort_order: 3,
  version_added: 'v0.2.6'
});

// Journeys sub-categories
const subcat_journey_discovery = addFeature({
  parent_id: cat_journeys,
  name: 'Journey Discovery',
  description: 'Browsing, searching, and filtering journeys',
  category: 'Journeys',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.2.8'
});

const subcat_journey_enrollment = addFeature({
  parent_id: cat_journeys,
  name: 'Journey Enrollment',
  description: 'Enrolling in journeys individually or as a group',
  category: 'Journeys',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.10'
});

const subcat_journey_progress = addFeature({
  parent_id: cat_journeys,
  name: 'Journey Progress',
  description: 'Tracking and displaying journey progress',
  category: 'Journeys',
  status: 'planned',
  level: 1,
  sort_order: 3,
  priority: 'high',
  notes: 'Next major feature to implement'
});

// UI sub-categories
const subcat_ui_global = addFeature({
  parent_id: cat_ui,
  name: 'Global Components',
  description: 'Navigation, layout, and app-wide UI elements',
  category: 'UI',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.1.0'
});

const subcat_ui_modals = addFeature({
  parent_id: cat_ui,
  name: 'Modal Components',
  description: 'Reusable modal dialogs and overlays',
  category: 'UI',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.0'
});

const subcat_ui_forms = addFeature({
  parent_id: cat_ui,
  name: 'Form Components',
  description: 'Input forms with validation',
  category: 'UI',
  status: 'completed',
  level: 1,
  sort_order: 3,
  version_added: 'v0.2.0'
});

// Database sub-categories
const subcat_db_tables = addFeature({
  parent_id: cat_database,
  name: 'Database Tables',
  description: 'Core data tables and relationships',
  category: 'Database',
  status: 'completed',
  level: 1,
  sort_order: 1,
  version_added: 'v0.1.0'
});

const subcat_db_security = addFeature({
  parent_id: cat_database,
  name: 'Security & RLS',
  description: 'Row Level Security policies and triggers',
  category: 'Database',
  status: 'completed',
  level: 1,
  sort_order: 2,
  version_added: 'v0.2.3'
});

// ============================================
// LEVEL 2: Actual Features - Public Pages
// ============================================

addFeature({
  parent_id: subcat_public_pages,
  name: 'Landing Page',
  description: 'Home page with journey metaphor and signup/login CTAs',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/page.tsx']),
  required_role: 'Public',
  tech_stack: 'Next.js 16, React, Tailwind CSS',
  tags: JSON.stringify(['landing', 'home', 'public']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_public_pages,
  name: 'Login Page',
  description: 'User authentication page with email/password form',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/login/page.tsx', '/components/auth/AuthForm.tsx']),
  required_role: 'Public',
  tech_stack: 'Supabase Auth, React',
  tags: JSON.stringify(['login', 'authentication']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_public_pages,
  name: 'Signup Page',
  description: 'New user registration with email, password, and display name',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/signup/page.tsx', '/components/auth/AuthForm.tsx']),
  required_role: 'Public',
  tech_stack: 'Supabase Auth, React',
  tags: JSON.stringify(['signup', 'registration']),
  version_added: 'v0.1.0'
});

// ============================================
// LEVEL 2: Protected Pages
// ============================================

addFeature({
  parent_id: subcat_protected_pages,
  name: 'My Groups Page',
  description: 'List of user\'s group memberships with member counts (default landing)',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['groups', 'dashboard']),
  version_added: 'v0.2.0',
  notes: 'Default landing page after login/signup (v0.2.6.2)'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Create Group Page',
  description: 'Form to create new groups with templates and settings',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/create/page.tsx', '/components/groups/GroupCreateForm.tsx']),
  required_role: 'Any authenticated user',
  required_permissions: JSON.stringify(['create_group']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'create']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Group Detail Page',
  description: 'View group info, members list, roles, and management actions',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Member',
  tech_stack: 'Next.js Dynamic Routes, Supabase',
  tags: JSON.stringify(['groups', 'detail', 'members', 'roles']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Edit Group Page',
  description: 'Update group settings (name, description, visibility, member list visibility)',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/edit/page.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['edit_group_settings']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'edit', 'settings']),
  version_added: 'v0.2.7'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'User Profile Page',
  description: 'Display user profile with avatar, name, bio, email, join date',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/profile/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['profile', 'user']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Edit Profile Page',
  description: 'Update full name, bio, and upload avatar image',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/profile/edit/page.tsx', '/components/profile/ProfileEditForm.tsx', '/components/profile/AvatarUpload.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase Storage',
  tags: JSON.stringify(['profile', 'edit', 'avatar']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Invitations Page',
  description: 'Manage pending group invitations (accept/decline)',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/invitations/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['invitations', 'groups']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Journey Catalog Page',
  description: 'Browse and search all published journeys with filters',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['journeys', 'catalog', 'search']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'Journey Detail Page',
  description: 'View journey info, curriculum steps, and enroll button',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/[id]/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js Dynamic Routes, Supabase',
  tags: JSON.stringify(['journeys', 'detail', 'curriculum']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_protected_pages,
  name: 'My Journeys Page',
  description: 'View individual and group-enrolled journeys with progress',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/my-journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['journeys', 'enrollment', 'progress']),
  version_added: 'v0.2.10'
});

// ============================================
// LEVEL 2: Error Pages
// ============================================

addFeature({
  parent_id: subcat_error_pages,
  name: 'Route Error Page',
  description: 'Catches route-level errors with try again option',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/error.tsx']),
  required_role: 'Public',
  tech_stack: 'Next.js Error Boundary',
  tags: JSON.stringify(['error', 'boundary']),
  version_added: 'v0.2.9'
});

addFeature({
  parent_id: subcat_error_pages,
  name: 'Global Error Page',
  description: 'Catches root layout errors with reload fallback',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/global-error.tsx']),
  required_role: 'Public',
  tech_stack: 'Next.js Error Boundary',
  tags: JSON.stringify(['error', 'boundary', 'global']),
  version_added: 'v0.2.9'
});

addFeature({
  parent_id: subcat_error_pages,
  name: '404 Not Found Page',
  description: 'Custom 404 page for non-existent routes',
  category: 'Pages',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/not-found.tsx']),
  required_role: 'Public',
  tech_stack: 'Next.js',
  tags: JSON.stringify(['404', 'not-found']),
  version_added: 'v0.2.9'
});

// ============================================
// LEVEL 2: Core Authentication Features
// ============================================

addFeature({
  parent_id: subcat_auth_core,
  name: 'User Signup',
  description: 'Register new users with email, password, and display name',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'component',
  implementation_files: JSON.stringify(['/components/auth/AuthForm.tsx', 'Supabase Auth']),
  required_role: 'Public',
  tech_stack: 'Supabase Auth, React',
  tags: JSON.stringify(['signup', 'registration']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_auth_core,
  name: 'User Login',
  description: 'Sign in with email and password',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'component',
  implementation_files: JSON.stringify(['/components/auth/AuthForm.tsx', 'Supabase Auth']),
  required_role: 'Public',
  tech_stack: 'Supabase Auth, React',
  tags: JSON.stringify(['login', 'signin']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_auth_core,
  name: 'User Logout',
  description: 'Sign out and clear session',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'component',
  implementation_files: JSON.stringify(['/components/Navigation.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Supabase Auth',
  tags: JSON.stringify(['logout', 'signout']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_auth_core,
  name: 'Session Management',
  description: 'Maintain user session via Supabase Auth',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'hook',
  implementation_files: JSON.stringify(['/lib/auth/AuthContext.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Supabase Auth, React Context',
  tags: JSON.stringify(['session', 'auth', 'context']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_auth_core,
  name: 'Protected Routes',
  description: 'Route middleware checks authentication status',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'utility',
  implementation_files: JSON.stringify(['/lib/supabase/middleware.ts', 'proxy.ts']),
  required_role: 'System',
  tech_stack: 'Next.js 16 Middleware',
  tags: JSON.stringify(['middleware', 'auth', 'routes']),
  version_added: 'v0.1.0',
  notes: 'Next.js 16 uses proxy.ts instead of middleware.ts'
});

addFeature({
  parent_id: subcat_auth_core,
  name: 'Auth Redirect',
  description: 'Redirect unauthenticated users to login page',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'hook',
  implementation_files: JSON.stringify(['/lib/auth/AuthContext.tsx']),
  required_role: 'System',
  tech_stack: 'React Router, Next.js',
  tags: JSON.stringify(['redirect', 'auth']),
  version_added: 'v0.1.0'
});

// ============================================
// LEVEL 2: Profile Management Features
// ============================================

addFeature({
  parent_id: subcat_profile,
  name: 'Create User Profile',
  description: 'Auto-create profile on signup via database trigger',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'trigger',
  implementation_files: JSON.stringify(['Database: on_auth_user_created trigger']),
  required_role: 'System',
  tech_stack: 'PostgreSQL Trigger',
  tags: JSON.stringify(['profile', 'trigger', 'database']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_profile,
  name: 'Update Full Name',
  description: 'Edit user\'s full name (2-100 characters)',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'form',
  implementation_files: JSON.stringify(['/components/profile/ProfileEditForm.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['profile', 'edit']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_profile,
  name: 'Update Bio',
  description: 'Edit user bio (max 500 characters)',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'form',
  implementation_files: JSON.stringify(['/components/profile/ProfileEditForm.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['profile', 'edit', 'bio']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_profile,
  name: 'Avatar Upload',
  description: 'Upload JPG/PNG/WebP avatar (max 2MB)',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'component',
  implementation_files: JSON.stringify(['/components/profile/AvatarUpload.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase Storage',
  tags: JSON.stringify(['profile', 'avatar', 'upload']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_profile,
  name: 'Soft Delete on Account Deletion',
  description: 'Mark users as inactive instead of deleting via trigger',
  category: 'Authentication',
  status: 'completed',
  level: 2,
  component_type: 'trigger',
  implementation_files: JSON.stringify(['Database: on_auth_user_deleted trigger']),
  required_role: 'System',
  tech_stack: 'PostgreSQL Trigger',
  tags: JSON.stringify(['profile', 'delete', 'soft-delete']),
  version_added: 'v0.2.3'
});

// ============================================
// LEVEL 2: Group Lifecycle Features
// ============================================

addFeature({
  parent_id: subcat_group_lifecycle,
  name: 'Create Groups',
  description: 'Create new groups from templates with custom settings',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'form',
  implementation_files: JSON.stringify(['/components/groups/GroupCreateForm.tsx', 'groups table']),
  required_role: 'Any authenticated user',
  required_permissions: JSON.stringify(['create_group']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'create']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_group_lifecycle,
  name: 'Group Templates',
  description: 'Pre-configured group templates (Small Team, Large Group, Organization, Learning Cohort)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'database',
  implementation_files: JSON.stringify(['group_templates table', 'Migration: initial_schema.sql']),
  required_role: 'System',
  tech_stack: 'PostgreSQL',
  tags: JSON.stringify(['groups', 'templates']),
  version_added: 'v0.1.0'
});

addFeature({
  parent_id: subcat_group_lifecycle,
  name: 'Edit Group Settings',
  description: 'Update name, description, label, visibility (Public/Private), member list visibility',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/edit/page.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['edit_group_settings']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'edit', 'settings']),
  version_added: 'v0.2.7'
});

addFeature({
  parent_id: subcat_group_lifecycle,
  name: 'View Group Details',
  description: 'Display group name, description, label, member count, visibility status',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Member',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['groups', 'detail']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_group_lifecycle,
  name: 'View Group List',
  description: 'List all user\'s active groups with metadata',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['groups', 'list']),
  version_added: 'v0.2.0'
});

// ============================================
// LEVEL 2: Membership Management Features
// ============================================

addFeature({
  parent_id: subcat_membership,
  name: 'Invite Members',
  description: 'Invite users by email with validation (email exists, not already member/invited)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'modal',
  implementation_files: JSON.stringify(['/components/groups/InviteMemberModal.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['invite_members']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'invite', 'members']),
  version_added: 'v0.2.7'
});

addFeature({
  parent_id: subcat_membership,
  name: 'Accept Invitation',
  description: 'Accept pending group invitation (status: invited → active)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/invitations/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['invitations', 'accept']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_membership,
  name: 'Decline Invitation',
  description: 'Reject pending group invitation (removes membership record)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/invitations/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['invitations', 'decline']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_membership,
  name: 'View Pending Invitations',
  description: 'See all pending group invitations with count badge in navigation',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/invitations/page.tsx', '/components/Navigation.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['invitations', 'badge']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_membership,
  name: 'Leave Group',
  description: 'Remove self from active group (updates status to removed)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Member',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'leave']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_membership,
  name: 'Remove Members',
  description: 'Group Leaders can remove active members from the group',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['remove_members']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'members', 'remove']),
  version_added: 'v0.2.5'
});

addFeature({
  parent_id: subcat_membership,
  name: 'View Group Members',
  description: 'See list of active members with roles (if show_member_list enabled)',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Member',
  required_permissions: JSON.stringify(['view_member_list']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'members', 'list']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_membership,
  name: 'Member Status Tracking',
  description: 'Track member status (active, invited, paused, removed) with CHECK constraint',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'database',
  implementation_files: JSON.stringify(['group_memberships.status field']),
  required_role: 'System',
  tech_stack: 'PostgreSQL',
  tags: JSON.stringify(['groups', 'members', 'status']),
  version_added: 'v0.2.0'
});

// ============================================
// LEVEL 2: Role Management Features
// ============================================

addFeature({
  parent_id: subcat_roles,
  name: 'Group Leader Auto-Assignment',
  description: 'Automatically assign Group Leader role to group creator',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'trigger',
  implementation_files: JSON.stringify(['Database trigger']),
  required_role: 'System',
  tech_stack: 'PostgreSQL Trigger',
  tags: JSON.stringify(['groups', 'roles', 'leader']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Assign Roles',
  description: 'Group Leaders can assign multiple roles to members via modal',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'modal',
  implementation_files: JSON.stringify(['/components/groups/AssignRoleModal.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['assign_roles']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'roles', 'assign']),
  version_added: 'v0.2.6'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Remove Roles',
  description: 'Group Leaders can remove roles from members with confirmation',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx', '/components/ui/ConfirmModal.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['remove_roles']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'roles', 'remove']),
  version_added: 'v0.2.6'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Last Leader Protection (UI)',
  description: 'Hide remove button if user is the last Group Leader',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'System',
  tech_stack: 'React',
  tags: JSON.stringify(['groups', 'roles', 'leader', 'protection']),
  version_added: 'v0.2.6.2'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Last Leader Protection (Database)',
  description: 'Database trigger prevents removing last Group Leader from group',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'trigger',
  implementation_files: JSON.stringify(['Database: prevent_last_leader_removal() trigger', 'Migration: 20260125_6_prevent_last_leader_removal.sql']),
  required_role: 'System',
  tech_stack: 'PostgreSQL Trigger',
  tags: JSON.stringify(['groups', 'roles', 'leader', 'protection', 'trigger']),
  version_added: 'v0.2.6'
});

addFeature({
  parent_id: subcat_roles,
  name: 'View Member Roles',
  description: 'Display all roles assigned to each member in group detail',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/groups/[id]/page.tsx']),
  required_role: 'Group Member',
  required_permissions: JSON.stringify(['view_member_list']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['groups', 'roles', 'view']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Multiple Roles per User',
  description: 'Users can have multiple roles in the same group',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'database',
  implementation_files: JSON.stringify(['user_group_roles junction table']),
  required_role: 'System',
  tech_stack: 'PostgreSQL',
  tags: JSON.stringify(['groups', 'roles', 'multiple']),
  version_added: 'v0.2.0'
});

addFeature({
  parent_id: subcat_roles,
  name: 'Custom Group Roles',
  description: 'Groups can create custom role types beyond templates',
  category: 'Groups',
  status: 'completed',
  level: 2,
  component_type: 'database',
  implementation_files: JSON.stringify(['group_roles table']),
  required_role: 'Group Leader',
  tech_stack: 'PostgreSQL',
  tags: JSON.stringify(['groups', 'roles', 'custom']),
  version_added: 'v0.2.0'
});

// ============================================
// LEVEL 2: Journey Discovery Features
// ============================================

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Journey Catalog',
  description: 'Browse all published public journeys in card grid',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['journeys', 'catalog', 'browse']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Search Journeys',
  description: 'Search journeys by title and description',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Client-side filtering',
  tags: JSON.stringify(['journeys', 'search']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Filter by Difficulty',
  description: 'Filter journeys by difficulty level (Beginner, Intermediate, Advanced)',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React',
  tags: JSON.stringify(['journeys', 'filter', 'difficulty']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Filter by Tags',
  description: 'Filter journeys by topic tags',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React',
  tags: JSON.stringify(['journeys', 'filter', 'tags']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Journey Detail View',
  description: 'Display journey info, curriculum steps, and enrollment status',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/[id]/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js Dynamic Routes, Supabase',
  tags: JSON.stringify(['journeys', 'detail']),
  version_added: 'v0.2.8'
});

addFeature({
  parent_id: subcat_journey_discovery,
  name: 'Predefined Journeys',
  description: '8 high-quality seeded journeys (Leadership, Communication, Teams, etc.)',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'database',
  implementation_files: JSON.stringify(['Migration: 20260127_seed_predefined_journeys.sql']),
  required_role: 'System',
  tech_stack: 'PostgreSQL Migration',
  tags: JSON.stringify(['journeys', 'seed', 'content']),
  version_added: 'v0.2.8'
});

// ============================================
// LEVEL 2: Journey Enrollment Features
// ============================================

addFeature({
  parent_id: subcat_journey_enrollment,
  name: 'Individual Enrollment',
  description: 'Users can enroll themselves in journeys',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'modal',
  implementation_files: JSON.stringify(['/components/journeys/EnrollmentModal.tsx']),
  required_role: 'Any authenticated user',
  required_permissions: JSON.stringify(['enroll_self_in_journey']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['journeys', 'enrollment', 'individual']),
  version_added: 'v0.2.10'
});

addFeature({
  parent_id: subcat_journey_enrollment,
  name: 'Group Enrollment',
  description: 'Group Leaders can enroll entire group in journeys',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'modal',
  implementation_files: JSON.stringify(['/components/journeys/EnrollmentModal.tsx']),
  required_role: 'Group Leader',
  required_permissions: JSON.stringify(['enroll_group_in_journey']),
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['journeys', 'enrollment', 'group']),
  version_added: 'v0.2.10'
});

addFeature({
  parent_id: subcat_journey_enrollment,
  name: 'Enrollment Modal',
  description: 'Two-tab modal for individual/group enrollment selection',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'modal',
  implementation_files: JSON.stringify(['/components/journeys/EnrollmentModal.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React',
  tags: JSON.stringify(['journeys', 'enrollment', 'modal']),
  version_added: 'v0.2.10'
});

addFeature({
  parent_id: subcat_journey_enrollment,
  name: 'Enrollment Validation',
  description: 'Check if already enrolled (individual or via group) before allowing enrollment',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/journeys/[id]/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'React, Supabase',
  tags: JSON.stringify(['journeys', 'enrollment', 'validation']),
  version_added: 'v0.2.10'
});

addFeature({
  parent_id: subcat_journey_enrollment,
  name: 'My Journeys View',
  description: 'View all individual and group-enrolled journeys with tabs',
  category: 'Journeys',
  status: 'completed',
  level: 2,
  component_type: 'page',
  implementation_files: JSON.stringify(['/app/my-journeys/page.tsx']),
  required_role: 'Any authenticated user',
  tech_stack: 'Next.js, Supabase',
  tags: JSON.stringify(['journeys', 'enrollment', 'my-journeys']),
  version_added: 'v0.2.10'
});

// ============================================
// Insert all features
// ============================================

const insert = db.prepare(`
  INSERT INTO features (
    parent_id, name, description, category, status, level, sort_order,
    component_type, implementation_files, required_role, required_permissions,
    tech_stack, tags, notes, version_added, priority
  ) VALUES (
    @parent_id, @name, @description, @category, @status, @level, @sort_order,
    @component_type, @implementation_files, @required_role, @required_permissions,
    @tech_stack, @tags, @notes, @version_added, @priority
  )
`);

const insertMany = db.transaction((features) => {
  for (const feature of features) {
    // Ensure all fields have values (use null for missing optional fields)
    const featureData = {
      parent_id: feature.parent_id || null,
      name: feature.name,
      description: feature.description || null,
      category: feature.category,
      status: feature.status || 'completed',
      level: feature.level || 0,
      sort_order: feature.sort_order || 0,
      component_type: feature.component_type || null,
      implementation_files: feature.implementation_files || null,
      required_role: feature.required_role || null,
      required_permissions: feature.required_permissions || null,
      tech_stack: feature.tech_stack || null,
      tags: feature.tags || null,
      notes: feature.notes || null,
      version_added: feature.version_added || null,
      priority: feature.priority || null
    };
    insert.run(featureData);
  }
});

insertMany(features);

console.log(`✓ Inserted ${features.length} features\n`);

// ============================================
// Display Summary
// ============================================

console.log('📊 Database Statistics:\n');

const stats = db.prepare('SELECT category, status, COUNT(*) as count FROM features GROUP BY category, status ORDER BY category, status').all();
stats.forEach(row => {
  console.log(`   ${row.category.padEnd(20)} [${row.status.padEnd(12)}] ${row.count}`);
});

console.log('\n🎉 Feature catalog database built successfully!');
console.log(`📁 Location: ${DB_PATH}`);
console.log('\n💡 Sample queries:');
console.log('   sqlite3 featuresDB.db "SELECT * FROM v_root_features;"');
console.log('   sqlite3 featuresDB.db "SELECT * FROM v_feature_stats;"');
console.log('   sqlite3 featuresDB.db "SELECT * FROM v_feature_hierarchy WHERE category=\'Groups\';"');

db.close();
