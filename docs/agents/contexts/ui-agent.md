# UI Agent Context

**Purpose:** Context for UI components, styling, and user experience
**For:** Creating components, modals, forms, styling, responsive design
**Last Updated:** February 4, 2026

---

## 🎯 Quick Reference

**Framework:** Next.js 16.1 with App Router
**Styling:** Tailwind CSS 3.x
**Components:** React 19+ with TypeScript
**Icons:** Unicode emojis (no icon library)
**State:** React Context + local state
**Forms:** Controlled components with validation

---

## 🎨 Design System

### Color Palette
```css
/* Primary gradient (brand) */
bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800

/* Status colors */
bg-green-600     /* Success, active */
bg-yellow-500    /* Warning */
bg-red-600       /* Danger, error */
bg-gray-500      /* Neutral, paused */
bg-blue-600      /* Info, primary action */

/* Text colors */
text-gray-900    /* Primary text (light mode) */
text-gray-700    /* Secondary text */
text-white       /* On colored backgrounds */
text-blue-600    /* Links */

/* Backgrounds */
bg-white         /* Cards, containers */
bg-gray-50       /* Page backgrounds */
bg-gray-100      /* Subtle sections */
```

### Typography
```css
/* Headings */
text-3xl font-bold   /* Page titles */
text-2xl font-bold   /* Section titles */
text-xl font-semibold /* Card titles */
text-lg font-medium  /* Subsections */

/* Body text */
text-base            /* Default text */
text-sm              /* Secondary text */
text-xs              /* Metadata, labels */
```

### Spacing
```css
/* Containers */
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8  /* Page container */
py-12  /* Vertical page padding */

/* Cards */
p-6    /* Card padding */
space-y-4  /* Vertical spacing between elements */
gap-4  /* Grid/flex gap */

/* Responsive */
sm:   /* 640px+ */
md:   /* 768px+ */
lg:   /* 1024px+ */
xl:   /* 1280px+ */
```

---

## 🧩 Component Patterns

### Modal Pattern
**Use:** ConfirmModal for all confirmations (NEVER browser alert/confirm)

```typescript
import ConfirmModal from '@/components/ui/ConfirmModal';

const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
});

// Open modal
setConfirmModal({
  isOpen: true,
  title: 'Confirm Action?',
  message: 'Are you sure you want to do this?',
  onConfirm: async () => {
    // Do action
    await performAction();
    setConfirmModal({ ...confirmModal, isOpen: false });
  },
});

// Render
<ConfirmModal
  isOpen={confirmModal.isOpen}
  title={confirmModal.title}
  message={confirmModal.message}
  onConfirm={confirmModal.onConfirm}
  onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
  variant="danger"  // or "warning" or "info"
/>
```

**ConfirmModal Variants:**
- `danger` - Red, for destructive actions (delete, remove)
- `warning` - Yellow, for caution actions (leave group)
- `info` - Blue, for informational confirmations (default)

### Custom Modal Pattern
**For complex forms** (e.g., AssignRoleModal, EnrollmentModal)

```typescript
// Modal component structure
export default function CustomModal({
  isOpen,
  onClose,
  onSuccess,
  // ...other props
}: CustomModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Do action
      await performAction();
      onSuccess?.();
      onClose();
    } catch (error) {
      // Show error
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Form fields */}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Form Pattern
**Controlled components** with validation

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  description: '',
});

const [errors, setErrors] = useState<Record<string, string>>({});

const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  // Clear error on change
  if (errors[name]) {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

const validate = () => {
  const newErrors: Record<string, string> = {};

  if (!formData.name.trim()) {
    newErrors.name = 'Name is required';
  }

  if (!formData.email.includes('@')) {
    newErrors.email = 'Invalid email';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  if (!validate()) return;

  // Submit logic
};

// Render
<form onSubmit={handleSubmit} className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Name
    </label>
    <input
      type="text"
      name="name"
      value={formData.name}
      onChange={handleChange}
      className={`w-full px-3 py-2 border rounded-lg ${
        errors.name ? 'border-red-500' : 'border-gray-300'
      }`}
    />
    {errors.name && (
      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
    )}
  </div>
</form>
```

