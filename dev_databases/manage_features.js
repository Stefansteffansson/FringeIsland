#!/usr/bin/env node
/**
 * FringeIsland Feature Database - CRUD Manager
 * Interactive CLI for managing features
 */

const Database = require('better-sqlite3');
const readline = require('readline');
const path = require('path');

const DB_PATH = path.join(__dirname, 'featuresDB.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt user
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ============================================
// CRUD Operations
// ============================================

// CREATE - Add new feature
async function createFeature() {
  console.log('\n📝 CREATE NEW FEATURE\n');

  const feature = {};

  // Show categories for context
  console.log('Existing categories:');
  const categories = db.prepare('SELECT DISTINCT category FROM features ORDER BY category').all();
  categories.forEach(c => console.log(`  - ${c.category}`));

  feature.category = await prompt('\nCategory: ');
  feature.name = await prompt('Name: ');
  feature.description = await prompt('Description: ');
  feature.status = await prompt('Status (completed/in-progress/planned/deferred): ') || 'planned';

  // Parent feature (for hierarchy)
  const showParents = await prompt('Add parent feature? (y/n): ');
  if (showParents.toLowerCase() === 'y') {
    console.log('\nAvailable parent features:');
    const parents = db.prepare(`
      SELECT id, name, category, level
      FROM features
      WHERE level < 2
      ORDER BY category, level, name
    `).all();
    parents.forEach(p => console.log(`  [${p.id}] ${' '.repeat(p.level * 2)}${p.name} (${p.category}, level ${p.level})`));

    const parentId = await prompt('\nParent ID (or press Enter for none): ');
    feature.parent_id = parentId ? parseInt(parentId) : null;

    // Determine level based on parent
    if (feature.parent_id) {
      const parent = db.prepare('SELECT level FROM features WHERE id = ?').get(feature.parent_id);
      feature.level = parent ? parent.level + 1 : 0;
    } else {
      feature.level = 0;
    }
  } else {
    feature.parent_id = null;
    feature.level = 0;
  }

  // Optional fields
  feature.component_type = await prompt('Component type (page/component/modal/form/api/database/trigger/policy/utility/hook): ') || null;
  feature.required_role = await prompt('Required role: ') || null;
  feature.tech_stack = await prompt('Tech stack: ') || null;
  feature.version_added = await prompt('Version added: ') || null;
  feature.notes = await prompt('Notes: ') || null;

  // Arrays (JSON)
  const files = await prompt('Implementation files (comma-separated): ');
  feature.implementation_files = files ? JSON.stringify(files.split(',').map(f => f.trim())) : null;

  const tags = await prompt('Tags (comma-separated): ');
  feature.tags = tags ? JSON.stringify(tags.split(',').map(t => t.trim())) : null;

  const perms = await prompt('Required permissions (comma-separated): ');
  feature.required_permissions = perms ? JSON.stringify(perms.split(',').map(p => p.trim())) : null;

  feature.sort_order = parseInt(await prompt('Sort order (0-100): ') || '0');
  feature.priority = await prompt('Priority (critical/high/medium/low): ') || null;

  // Confirm
  console.log('\n📋 Feature to create:');
  console.log(JSON.stringify(feature, null, 2));
  const confirm = await prompt('\nCreate this feature? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    try {
      const stmt = db.prepare(`
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

      const result = stmt.run(feature);
      console.log(`\n✅ Feature created successfully! ID: ${result.lastInsertRowid}`);
    } catch (error) {
      console.error('\n❌ Error creating feature:', error.message);
    }
  } else {
    console.log('\n❌ Feature creation cancelled');
  }
}

// READ - Search and view features
async function readFeatures() {
  console.log('\n🔍 SEARCH FEATURES\n');
  console.log('1. List all features');
  console.log('2. Search by text');
  console.log('3. Filter by category');
  console.log('4. Filter by status');
  console.log('5. View feature details');
  console.log('6. View feature hierarchy');

  const choice = await prompt('\nChoose option (1-6): ');

  switch (choice) {
    case '1':
      listAllFeatures();
      break;
    case '2':
      await searchFeatures();
      break;
    case '3':
      await filterByCategory();
      break;
    case '4':
      await filterByStatus();
      break;
    case '5':
      await viewFeatureDetails();
      break;
    case '6':
      viewHierarchy();
      break;
    default:
      console.log('Invalid option');
  }
}

function listAllFeatures() {
  const features = db.prepare(`
    SELECT id, name, category, status, level, component_type, version_added
    FROM features
    ORDER BY category, level, sort_order, name
  `).all();

  console.log('\n📋 ALL FEATURES:\n');
  console.log('ID'.padEnd(5) + 'Level'.padEnd(7) + 'Name'.padEnd(50) + 'Category'.padEnd(20) + 'Status'.padEnd(15) + 'Type');
  console.log('-'.repeat(120));

  features.forEach(f => {
    const indent = '  '.repeat(f.level);
    console.log(
      String(f.id).padEnd(5) +
      String(f.level).padEnd(7) +
      (indent + f.name).padEnd(50) +
      (f.category || '').padEnd(20) +
      (f.status || '').padEnd(15) +
      (f.component_type || '')
    );
  });

  console.log(`\nTotal: ${features.length} features`);
}

async function searchFeatures() {
  const searchTerm = await prompt('Search term: ');

  const features = db.prepare(`
    SELECT f.id, f.name, f.category, f.description, f.status
    FROM features f
    JOIN features_fts fts ON f.id = fts.rowid
    WHERE features_fts MATCH ?
    ORDER BY f.category, f.name
  `).all(searchTerm);

  console.log(`\n🔍 Found ${features.length} features:\n`);
  features.forEach(f => {
    console.log(`[${f.id}] ${f.name} (${f.category}) - ${f.status}`);
    console.log(`    ${f.description || 'No description'}`);
    console.log();
  });
}

async function filterByCategory() {
  const categories = db.prepare('SELECT DISTINCT category FROM features ORDER BY category').all();
  console.log('\nCategories:');
  categories.forEach((c, i) => console.log(`${i + 1}. ${c.category}`));

  const choice = await prompt('\nSelect category number: ');
  const category = categories[parseInt(choice) - 1];

  if (category) {
    const features = db.prepare(`
      SELECT id, name, status, level, component_type
      FROM features
      WHERE category = ?
      ORDER BY level, sort_order, name
    `).all(category.category);

    console.log(`\n📋 Features in "${category.category}":\n`);
    features.forEach(f => {
      const indent = '  '.repeat(f.level);
      console.log(`[${f.id}] ${indent}${f.name} - ${f.status} (${f.component_type || 'N/A'})`);
    });
  }
}

async function filterByStatus() {
  const status = await prompt('Status (completed/in-progress/planned/deferred): ');

  const features = db.prepare(`
    SELECT id, name, category, component_type, version_added
    FROM features
    WHERE status = ?
    ORDER BY category, name
  `).all(status);

  console.log(`\n📋 Features with status "${status}":\n`);
  features.forEach(f => {
    console.log(`[${f.id}] ${f.name} (${f.category}) - ${f.component_type || 'N/A'} - v${f.version_added || 'N/A'}`);
  });

  console.log(`\nTotal: ${features.length} features`);
}

async function viewFeatureDetails() {
  const id = await prompt('Feature ID: ');

  const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(parseInt(id));

  if (!feature) {
    console.log('❌ Feature not found');
    return;
  }

  console.log('\n📄 FEATURE DETAILS:\n');
  console.log(`ID:              ${feature.id}`);
  console.log(`Name:            ${feature.name}`);
  console.log(`Description:     ${feature.description || 'N/A'}`);
  console.log(`Category:        ${feature.category}`);
  console.log(`Status:          ${feature.status}`);
  console.log(`Level:           ${feature.level}`);
  console.log(`Parent ID:       ${feature.parent_id || 'None'}`);
  console.log(`Component Type:  ${feature.component_type || 'N/A'}`);
  console.log(`Required Role:   ${feature.required_role || 'N/A'}`);
  console.log(`Tech Stack:      ${feature.tech_stack || 'N/A'}`);
  console.log(`Version Added:   ${feature.version_added || 'N/A'}`);
  console.log(`Priority:        ${feature.priority || 'N/A'}`);
  console.log(`Sort Order:      ${feature.sort_order}`);
  console.log(`Notes:           ${feature.notes || 'N/A'}`);

  if (feature.implementation_files) {
    console.log(`Files:           ${JSON.parse(feature.implementation_files).join(', ')}`);
  }
  if (feature.tags) {
    console.log(`Tags:            ${JSON.parse(feature.tags).join(', ')}`);
  }
  if (feature.required_permissions) {
    console.log(`Permissions:     ${JSON.parse(feature.required_permissions).join(', ')}`);
  }

  console.log(`Created:         ${feature.created_at}`);
  console.log(`Updated:         ${feature.updated_at}`);

  // Show children
  const children = db.prepare('SELECT id, name, status FROM features WHERE parent_id = ?').all(feature.id);
  if (children.length > 0) {
    console.log(`\nChildren (${children.length}):`);
    children.forEach(c => console.log(`  [${c.id}] ${c.name} - ${c.status}`));
  }
}

function viewHierarchy() {
  const hierarchy = db.prepare('SELECT * FROM v_feature_hierarchy ORDER BY path').all();

  console.log('\n🌲 FEATURE HIERARCHY:\n');
  hierarchy.forEach(f => {
    console.log(`[${f.id}] ${f.path} (${f.status})`);
  });
}

// UPDATE - Modify existing feature
async function updateFeature() {
  console.log('\n✏️  UPDATE FEATURE\n');

  const id = await prompt('Feature ID to update: ');
  const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(parseInt(id));

  if (!feature) {
    console.log('❌ Feature not found');
    return;
  }

  console.log(`\nCurrent feature: ${feature.name}`);
  console.log('Press Enter to keep current value, or type new value\n');

  const updates = {};

  const name = await prompt(`Name [${feature.name}]: `);
  if (name) updates.name = name;

  const description = await prompt(`Description [${feature.description || 'N/A'}]: `);
  if (description) updates.description = description;

  const category = await prompt(`Category [${feature.category}]: `);
  if (category) updates.category = category;

  const status = await prompt(`Status [${feature.status}]: `);
  if (status) updates.status = status;

  const componentType = await prompt(`Component type [${feature.component_type || 'N/A'}]: `);
  if (componentType) updates.component_type = componentType;

  const requiredRole = await prompt(`Required role [${feature.required_role || 'N/A'}]: `);
  if (requiredRole) updates.required_role = requiredRole;

  const techStack = await prompt(`Tech stack [${feature.tech_stack || 'N/A'}]: `);
  if (techStack) updates.tech_stack = techStack;

  const versionAdded = await prompt(`Version added [${feature.version_added || 'N/A'}]: `);
  if (versionAdded) updates.version_added = versionAdded;

  const priority = await prompt(`Priority [${feature.priority || 'N/A'}]: `);
  if (priority) updates.priority = priority;

  const notes = await prompt(`Notes [${feature.notes || 'N/A'}]: `);
  if (notes) updates.notes = notes;

  const sortOrder = await prompt(`Sort order [${feature.sort_order}]: `);
  if (sortOrder) updates.sort_order = parseInt(sortOrder);

  if (Object.keys(updates).length === 0) {
    console.log('❌ No changes made');
    return;
  }

  console.log('\n📋 Changes to apply:');
  console.log(JSON.stringify(updates, null, 2));
  const confirm = await prompt('\nApply changes? (y/n): ');

  if (confirm.toLowerCase() === 'y') {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      const stmt = db.prepare(`UPDATE features SET ${setClause} WHERE id = @id`);
      stmt.run({ ...updates, id: parseInt(id) });

      console.log('\n✅ Feature updated successfully!');
    } catch (error) {
      console.error('\n❌ Error updating feature:', error.message);
    }
  } else {
    console.log('\n❌ Update cancelled');
  }
}

// DELETE - Remove feature
async function deleteFeature() {
  console.log('\n🗑️  DELETE FEATURE\n');

  const id = await prompt('Feature ID to delete: ');
  const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(parseInt(id));

  if (!feature) {
    console.log('❌ Feature not found');
    return;
  }

  // Check for children
  const children = db.prepare('SELECT COUNT(*) as count FROM features WHERE parent_id = ?').get(parseInt(id));

  console.log(`\n⚠️  You are about to delete: ${feature.name}`);
  console.log(`    Category: ${feature.category}`);
  console.log(`    Status: ${feature.status}`);

  if (children.count > 0) {
    console.log(`    ⚠️  This feature has ${children.count} child feature(s) that will also be deleted!`);
  }

  const confirm = await prompt('\nType "DELETE" to confirm: ');

  if (confirm === 'DELETE') {
    try {
      const stmt = db.prepare('DELETE FROM features WHERE id = ?');
      stmt.run(parseInt(id));

      console.log('\n✅ Feature deleted successfully!');
    } catch (error) {
      console.error('\n❌ Error deleting feature:', error.message);
    }
  } else {
    console.log('\n❌ Deletion cancelled');
  }
}

// ============================================
// Statistics
// ============================================

function showStats() {
  console.log('\n📊 DATABASE STATISTICS\n');

  const stats = db.prepare('SELECT * FROM v_feature_stats ORDER BY category, status').all();

  console.log('Category'.padEnd(25) + 'Status'.padEnd(15) + 'Count');
  console.log('-'.repeat(50));

  stats.forEach(s => {
    console.log(
      s.category.padEnd(25) +
      s.status.padEnd(15) +
      s.count
    );
  });

  const total = db.prepare('SELECT COUNT(*) as count FROM features').get();
  console.log('-'.repeat(50));
  console.log('TOTAL'.padEnd(40) + total.count);
}

// ============================================
// Main Menu
// ============================================

async function mainMenu() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   FringeIsland Feature CRUD Manager    ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('1. 📝 Create new feature');
  console.log('2. 🔍 Read/Search features');
  console.log('3. ✏️  Update feature');
  console.log('4. 🗑️  Delete feature');
  console.log('5. 📊 Show statistics');
  console.log('6. 🚪 Exit\n');

  const choice = await prompt('Choose option (1-6): ');

  switch (choice) {
    case '1':
      await createFeature();
      break;
    case '2':
      await readFeatures();
      break;
    case '3':
      await updateFeature();
      break;
    case '4':
      await deleteFeature();
      break;
    case '5':
      showStats();
      break;
    case '6':
      console.log('\n👋 Goodbye!\n');
      rl.close();
      db.close();
      process.exit(0);
      return;
    default:
      console.log('Invalid option');
  }

  // Continue to next operation
  const another = await prompt('\nPerform another operation? (y/n): ');
  if (another.toLowerCase() === 'y') {
    await mainMenu();
  } else {
    console.log('\n👋 Goodbye!\n');
    rl.close();
    db.close();
    process.exit(0);
  }
}

// ============================================
// Start Application
// ============================================

console.log('\n🚀 Starting Feature CRUD Manager...');
console.log(`📁 Database: ${DB_PATH}\n`);

mainMenu().catch(error => {
  console.error('Error:', error);
  rl.close();
  db.close();
  process.exit(1);
});
