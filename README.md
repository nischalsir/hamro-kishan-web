<div align="center">

<img src="assets/icon.png" alt="Hamro Kisan Logo" width="110" style="border-radius: 20px;" />

# 🌾 Hamro Kisan — हाम्रो किसान

**An Agricultural Intelligence Platform for Nepali Farmers**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> A bilingual (English + नेपाली) mobile-first web application connecting farmers, buyers, agricultural experts and administrators across Nepal.

---

**8th Semester Project — Bachelor of Information Technology (BIT)**
Himalayan Whitehouse College · Purbanchal University · 2026

</div>

---

## 📸 Screenshots

<div align="center">

| Login | Home | Advisory | Advisory/Crop |
|:----:|:---------------:|:------:|:-----:|
| <img src="appss/1.jpg" width="180" /> | <img src="appss/2.jpg" width="180" /> | <img src="appss/3.jpg" width="180" /> | <img src="appss/4.jpg" width="180" /> |

</div>

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [User Roles](#-user-roles)
- [Screenshots](#-screenshots)
- [Authors](#-authors)
- [Acknowledgements](#-acknowledgements)
- [License](#-license)

---

## 🌿 About the Project

**Hamro Kisan** (हाम्रो किसान — *Our Farmer*) is a full-stack agricultural intelligence platform designed specifically for the Nepali farming community. It bridges the gap between farmers, buyers, and agricultural experts through a single, easy-to-use mobile-first application available in both English and Nepali.

The platform empowers farmers with:
- Real-time weather data for their local district
- A comprehensive bilingual disease and pest library (45 diseases — plant & animal)
- Direct access to certified agricultural experts
- A marketplace to list and sell their produce

For buyers, it provides a transparent marketplace to browse verified farm produce and submit purchase requests directly to farmers.

For experts and administrators, it provides powerful tools to review cases, verify credentials, and monitor platform health.

> This project was built as a **final-semester capstone** for the Bachelor of Information Technology (BIT) programme at **Himalayan Whitehouse College, Purbanchal University**.

---

## ✨ Features

### 🌾 Farmer
| Feature | Description |
|---------|-------------|
| 🌤️ Live Weather | Real-time weather via Open-Meteo API — temperature, humidity, wind, sunrise/sunset |
| 🌱 Seasonal Crops | Monthly carousel of recommended crops for Nepal with images |
| 📰 Agri News | Agricultural news feed filtered by Nepali & English keywords |
| 📈 Market Trends | 6-month crop price chart in NPR by category |
| 📷 Issue Reporting | Report crop/livestock problems with photo upload to Supabase Storage |
| 🦠 Disease Library | 45 plant & animal diseases — fully bilingual — with symptoms, cause, treatment, prevention |
| 🛒 Marketplace | List crops for sale, manage listings, track buy requests |
| 📍 Profile | Full location setup: Province → District → Municipality → Ward |

### 🛒 Buyer
| Feature | Description |
|---------|-------------|
| 🛍️ Browse Listings | View all active farmer product listings with prices and photos |
| 📩 Purchase Requests | Send buy requests with proposed price and quantity |
| 📊 Request Tracking | Track request status: pending / accepted / rejected |

### 🔬 Expert
| Feature | Description |
|---------|-------------|
| 📋 Farmer Issues | Review all submitted crop and livestock problems |
| 💬 Expert Advice | Submit detailed bilingual advice responses |
| ✅ Verification | Track own verification status and upload documents |

### ⚙️ Admin
| Feature | Description |
|---------|-------------|
| 📊 Dashboard | Animated SVG speedometers, stat pills, Nepal province dot map |
| 📈 Analytics | 6-month user growth chart, issues vs products bar chart |
| 👥 User Management | Search, filter by role, delete accounts |
| 🔍 Expert Verification | Review and approve/reject expert credentials |
| 🗂️ Content Oversight | Monitor all crop issues and product listings platform-wide |

### 🔧 Technical
- 🌙 **Dark / Light mode** via `prefers-color-scheme` — automatic, no toggle needed
- 🗜️ **Client-side image compression** — max 1024px, 75% JPEG before upload
- ⚡ **Session caching** for weather, news, and price data (localStorage)
- 🔒 **Row Level Security** on all Supabase tables
- 📱 **Mobile-first** responsive design with smooth animations

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| [React 18](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Component library |
| [Recharts](https://recharts.org/) | Charts and data visualisation |
| [Lucide React](https://lucide.dev/) | Icon library |
| [React Router v6](https://reactrouter.com/) | Client-side routing |
| [Sonner](https://sonner.emilkowal.ski/) | Toast notifications |

### Backend & Services
| Technology | Purpose |
|-----------|---------|
| [Supabase](https://supabase.com/) | PostgreSQL database, Auth, Storage, RLS |
| [Open-Meteo API](https://open-meteo.com/) | Free weather and geocoding data |

### Development
| Technology | Purpose |
|-----------|---------|
| ESLint + Prettier | Code linting and formatting |
| Supabase CLI | Database migrations and type generation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│                                                             │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────────────┐     │
│  │ Farmer  │  │ Buyer  │  │ Expert │  │     Admin     │     │
│  │Dashboard│  │Dashboard  │Dashboard  │   Dashboard   │     │
│  └────┬────┘  └───┬────┘  └───┬────┘  └──────┬────────┘     │
│       └───────────┴───────────┴──────────────┘              │
│                         AuthContext                         │
│                    (role-based routing)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Supabase JS Client
               ┌───────────────┴───────────────┐
               │          Supabase             │
               │                               │
               │  ┌─────────┐  ┌───────────┐   │
               │  │  Auth   │  │ PostgreSQL│   │
               │  │ (JWT)   │  │ + RLS     │   │
               │  └─────────┘  └───────────┘   │
               │  ┌─────────────────────────┐  │
               │  │  Storage Buckets        │  │
               │  │  avatars / products /   │  │
               │  │  issue_reports          │  │
               │  └─────────────────────────┘  │
               └───────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js **18+**
- npm or yarn
- A [Supabase](https://supabase.com/) account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/hamro-kisan.git
   cd hamro-kisan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the Supabase database**

   Run the SQL below in your Supabase SQL Editor to create all tables:

   ```sql
   -- Profiles (extends auth.users)
   create table public.profiles (
     id uuid primary key references auth.users(id) on delete cascade,
     full_name text,
     phone_number text,
     avatar_url text,
     role text check (role in ('farmer','buyer','expert','admin')) default 'farmer',
     created_at timestamptz default now()
   );

   -- Farmer extended profile
   create table public.farmer_profiles (
     id uuid primary key default gen_random_uuid(),
     profile_id uuid references public.profiles(id) on delete cascade,
     farm_type text,
     province text,
     district text,
     municipality text,
     ward_number text,
     tole_name text
   );

   -- Buyer extended profile
   create table public.buyer_profiles (
     id uuid primary key default gen_random_uuid(),
     profile_id uuid references public.profiles(id) on delete cascade,
     company_name text,
     address text,
     preferred_categories text[]
   );

   -- Expert extended profile
   create table public.expert_profiles (
     id uuid primary key default gen_random_uuid(),
     profile_id uuid references public.profiles(id) on delete cascade,
     specialisation text,
     bio text,
     experience_years int,
     verification_status text default 'unverified'
   );

   -- Products
   create table public.products (
     id uuid primary key default gen_random_uuid(),
     farmer_id uuid references public.profiles(id) on delete cascade,
     name text not null,
     category text,
     price numeric,
     quantity text,
     description text,
     photo_url text,
     status text default 'active',
     created_at timestamptz default now()
   );

   -- Crop Issues
   create table public.crop_issues (
     id uuid primary key default gen_random_uuid(),
     farmer_id uuid references public.profiles(id) on delete cascade,
     crop_name text,
     description text,
     image_url text,
     status text default 'pending',
     created_at timestamptz default now()
   );

   -- Expert Advice
   create table public.expert_advice (
     id uuid primary key default gen_random_uuid(),
     issue_id uuid references public.crop_issues(id) on delete cascade,
     expert_id uuid references public.profiles(id) on delete cascade,
     advice_text text,
     created_at timestamptz default now()
   );

   -- Purchase Requests
   create table public.purchase_requests (
     id uuid primary key default gen_random_uuid(),
     product_id uuid references public.products(id) on delete cascade,
     buyer_id uuid references public.profiles(id) on delete cascade,
     quantity_requested text,
     proposed_price numeric,
     status text default 'pending',
     created_at timestamptz default now()
   );
   ```

5. **Enable Row Level Security**
   ```sql
   -- Enable RLS on all tables
   alter table public.profiles enable row level security;
   alter table public.farmer_profiles enable row level security;
   alter table public.buyer_profiles enable row level security;
   alter table public.expert_profiles enable row level security;
   alter table public.products enable row level security;
   alter table public.crop_issues enable row level security;
   alter table public.expert_advice enable row level security;
   alter table public.purchase_requests enable row level security;

   -- Admin helper function
   create or replace function public.is_admin()
   returns boolean language sql security definer as $$
     select exists (
       select 1 from public.profiles
       where id = auth.uid() and role = 'admin'
     );
   $$;
   ```

6. **Create Storage Buckets**

   In your Supabase dashboard → Storage, create three **public** buckets:
   - `avatars`
   - `product_images`
   - `issue_reports`

7. **Add required assets**

   Place the following images in `public/assets/`:
   ```
   public/
   └── assets/
       ├── logo.png                          ← App logo
       ├── placeholder.jpg                   ← Fallback image
       ├── others/
       │   └── farmer.jpg                    ← Login page hero
       ├── diseases/
       │   ├── late-blight.jpg
       │   ├── aphids.jpg
       │   └── ...                           ← 30 plant disease images
       │   └── animals/
       │       ├── foot-mouth-disease.jpg
       │       └── ...                       ← 15 animal disease images
       └── crops/
           ├── wheat.jpg
           └── ...                           ← Seasonal crop images
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:8080](http://localhost:8080) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## 📁 Project Structure

```
hamro-kisan/
├── public/
│   └── assets/
│       ├── logo.png
│       ├── placeholder.jpg
│       ├── others/         ← Login hero image
│       ├── diseases/       ← Plant disease images
│       │   └── animals/    ← Animal disease images
│       └── crops/          ← Seasonal crop images
│
├── src/
│   ├── assets/
│   │   └── logo.png
│   │
│   ├── components/
│   │   └── ui/             ← shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx ← Auth state, role routing, profile fetching
│   │
│   ├── data/
│   │   └── mock.ts         ← Disease library (45), seasonal crops, price data
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts   ← Supabase JS client
│   │
│   ├── layouts/
│   │   ├── FarmerLayout.tsx
│   │   └── NavLink.tsx
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── NotFound.tsx
│   │   ├── FarmerPages.tsx    ← FarmerHome, FarmerMarket, FarmerAdvisory, FarmerProfile
│   │   ├── BuyerDashboard.tsx
│   │   ├── ExpertDashboard.tsx
│   │   └── AdminDashboard.tsx
│   │
│   ├── types/
│   │   ├── index.ts
│   │   └── supabase.ts     ← Auto-generated Supabase types
│   │
│   ├── App.tsx             ← Route definitions + role-based guards
│   ├── main.tsx
│   └── index.css           ← CSS variables + dark/light mode
│
├── .env.local              ← Environment variables (not committed)
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🗄️ Database Schema

```
auth.users
    │
    ▼ (1:1, trigger on signup)
profiles (id, full_name, phone_number, avatar_url, role)
    │
    ├──▶ farmer_profiles  (province, district, municipality, farm_type …)
    ├──▶ buyer_profiles   (company_name, address, preferred_categories …)
    ├──▶ expert_profiles  (specialisation, bio, verification_status …)
    │
    ├──▶ products          ◀── purchase_requests ◀── profiles (buyer)
    │        │
    │        └── status: active | sold | removed
    │
    └──▶ crop_issues       ◀── expert_advice ◀── profiles (expert)
             │
             └── status: pending | open | in_progress | resolved
```

### Storage Buckets

| Bucket | Contains |
|--------|---------|
| `avatars` | Profile photos for all user roles |
| `product_images` | Farmer product listing photos |
| `issue_reports` | Crop/animal problem photos |

---

## 👥 User Roles

| Role | Access | Default Route |
|------|--------|---------------|
| `farmer` | Weather, Disease Library, Market, Issue Reporting | `/farmer/home` |
| `buyer` | Product Browse, Purchase Requests, Buyer Profile | `/buyer` |
| `expert` | Farmer Issues, Advice Submission, Expert Profile | `/expert` |
| `admin` | All dashboards, User Management, Expert Verification | `/admin` |

> Role is stored in `profiles.role` and read by `AuthContext` to determine routing after login. Supabase RLS policies enforce data access at the database level.

---

## 🌐 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |

> Never commit `.env.local` to version control. It is listed in `.gitignore`.

---

## 🤝 Contributing

This is an academic project. If you'd like to suggest improvements or report issues:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👨‍💻 Authors

This project was developed as a team for the **8th Semester BIT Project** at **Himalayan Whitehouse College, Purbanchal University**.

<table>
  <tr>
    <td align="center"><b>Nischal Pandey</b><br/>Lead Developer<br/>Frontend · Backend · Database</td>
    <td align="center"><b>Sanjit Thapa</b><br/>Developer<br/>UI Design · Testing</td>
    <td align="center"><b>Samir Balami</b><br/>Developer<br/>Database · Documentation</td>
    <td align="center"><b>Samip KC</b><br/>Developer<br/>Research · Testing</td>
  </tr>
</table>

---

## 🙏 Acknowledgements

- **Himalayan Whitehouse College** — for academic support and resources
- **Purbanchal University** — for the BIT programme curriculum
- [Supabase](https://supabase.com/) — for the incredible open-source backend platform
- [Open-Meteo](https://open-meteo.com/) — for free, accurate weather API
- [shadcn/ui](https://ui.shadcn.com/) — for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) — for the utility-first CSS framework
- The Nepali farming community — for inspiring this project

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Nischal Pandey, Sanjit Thapa, Samir Balami, Samip KC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<div align="center">

**Made with ❤️ for Nepali Farmers**

*हाम्रो किसान — Our Farmer*

🌾 🌱 🇳🇵

</div>