### Loading States
```typescript
const [loading, setLoading] = useState(false);

// Button with loading
<button disabled={loading} className="...">
  {loading ? (
    <span className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      Processing...
    </span>
  ) : (
    'Submit'
  )}
</button>

// Page loading
{loading ? (
  <div className="flex justify-center items-center min-h-screen">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
) : (
  // Content
)}
```

### Empty States
```typescript
{items.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-gray-500 text-lg mb-4">
      No items found
    </p>
    <button className="text-blue-600 hover:text-blue-700">
      Create your first item
    </button>
  </div>
) : (
  // Items list
)}
```

---

## 📱 Responsive Design

### Mobile-First Approach
```css
/* Base (mobile) */
grid-cols-1 gap-4

/* Tablet */
sm:grid-cols-2 sm:gap-6

/* Desktop */
lg:grid-cols-3 lg:gap-8
```

### Common Responsive Patterns
```css
/* Flex direction */
flex flex-col sm:flex-row

/* Text size */
text-xl sm:text-2xl lg:text-3xl

/* Padding */
px-4 sm:px-6 lg:px-8

/* Grid columns */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Hidden on mobile */
hidden sm:block

/* Show only on mobile */
block sm:hidden
```

---

## 🎭 Animation & Transitions

### Hover States
```css
/* Buttons */
hover:bg-blue-700 transition-colors

/* Links */
hover:text-blue-700 hover:underline

/* Cards */
hover:shadow-lg transition-shadow
```

### Loading Spinners
```css
/* Inline spinner */
w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin

/* Page spinner */
w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin
```

### Smooth Transitions
```css
/* Colors */
transition-colors duration-200

/* All properties */
transition-all duration-300

/* Shadows */
transition-shadow duration-200
```

---

## 🧭 Navigation Pattern

### Global Navigation
**Component:** `components/Navigation.tsx`
**Always visible** on protected routes

```typescript
// Trigger navigation refresh after data changes
if (typeof window !== 'undefined') {
  window.dispatchEvent(new CustomEvent('refreshNavigation'));
}
```

**Navigation listens** for this event and refetches user data.

### Active Links
```typescript
const pathname = usePathname();

<Link
  href="/groups"
  className={`${
    pathname === '/groups'
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-gray-700 hover:text-blue-600'
  }`}
>
  Groups
</Link>
```

---

## 🎨 Common UI Components

### Buttons
```css
/* Primary */
bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors

/* Secondary */
border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors

/* Danger */
bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors

/* Disabled */
disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50
```

### Cards
```css
/* Standard card */
bg-white rounded-lg shadow p-6

/* Hover card */
bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer

/* Border card */
bg-white border border-gray-200 rounded-lg p-6
```

### Badges
```css
/* Status badges */
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium

/* Colors */
bg-green-100 text-green-800  /* Success */
bg-yellow-100 text-yellow-800  /* Warning */
bg-red-100 text-red-800  /* Error */
bg-gray-100 text-gray-800  /* Neutral */
bg-blue-100 text-blue-800  /* Info */
```

### Inputs
```css
/* Text input */
w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent

/* Error state */
border-red-500 focus:ring-red-500

/* Disabled */
bg-gray-100 cursor-not-allowed
```

### Dropdowns
```css
/* Select */
w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500

/* Dropdown menu */
absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50
```

---

## 🎯 UX Best Practices

### Error Handling
- ❌ NEVER use browser `alert()` or `confirm()`
- ✅ Always use ConfirmModal or custom modal
- ✅ Show inline validation errors
- ✅ Clear errors on input change
- ✅ User-friendly error messages (not technical)

### Loading States
- ✅ Show spinner during async operations
- ✅ Disable buttons while loading
- ✅ Show "Processing..." or similar text
- ❌ Don't leave user guessing if action is happening

