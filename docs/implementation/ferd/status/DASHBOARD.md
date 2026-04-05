# 📊 FringeIsland Development Dashboard

A beautiful, dark-themed local web dashboard for tracking project status and development progress.

## 🚀 Quick Start

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the dashboard** in your browser:
   ```
   http://localhost:3000/dev/dashboard
   ```

   If port 3000 is in use, check the terminal output for the actual port.

3. **Bookmark it** for easy access during development!

## 📸 What You'll See

### Phase Timeline (Full Width)
A visual timeline showing all development phases:
- **Phase 1.1 - 1.6** subphases with individual status
- **Phase 2, 3, 4** upcoming phases
- Color-coded: Green (complete), Blue/Purple (in progress), Gray (upcoming)
- Overall Phase 1 progress percentage
- Animated pulse on current phase

### Top Cards
- **Current Focus** - What we're working on right now (with completion indicator)
- **Blockers** - Active blockers or "all clear" status

### Collapsible Sections
All sections can be expanded/collapsed by clicking the header:

1. **Quick Stats** ✅ (Default: Open)
   - Database tables, migrations, test coverage, behaviors documented

2. **Active Tasks** ✅ (Default: Open)
   - Current tasks with visual checkmarks for completed items

3. **Next Priorities** ✅ (Default: Open)
   - Upcoming work with status badges (complete, in-progress, upcoming, pending)

4. **Deferred Decisions** 📋 (Default: Closed)
   - Features intentionally deferred with rationale

5. **Git Status** ✅ (Default: Open)
   - Current branch, clean/dirty status, last 5 commits

6. **Last Session Summary** 🕐 (Default: Closed)
   - Date, duration, and major accomplishments from last session

7. **Quick Links** 📄 (Default: Closed)
   - Direct links to open documentation files in VS Code

## 🎨 Features

- ✅ **Dark Theme** - Easy on the eyes
- ✅ **Collapsible Sections** - Click any header to expand/collapse
- ✅ **Real-time Data** - Reads directly from markdown files
- ✅ **Visual Progress Bars** - See phase completion at a glance
- ✅ **Color-coded Status** - Green for complete, yellow for in-progress, blue for upcoming
- ✅ **Git Integration** - Shows branch, commits, and status
- ✅ **Responsive Design** - Works on any screen size

## 📊 Data Sources

The dashboard automatically reads from:
- `PROJECT_STATUS.md` - Current status, tasks, stats, last session
- `docs/planning/ROADMAP.md` - Phase progress and roadmap
- `docs/planning/DEFERRED_DECISIONS.md` - Deferred features
- Git commands - Branch, commits, clean status

## 🔄 Updating the Dashboard

The dashboard reads files on page load. To see updates:
- **Refresh the page** (F5 or Ctrl+R)
- Updates appear immediately after markdown files are saved

## 💡 Usage Tips

### Daily Workflow
1. **Morning**: Open dashboard to see project status and priorities
2. **During work**: Keep it open in a pinned tab for quick reference
3. **Evening**: Check what was accomplished

### With AI Assistants
When you say "Boot up FringeIsland", the AI reads these same files. The dashboard gives you the same view the AI has!

### Team Collaboration
- Share your screen with dashboard open during pair programming
- Quick status updates without reading multiple files
- Visual progress tracking for stakeholders

## 🛠️ Customization

### Change Default Collapsed State
Edit `app/dev/dashboard/page.tsx` and change `defaultOpen` prop:
```tsx
<CollapsibleSection
  title="My Section"
  defaultOpen={false}  // Change to true/false
>
```

### Add New Sections
1. Create a parser in `lib/dashboard/parsers.ts`
2. Import it in `app/dev/dashboard/page.tsx`
3. Add a new `<CollapsibleSection>` with your data

### Modify Colors/Styling
The dashboard uses Tailwind CSS. Common classes:
- Background: `bg-gray-800`, `bg-blue-900/50`
- Text: `text-white`, `text-gray-400`
- Borders: `border-gray-700`

## 🐛 Troubleshooting

**Dashboard won't load:**
- Ensure dev server is running (`npm run dev`)
- Check terminal for the correct port
- Verify no TypeScript errors

**Data looks wrong:**
- Check if markdown files are properly formatted
- Refresh the page (F5)
- Check browser console for errors

**Sections missing:**
- Check that required markdown files exist
- Verify file paths in `lib/dashboard/parsers.ts`

## 📂 Files Created

```
app/dev/dashboard/
  page.tsx              # Main dashboard page
  README.md             # Detailed documentation

components/dashboard/
  CollapsibleSection.tsx  # Reusable collapsible component

lib/dashboard/
  parsers.ts            # Functions to read and parse markdown files

DASHBOARD.md            # This quick reference guide
```

## 🎉 Enjoy!

The dashboard is your mission control for FringeIsland development. Keep it open, stay informed, and build great things!

---

**Need help?** Check `app/dev/dashboard/README.md` for technical details.
