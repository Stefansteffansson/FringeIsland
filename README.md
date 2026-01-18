# FringeIsland

**An educational and training platform for personal development, leadership training, and team/organizational development.**

## 🎯 Vision

FringeIsland enables users to embark on transformative "journeys" - structured learning experiences that can be taken solo, in pairs, or in groups. Like physical travel, these journeys combine exploration, exercise, and experience to foster growth and skill development.

## 🏗️ Current Status

**Phase**: Architecture & Planning  
**Stack**: Next.js 14+ (App Router) + TypeScript + React + Supabase

This project is in the architectural planning phase. We are designing a flexible, node-based authorization system that supports dynamic group structures and customizable permissions.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Architecture Overview](./docs/architecture/ARCHITECTURE.md)** - System design and core concepts
- **[Database Schema](./docs/architecture/DATABASE_SCHEMA.md)** - Supabase schema and RLS policies
- **[Authorization System](./docs/architecture/AUTHORIZATION.md)** - Permission and role management
- **[Domain Entities](./docs/architecture/DOMAIN_ENTITIES.md)** - Core business entities
- **[Roadmap](./docs/planning/ROADMAP.md)** - Implementation phases

## 🚀 Key Features (Planned)

### Phase 1: Foundation
- Predefined journey templates (A→B paths)
- Flexible group system (teams, organizations, cohorts)
- Role-based permissions with templates
- Basic forum and messaging

### Phase 2: User-Generated Content
- User-created journey marketplace
- Journey customization and publishing
- Enhanced collaboration tools

### Phase 3: Dynamic Journeys
- Adaptive journey paths based on user actions
- Context-aware content delivery

### Phase 4: Developer Platform
- API for advanced journey components
- Custom tool/method integrations

## 🏛️ Core Concepts

### Journeys
Structured learning experiences that users can complete solo or collaboratively. Journeys are content templates that groups or individuals enroll in.

### Groups
Flexible organizational units (teams, companies, cohorts) with customizable membership and permissions. Groups can contain users and other groups ("member of" relationships).

### Roles & Permissions
- **Role Templates**: System-level blueprints (Admin, Group Leader, Travel Guide, Member, Observer)
- **Group Roles**: Instance of a role within a specific group with customizable permissions
- **Permissions**: Atomic capabilities (e.g., `invite_members`, `view_journey_content`)

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, React
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Real-time)
- **Repository**: [github.com/Stefansteffansson/FringeIsland](https://github.com/Stefansteffansson/FringeIsland)

## 📖 Getting Started

Documentation is being actively developed. Implementation will begin once architectural planning is complete.

## 🤝 Contributing

This is a private project currently in the planning phase.

## 📄 License

TBD

---

**Built with care for transformative learning experiences** 🌊