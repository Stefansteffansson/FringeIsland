# FringeIsland Development Dashboard

A local web-based dashboard for tracking project status, roadmap, and development progress.

## 🚀 Access the Dashboard

1. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:3000/dev/dashboard
   ```

## 📊 What's Included

The dashboard displays real-time information from your project's markdown files:

### Top Stats
- **Current Focus**: What we're working on right now
- **Phase Progress**: Visual progress bar for current phase
- **Blockers**: Active blockers or "all clear" status

### Sections (All Collapsible)

1. **Quick Stats**
   - Database tables count
   - Migrations applied
   - Test coverage percentage
   - Behaviors documented

2. **Active Tasks**
   - Current tasks with completion status
   - Visual checkmarks for completed items

3. **Next Priorities**
   - Upcoming work prioritized
   - Status badges (complete, in-progress, upcoming, pending)

4. **Deferred Decisions**
   - Features/work intentionally deferred
   - Rationale for deferral

5. **Git Status**
   - Current branch
   - Clean/dirty status
   - Recent commits (last 5)

6. **Last Session Summary**
   - Date and duration
   - Major accomplishments

7. **Quick Links**
   - Direct links to key documentation files
   - Opens in VS Code

## 🎨 Features

- **Dark Theme**: Easy on the eyes for long sessions
- **Collapsible Sections**: Expand/collapse any section
- **Real-time Data**: Reads directly from your markdown files
- **Visual Progress**: Color-coded status indicators and progress bars
- **Auto-refresh**: Refresh page to see latest updates

## 🔧 How It Works

The dashboard:
1. Runs as a Next.js server component at `/dev/dashboard`
2. Reads markdown files from your project root
3. Parses them using custom parsers (`lib/dashboard/parsers.ts`)
4. Displays formatted data with Tailwind CSS styling
5. Uses `lucide-react` for icons

## 📝 Data Sources

- `PROJECT_STATUS.md` - Current status, tasks, stats
- `docs/planning/ROADMAP.md` - Phase progress, roadmap
- `docs/planning/DEFERRED_DECISIONS.md` - Deferred features
- Git commands - Branch, commits, status

## 🛠️ Customization

### Add New Sections

1. Create a parser function in `lib/dashboard/parsers.ts`
2. Add a new `<CollapsibleSection>` in `app/dev/dashboard/page.tsx`
3. Import and use your parser

### Modify Styling

The dashboard uses Tailwind CSS classes. Edit the component JSX to change:
- Colors (bg-*, text-*, border-*)
- Spacing (p-*, m-*, gap-*)
- Layout (grid, flex, etc.)

## 🔄 Updates

The dashboard reads files on each page load. To see updates:
- Refresh the browser page
- Or restart the dev server if parsers changed

## 💡 Tips

- **Keep it open**: Pin the dashboard in a browser tab while working
- **Quick overview**: Use it at the start of each session
- **Status checks**: Check before/after major changes
- **Team sync**: Share the dashboard URL during pair programming

## 🐛 Troubleshooting

**Dashboard won't load:**
- Ensure Next.js dev server is running (`npm run dev`)
- Check console for errors
- Verify all markdown files exist

**Data looks wrong:**
- Check if markdown files are properly formatted
- Ensure parsers match your file structure
- Refresh the page

**Icons missing:**
- Ensure `lucide-react` is installed: `npm install lucide-react`

---

**Enjoy your development dashboard! 🎉**
