# 📌 Tetradio

**Tetradio** is a lightweight, local-first productivity app built with **React Native + TypeScript** focused on flexible organization of tasks, notes, checklists, and collections (called Lists).  
Its core philosophy is to let users capture ideas quickly, organize them later, and blend different entry types in a single unified experience.

This repository contains the source code for the mobile app interface and local operations logic.

---

## 🧠 Key Features

- 📋 **Lists as Collections**
  - Organize related entries under named groups.
  - Supports creating, viewing, editing, and archiving lists.

- ✅ **Task Management**
  - Create tasks with due dates and priority.
  - Mark tasks complete/incomplete.
  - Toggle and edit tasks inline.

- 📝 **Notes**
  - Capture freeform text notes with optional body content.
  - Inline edit and delete.

- ☑️ **Checklists**
  - Group checklist items under a common title.
  - Bulk create checklist items.
  - Track completion progress per checklist.

- 📥 **System “Unsorted” List**
  - Auto-generated inbox for entries created without a list.
  - Automatically hides when empty.

- 🚀 **Quick Create UI**
  - Create any entry type directly from Overview without picking a list.
  - Optional list assignment on creation.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| UI | React Native |
| Language | TypeScript |
| Storage | SQLite via `expo-sqlite` |
| State | React Hooks |
| Navigation | Custom or built-in navigator patterns |
| Components | Native UI components + custom modules |

---

## 📁 Repository Structure

- 📦 **tetradio**
  - 📂 assets
  - 📂 src
    - 📂 components
    - 📂 db
    - 📂 screens
    - 📂 utils
  - 📜 App.tsx
  - 📜 app.json
  - 📜 index.ts
  - 📜 tsconfig.json



- **`src/db/`** — Database schema and operations (CRUD functions).
- **`src/screens/`** — Main UI screens (Lists, Overview, Entries).
- **`src/components/`** — Reusable UI pieces (cards, buttons, modals).
- **`src/utils/`** — Formatting and helper utilities.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- **Node.js** (v16+)
- **Yarn or npm**
- **Expo CLI** (optional, for running on devices/simulators)

To install:

```bash
git clone https://github.com/gzoukis/tetradio.git
cd tetradio
npm install
# or
yarn install
Running in Development
To start the development server:

npx expo start
Then:

Scan QR code with Expo Go (iOS/Android)

Or launch simulator with provided buttons


🧩 Database Migrations

Tetradio uses a local SQLite database with versioned migrations.
Each schema version has associated migration functions that run on app startup.

Migration logic lives in:

src/db/database.ts
src/db/schema.ts


Example migration steps include:

Creating entries table with types (task, note, checklist)

Adding system flags (e.g., is_system for Unsorted list)

Adding support for checklist items

🛠 Major Design Concepts
🗂 Entries

All user content (tasks, notes, checklists) share a common base structure in the entries table, with type-specific fields. This helps unify CRUD operations and list rendering.

📋 Unsorted List

An auto-created system list called Unsorted holds entries with no assigned list.
It:

Auto-creates when needed

Auto-archives when empty

Is never pinned by users

📌 Pinning & Favourites

Users can pin lists to personalize their workspace.
Pinned lists appear at the top of the Lists and Overview screens.

🎯 Development Roadmap

Upcoming enhancements include (but are not limited to):

🗃 Bulk move entries between lists

🔐 Localization (Greek, PT-BR, more)

💡 Drag & drop ordering for lists

⭐ Entry-level favourites

🎨 UI polish and keyboard/motion fixes

💬 Contributing

Contributions are welcome! To propose changes:

Fork the repo

Create a feature branch (git checkout -b feature/foo)

Commit, push & open a Pull Request

Please follow best practices and include tests for major changes.

📄 License

A license has not yet been specified.
Feel free to add an open-source license (e.g., MIT, Apache-2.0) to clarify usage terms.

🙌 Acknowledgements

Thanks to:

The open-source community

Users advocating for local-first experiences

Developers pushing flexible UI patterns

❓ Questions?

Reach out or open an issue with:

Setup problems

Feature ideas

UI/UX feedback

Happy coding! 🎉
