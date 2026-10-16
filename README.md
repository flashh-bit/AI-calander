# AI Calendar & Smart Scheduler

An intelligent, full-stack calendar and event scheduling web application built as a final-year Bachelor of Computer Applications (BCA) project. It combines calendar and event management with an AI chat assistant powered by Groq to help users query, organize, and interact with their schedule in natural language.

---

## Features

- **Interactive Calendar:** Monthly, weekly, and daily views with smooth animations.
- **Event Management:** Create, view, categorize (work, personal, meeting, health, reminder), edit, and delete events.
- **Holiday Integration:** Preloaded and dynamically fetched public, national, and festival holidays (India & US support).
- **AI Chat Assistant:** Powered by Groq's high-speed Llama 3.1 model with function tool calling to query schedule and holidays directly from the database.
- **Authentication:** User registration and login with session management.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion (Framer Motion)
- **Build Tool:** Vite
- **Backend:** Node.js, Express, TypeScript
- **AI / LLM:** Groq API (`groq-sdk`, Llama 3.1) with tool/function calling
- **Deployment:** Vercel (Frontend & Serverless Functions)

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Groq API key from [Groq Console](https://console.groq.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/flashh-bit/AI-calander.git
cd AI-calander
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Build for Production

```bash
npm run build
npm start
```
