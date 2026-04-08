# Authentication System Installation Guide

## 📦 Quick Start

Follow these steps to integrate the authentication system into your FringeIsland project.

## 1️⃣ Copy Files to Your Project

Copy the following directories from the `auth-implementation` folder to your project root:

```bash
# From the auth-implementation folder:
cp -r app/* your-project/app/
cp -r components your-project/
cp -r lib your-project/
```

### File Structure After Installation:
```
your-project/
├── app/
│   ├── globals.css           # ← Updated with Tailwind
│   ├── layout.tsx            # ← Updated with AuthProvider
│   ├── page.tsx              # ← Updated homepage
│   ├── login/
│   │   └── page.tsx         # ← New login page
│   ├── signup/
│   │   └── page.tsx         # ← New signup page
│   └── profile/
│       └── page.tsx         # ← New profile page
├── components/
│   └── auth/
│       └── AuthForm.tsx     # ← New auth form component
└── lib/
    └── auth/
        └── AuthContext.tsx  # ← New auth context
```

## 2️⃣ Configure Supabase (If Not Already Done)

### Enable Email Auth in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Ensure **Email** provider is enabled
3. For development, disable email confirmation:
   - Go to Authentication → Email Templates
   - Set "Confirm email" to disabled (or use a test email service)

### Verify Environment Variables

Your `.env.local` should have:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3️⃣ Test the Implementation

### Start Development Server
```bash
npm run dev
```

### Test User Registration
1. Navigate to http://localhost:3000
2. Click "Get Started" or go to http://localhost:3000/signup
3. Fill in:
   - Display Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
4. Click "Sign Up"
5. You should be redirected to `/profile`

### Test User Login
1. Sign out from the profile page
2. Go to http://localhost:3000/login
3. Enter your credentials
4. You should be redirected back to `/profile`

### Verify Database
1. Go to Supabase Dashboard → Table Editor
2. Check the `users` table
3. You should see your new user record with the display name

## 4️⃣ Common Issues & Fixes

### Issue: TypeScript Errors
**Solution**: Ensure your `tsconfig.json` includes the necessary paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: Tailwind Styles Not Working
**Solution**: Verify your `tailwind.config.ts` includes the app directory:
```typescript
content: [
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',
],
```

### Issue: "createClient is not a function"
**Solution**: Verify you have the correct Supabase client files:
- `/lib/supabase/client.ts`
- `/lib/supabase/server.ts`
These should already exist from Phase 1.

### Issue: Email Confirmation Required
**Solution**: 
- Option 1: Disable email confirmation in Supabase Dashboard (for development)
- Option 2: Use a service like MailHog for local email testing
- Option 3: Use your real email for testing

## 5️⃣ Update Documentation

### Update CHANGELOG.md
Add to the `[Unreleased]` section:
```markdown
### Added
- **Authentication System**: Complete Supabase Auth integration
  - User registration (signup) with display name
  - User login with email/password
  - User logout functionality
  - Protected profile page
  - Auth context and hooks for state management
  - Auth-aware navigation in homepage
```

### Update README.md
Add to the "Getting Started" section:
```markdown
### Authentication
The app now includes a complete authentication system:
- Sign up at `/signup`
- Sign in at `/login`
- View profile at `/profile` (protected)
```

## 6️⃣ Next Steps

After authentication is working, you can:

1. **Enable Email Verification**: 
   - Configure email templates in Supabase
   - Add email verification UI

2. **Add Password Reset**:
   - Create forgot password page
   - Implement reset flow

3. **Add Social Auth**:
   - Enable OAuth providers in Supabase
   - Add social login buttons

4. **Enhance Profile Page**:
   - Add profile editing
   - Add avatar upload
   - Show user's journey enrollments

5. **Implement Route Guards**:
   - Create middleware for auth checks
   - Add role-based access control

## 📚 Documentation

See `AUTH_IMPLEMENTATION.md` for detailed documentation including:
- Architecture overview
- Usage examples
- Security considerations
- API reference

---

**Ready to authenticate!** 🚀

If you encounter any issues, check the [Common Issues](#4️⃣-common-issues--fixes) section or review the complete implementation in `AUTH_IMPLEMENTATION.md`.
