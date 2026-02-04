# Feature Database CRUD Guide

## 🚀 Quick Start

```bash
cd dev_databases
node manage_features.js
```

## 📋 Main Menu

```
╔════════════════════════════════════════╗
║   FringeIsland Feature CRUD Manager    ║
╚════════════════════════════════════════╝

1. 📝 Create new feature
2. 🔍 Read/Search features
3. ✏️  Update feature
4. 🗑️  Delete feature
5. 📊 Show statistics
6. 🚪 Exit
```

## ✨ Features

### 1. CREATE - Add New Features

**Interactive prompts guide you through:**
- Basic info (name, description, category, status)
- Hierarchy (parent feature selection)
- Technical details (component type, tech stack, files)
- Metadata (tags, permissions, version, priority)

**Example workflow:**
```
Category: Groups
Name: Export Member List
Description: Export group members to CSV
Status: planned
Parent feature? y
  [25] Group Management
Parent ID: 25
Component type: component
Required role: Group Leader
Tech stack: React, Papa Parse
Version added: v0.2.11
Tags: groups, export, csv
Priority: low
```

### 2. READ - Search & View

**6 search options:**

1. **List all features** - Complete hierarchical list
2. **Search by text** - Full-text search across name, description, tags
3. **Filter by category** - View all features in a category
4. **Filter by status** - Find completed/in-progress/planned features
5. **View details** - Complete info for a specific feature
6. **View hierarchy** - Tree view with breadcrumbs

**Example searches:**
```bash
# Find all "enrollment" features
Search term: enrollment

# View all "Groups" features
Select category: Groups

# Show all planned features
Status: planned

# View feature details
Feature ID: 42
```

### 3. UPDATE - Modify Features

**Update any field:**
- Press Enter to keep current value
- Type new value to change
- Confirms changes before applying

**Example:**
```
Feature ID: 42
Name [Current Name]: [Enter to keep]
Status [planned]: completed
Version added [N/A]: v0.2.11
```

### 4. DELETE - Remove Features

**Safety features:**
- Shows feature details before deletion
- Warns if feature has children (cascade delete)
- Requires typing "DELETE" to confirm

**Example:**
```
Feature ID: 42
⚠️  You are about to delete: Export Member List
    Category: Groups
    Status: planned
Type "DELETE" to confirm: DELETE
```

### 5. STATISTICS - View Overview

Shows feature count by:
- Category
- Status
- Total count

**Example output:**
```
Category                  Status          Count
--------------------------------------------------
Authentication            completed       14
Groups                    completed       25
Groups                    planned         3
Journeys                  in-progress     1
--------------------------------------------------
TOTAL                                     81
```

## 🎯 Common Use Cases

### Adding a New Feature

```bash
node manage_features.js
# Select: 1 (Create)
# Follow prompts
# Confirm creation
```

### Finding Features to Work On

```bash
node manage_features.js
# Select: 2 (Read)
# Select: 4 (Filter by status)
# Enter: planned
```

### Updating Feature Status

```bash
node manage_features.js
# Select: 3 (Update)
# Enter feature ID
# Update status: completed
# Add version: v0.2.11
```

### Viewing Category Features

```bash
node manage_features.js
# Select: 2 (Read)
# Select: 3 (Filter by category)
# Select category number
```

## 📝 Field Descriptions

| Field | Description | Example |
|-------|-------------|---------|
| **name** | Feature name | "Group Enrollment" |
| **description** | What it does | "Enroll entire group in journeys" |
| **category** | Main category | "Journeys" |
| **status** | Implementation status | completed, in-progress, planned, deferred |
| **level** | Hierarchy level | 0=root, 1=subcategory, 2=feature |
| **parent_id** | Parent feature ID | 12 (for hierarchy) |
| **component_type** | Implementation type | page, component, modal, form, api, database |
| **required_role** | Who can use it | "Group Leader", "Any authenticated user" |
| **tech_stack** | Technologies used | "React, Supabase, Tailwind" |
| **implementation_files** | Source files | ["/app/groups/enroll.tsx"] |
| **tags** | Search keywords | ["journeys", "enrollment", "group"] |
| **required_permissions** | Permission names | ["enroll_group_in_journey"] |
| **version_added** | Version implemented | "v0.2.10" |
| **priority** | Importance level | critical, high, medium, low |
| **notes** | Additional info | "Depends on journey_enrollments table" |

## 🔍 Search Tips

### Full-Text Search
- Searches across: name, description, tags
- Use AND/OR operators: `login OR signup`
- Use wildcards: `enroll*`

### Finding Related Features
1. Search by tag: Use read → search → enter tag name
2. Filter by category: See all features in a category
3. View hierarchy: See parent-child relationships

## ⚠️ Important Notes

### Hierarchy Rules
- **Level 0**: Root categories (Pages, Groups, Journeys, etc.)
- **Level 1**: Subcategories (Group Lifecycle, Role Management, etc.)
- **Level 2**: Individual features (actual implementation)

### Deleting Features
- **CASCADE**: Children are automatically deleted
- **Cannot undo**: No way to restore deleted features
- **Backup first**: Consider backing up database before major deletes

### Status Values
- **completed**: Fully implemented and working
- **in-progress**: Currently being developed
- **planned**: Scheduled for future implementation
- **deferred**: Postponed to later phase
- **deprecated**: No longer used/maintained

## 🎨 JSON Fields

Some fields store JSON arrays. Format them as comma-separated values:

```
Implementation files: /app/groups/[id]/page.tsx, /components/groups/GroupDetail.tsx
Tags: groups, detail, members
Required permissions: view_member_list, view_member_profiles
```

The script will automatically convert to JSON format:
```json
["groups", "detail", "members"]
```

## 🛡️ Safety Features

1. **Confirmation prompts** - All destructive operations require confirmation
2. **Child warnings** - Warns when deleting features with children
3. **Input validation** - Checks for valid data before saving
4. **Foreign key enforcement** - Database prevents invalid parent_id references
5. **Automatic timestamps** - Created/updated timestamps maintained automatically

## 📚 Quick Reference

```bash
# Start CRUD manager
node manage_features.js

# Create feature
Select: 1

# Search features
Select: 2 → 2 (text search)

# Update status
Select: 3 → Enter ID → Update status field

# Delete feature
Select: 4 → Enter ID → Type "DELETE"

# View stats
Select: 5
```

## 💡 Pro Tips

1. **Use hierarchy** - Organize features under parent categories for better structure
2. **Tag everything** - Tags make features easier to find later
3. **Document files** - List implementation files for tracking
4. **Track versions** - Always add version_added for changelog purposes
5. **Set priorities** - Helps with sprint planning and roadmap
6. **Add notes** - Document dependencies, caveats, or future improvements

---

**Database Location:** `D:\WebDev\GitHub Repositories\FringeIsland\dev_databases\featuresDB.db`

**Script:** `manage_features.js`

For database schema details, see `README.md`
