# Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Variables Required
Set these in your Vercel dashboard under "Settings" > "Environment Variables":

```
GEMINI_API_KEY=your_gemini_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
```

### 2. Get Google Gemini API Key
- Visit [Google AI Studio](https://aistudio.google.com)
- Create a new API key
- Copy the key for `GEMINI_API_KEY`

### 3. Setup Gmail SMTP
- Enable 2-factor authentication on your Gmail account
- Go to Google Account settings > Security > App passwords
- Generate an app password for "Mail"
- Use this password (not your regular password) for `SMTP_PASS`

## 🚀 Deployment Steps

### Option 1: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Import the project in Vercel
4. Add environment variables in Vercel dashboard
5. Deploy!

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## ✅ Post-Deployment Verification

### Test These URLs:
- `https://your-app.vercel.app/` - Landing page
- `https://your-app.vercel.app/admin-upload` - Admin dashboard
- Test PDF upload and email sending

### Check These Features:
- [ ] PDF upload works
- [ ] Email sending works  
- [ ] Interview links are generated
- [ ] AI questions generate properly
- [ ] Speech recognition works (Chrome/Edge)
- [ ] Interview evaluation works

## 🔧 Common Issues & Solutions

### Issue: "GEMINI_API_KEY is not defined"
**Solution**: Make sure you've added all environment variables in Vercel dashboard

### Issue: Email not sending
**Solution**: 
- Verify Gmail app password (not regular password)
- Check SMTP settings are correct
- Ensure 2FA is enabled on Gmail

### Issue: Speech recognition not working
**Solution**: 
- Speech APIs require HTTPS (works automatically on Vercel)
- Test in Chrome/Edge browsers
- Ensure microphone permissions are granted

### Issue: Build errors
**Solution**: 
- Check all dependencies are in package.json
- Verify API routes are properly structured
- Check console for specific error messages

## 📱 Browser Compatibility
- **Full Support**: Chrome, Edge (speech recognition + synthesis)
- **Partial Support**: Firefox (limited speech recognition)
- **Basic Support**: Safari (speech synthesis only)

## 🎯 Key Features Verified
- ✅ 6 questions per interview
- ✅ No time limits/pressure
- ✅ Resume-specific questioning
- ✅ AI evaluation
- ✅ Email notifications
- ✅ Voice interface

Your app is ready for production! 🎉