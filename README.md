# CaféPOS - Modern Coffee Shop Point of Sale & Inventory System

A premium, real-time Point of Sale (POS) and inventory management web application tailored for coffee shops and cafés. Built with a robust modern stack featuring React, Vite, TanStack Router, Tailwind CSS, and Supabase.

---

## 🌟 Key Features

### 1. POS Checkout Register
- **Dynamic Cart Management**: Select items, customize variants (e.g., Hot, Iced, Freezer, Thick), choose cup sizes (8oz, 12oz, 16oz), and add optional syrups with automatic price calculations.
- **Senior Citizen Discounts**: Built-in 20% (configurable) Senior Citizen Discount toggling.
- **Digital Receipt Modal**: Generates a visually realistic thermal receipt representation onscreen upon successful checkout with jagged borders and monospace layouts.
- **POS Printers Ready**: 
  - **Dynamic Thermal PDF Export**: Generates and downloads a custom-sized thermal receipt PDF (80mm width with dynamic height fitting all line items perfectly).
  - **Direct Thermal Printing**: Launches raw browser print commands styled via `@page` CSS specifically for standard 80mm thermal roll printers (bypassing full A4/letter bond paper outputs).

### 2. Live Dashboard & Sales Ledger
- **Core Analytics**: Tracks total daily revenue, order counts, low-stock warnings, and transaction volume.
- **Order Logs**: Real-time sales ledger tracking all transactions, cashier logs, timestamps, and order statuses.
- **Voiding System**: Allows administrators to void completed transactions with auto-restoring inventory sync.

### 3. Inventory & Product Management
- **Menu Catalog**: Manage products, category mappings, and flexible variant-specific or size-specific pricing tiers.
- **Stock Tracking**: Live inventory alerts marking items as "In Stock" or "Low Stock."
- **Syrup & Option Editor**: Easily configure customizable drink options, syrup names, and pricing.

### 4. Admin & Security Control
- **Superadmin Control Panel**: Tracks system database health, table row counts, memory performance metrics, and logs.
- **Role-Based Access Control (RBAC)**: Supports `superadmin`, `admin`, and `barista` user levels with corresponding view-guards and action permissions.

---

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/)
- **Routing & State**: [TanStack Router & Start](https://tanstack.com/router)
- **Database & Realtime Backend**: [Supabase](https://supabase.com/) (PostgreSQL client + Realtime subscription channel)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), Radix UI primitives, Lucide Icons
- **PDF Generation**: [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html) (Client-side vector generation)

---

## 💾 Database Schema

The database relies on a PostgreSQL schema synced in real-time. Below are the key tables defined in `supabase_setup.sql`:

- **`users`**: Stores user authentication credentials, display names, and roles (`superadmin`, `admin`, `barista`).
- **`products`**: Product catalog metadata, category mapping, base price, and JSON pricing blocks for variants and sizes.
- **`menu_categories`**: Coffee, iced teas, frappes, matchas, and category configurations.
- **`category_variants`**: Hot, Iced, Blender, or custom sub-choices per menu category.
- **`syrups`**: Extra add-ons that baristas can append to orders.
- **`inventory`**: Tracks live stock counts and stock status levels.
- **`transactions`**: Order header logs storing checkout details, items sold list (JSON), tax, discount percent, total, and cashier name.
- **`app_settings`**: Global POS properties (e.g., `senior_discount_percent`).

---

## 🔐 Role Permissions Matrix

| Feature | Barista | Admin | Superadmin |
| :--- | :---: | :---: | :---: |
| Process New Sales | ✅ | ✅ | ✅ |
| View Ledger & Reprint Receipts | ✅ | ✅ | ✅ |
| Update Live Inventory Stock | ✅ | ✅ | ✅ |
| Void Transactions | ❌ | ✅ | ✅ |
| Edit Products, Prices, & Syrups | ❌ | ✅ | ✅ |
| Edit Menu Categories | ❌ | ✅ | ✅ |
| View Superadmin Health Console | ❌ | ❌ | ✅ |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### 1. Installation
Clone the repository, navigate to the folder, and install dependencies:
```bash
cd pos
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`) and fill in your Supabase connection strings:
```env
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 3. Database Migration
Execute the query scripts in [supabase_setup.sql](file:///c:/Users/USER/OneDrive/Desktop/code/COFFEE-POS/pos/supabase_setup.sql) in your Supabase SQL editor to create the tables, enable real-time replication, and seed initial menus and categories.

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000/](http://localhost:3000/) in your web browser.

### 5. Seed Accounts
For testing, use the following seeded credential options:
- **Superadmin**: Username: `superadmin` / Password: `admin123`
- **Admin**: Username: `admin` / Password: `admin123`
- **Barista (Staff)**: Username: `barista` / Password: `barista123`

---

## 📦 Building for Production

To create the production build optimized for deployment (e.g. Cloudflare Pages or Vercel SSR):
```bash
npm run build
```
The outputs will be compiled and prepared inside the `.output` directory.
