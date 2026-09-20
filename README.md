# Simple Bake Hub

I want to build a web app called “Simple Bake Lab” for my gluten-free bread premix brand. It should have user accounts, guided baking flows for each premix, tutorials, and a “Share Your Bake” community wall. Please use a modern web stack and make it mobile-friendly.
Here are the detailed requirements:
User Accounts
Email-based signup/login (simple auth).
Each user has a profile with:
Name
Email
Country/region (optional)
Show a simple dashboard after login.
Premix Library
Admin can define premix types (e.g. Buckwheat, Oat, Chickpea).
Each premix has:
Name
Short description
Difficulty level (Beginner / Intermediate / Advanced)
Default recipe values:
Water amount (ml)
Oil amount (ml or tbsp)
Optional extras (seeds, herbs, etc.)
Step-by-step instructions (see next section).
Guided Baking Flow (Step-by-Step)
For each premix, create an interactive guided flow:
Step 1: Prep (tools, ingredients, allergen note)
Step 2: Mixing
Step 3: Proofing
Step 4: Baking
Step 5: Cooling & storage
UI should show:
Current step
“Next step” / “Previous step” buttons
Progress indicator (e.g. Step 2 of 5)
Allow admin to edit steps and text from an admin interface.
Tutorials / Learning Hub
Create a “Tutorials” section with:
Title
Category (Beginner / Intermediate / Advanced)
Tags (e.g. “Oven”, “Hydration”, “Storage”, “Heritage grains”)
Content (rich text / markdown)
Public list + detail page for each tutorial.
Filter tutorials by category and tag.
Light Community – “Share Your Bake” Wall
Logged-in users can post a “Bake Share” with:
Photo upload (at least 1 image)
Premix used (dropdown from existing premixes)
Short description / notes (text)
Optional rating (1–5 stars)
Public feed page:
Shows latest bakes (photo, premix, user name, rating, short note).
Simple interactions:
Users can “like” a bake.
Optional: short comments (text only, no rich formatting).
Navigation & UX
Main navigation items:
Dashboard
Guided Bakes
Tutorials
Share Your Bake
(Later) Journey Tracker
Mobile-first design; make sure all flows work well on a phone.
Admin Area
Secure admin access (can be a simple flag on user).
Admin can:
Create/edit/delete premixes.
Edit guided bake steps for each premix.
Create/edit/delete tutorials.
Moderate “Share Your Bake” posts (hide/delete).
Tech / Implementation Notes
Use a standard modern stack (e.g. React/Next.js + Node/Express + a simple database like Postgres or SQLite).
Structure the code so that a separate “Journey Tracker” module can be added later and linked to users and premixes.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://simplebakehub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/184d8b93-c6a0-4cda-8240-8e516f4de214).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
