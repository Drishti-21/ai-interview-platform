# AI Interview Platform

An AI-powered interview platform built with Next.js that allows HR to upload resumes, generate personalized interview questions, and conduct interviews with candidates.

## Features

- 📄 PDF resume upload and processing
- 🤖 AI-generated interview questions using Google Gemini
- 🎤 Voice-based interview interface with speech recognition
- 📧 Automated email invitations to candidates
- 📊 AI-powered interview evaluation and scoring
- ⏱️ No time pressure - candidates can take their time
- 🎯 Exactly 6 questions per interview
- 📝 Resume-specific questioning with natural conversation flow

## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **AI**: Google Gemini 2.5-flash for question generation and evaluation
- **Styling**: Tailwind CSS
- **Speech**: Web Speech API for voice interviews
- **Email**: Nodemailer with SMTP
- **Storage**: In-memory storage (suitable for Vercel serverless)

## Vercel Deployment

### Environment Variables

Set these environment variables in your Vercel dashboard:

```
GEMINI_API_KEY=your_gemini_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
```

### Getting API Keys

1. **Google Gemini API**:
   - Visit [Google AI Studio](https://aistudio.google.com)
   - Create API key
   - Add to `GEMINI_API_KEY` environment variable

2. **Gmail SMTP** (for sending interview links):
   - Enable 2-factor authentication on Gmail
   - Create App Password in Google Account settings
   - Use the App Password in `SMTP_PASS`

## Local Development

First, set up your environment:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run the development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Usage

1. **Admin Dashboard** (`/admin-upload`):
   - Upload candidate resume (PDF)
   - Enter job description
   - Provide candidate email
   - System generates unique interview link and sends email

2. **Candidate Interview** (`/interview/[token]`):
   - Candidate clicks link from email
   - AI conducts 6-question interview
   - Voice-based interaction with speech recognition
   - No time pressure - candidates can take their time

3. **AI Evaluation**:
   - Automatic scoring based on answers
   - Technical skill assessment
   - Resume alignment analysis

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy automatically

Or use Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

## Browser Compatibility

- Chrome/Edge: Full speech recognition support
- Firefox: Limited speech recognition
- Safari: Basic speech synthesis only
- Requires HTTPS for speech features in production