### Form Validation
- ✅ Validate on submit
- ✅ Show inline errors below fields
- ✅ Clear errors when user starts typing
- ✅ Disable submit until valid (optional)
- ❌ Don't validate on every keystroke (annoying)

### Navigation
- ✅ Show active page indicator
- ✅ Update navigation after state changes
- ✅ Use breadcrumbs for deep navigation
- ✅ Preserve scroll position when appropriate

### Empty States
- ✅ Show helpful message when no data
- ✅ Provide action to create first item
- ✅ Use friendly tone, not technical
- ❌ Don't show empty table/grid (confusing)

### Accessibility
- ✅ Use semantic HTML (`<button>`, `<nav>`, etc.)
- ✅ Add aria-labels for icon buttons
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus management in modals
- ❌ Don't rely only on color for information

---

## 📐 Layout Patterns

### Page Layout
```typescript
export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation auto-included by layout.tsx */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>
          <p className="text-gray-600 mt-2">Page description</p>
        </div>

        {/* Page content */}
        <div className="space-y-6">
          {/* Content sections */}
        </div>
      </div>
    </div>
  );
}
```

### Grid Layout
```css
/* Cards grid */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

/* List grid */
grid grid-cols-1 gap-4

/* Two-column layout */
grid grid-cols-1 lg:grid-cols-3 gap-8
/* Left column (2/3) */
lg:col-span-2
/* Right column (1/3) */
lg:col-span-1
```

### Sticky Sidebar
```css
/* Sidebar */
lg:sticky lg:top-24 lg:self-start
```

---

## 🔧 Next.js 16 Specifics

### Client Components
```typescript
'use client';  // At top of file

import { useState, useEffect } from 'react';
```

**Use for:**
- useState, useEffect, hooks
- Event handlers
- Browser APIs
- Client-side state

### Server Components (default)
```typescript
// No 'use client' directive

export default async function Page() {
  // Can use async/await directly
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Use for:**
- Data fetching
- Database queries
- SEO optimization
- Static content

### Route Organization
```
app/
  page.tsx          # Homepage
  layout.tsx        # Root layout (wraps all pages)
  groups/
    page.tsx        # /groups
    [id]/
      page.tsx      # /groups/[id]
      edit/
        page.tsx    # /groups/[id]/edit
```

---

## 🚨 Common Mistakes

1. **Using browser alerts** → Use ConfirmModal instead
2. **Not showing loading states** → Always show spinner during async
3. **Technical error messages** → Show user-friendly messages
4. **Missing validation** → Validate forms before submit
5. **Forgetting 'use client'** → Add for components with hooks
6. **Not handling empty states** → Show helpful message, not empty grid
7. **Inconsistent styling** → Follow the design system
8. **Poor mobile experience** → Test on mobile, use responsive classes

---

## 📚 Related Documentation

- **Technical patterns:** `CLAUDE.md`
- **Feature implementations:** `docs/features/implemented/`
- **Component examples:** Check existing components in `components/`

---

## Boundaries

### I Do
- Build page components and layouts
- Create reusable UI components (modals, forms, cards, badges)
- Implement styling with Tailwind CSS
- Handle responsive design and accessibility
- Manage component-level state (loading, error, form data)
- Implement animations and transitions

### I Don't (hand off to)
- **Fetch data or write queries** → Integration Agent
- **Design database schemas** → Database Agent / Architect Agent
- **Write tests** → Test Agent
- **Review finished code** → QA/Review Agent

### I Collaborate With
- **Integration Agent:** They provide data via props/hooks; I render it
- **Test Agent:** They verify behavior; I ensure visual correctness
- **QA/Review Agent:** They check pattern compliance; I fix UI issues

---

## Learning Protocol

When working in this domain:
1. Check `docs/agents/learnings/ui.md` for recent discoveries
2. During work, append new findings to the journal
3. At close-down, flag any cross-cutting learnings for MEMORY.md

Journal location: `docs/agents/learnings/ui.md`
Last curated: 2026-02-13 (initial)

---

**For UI work, you have everything you need in this context. Load specific feature docs if you need to understand the data model or business logic.**
