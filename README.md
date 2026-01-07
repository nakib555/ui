
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xVVpeyj8ng00CXTr6UlyxYZVc0yYEYpb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env` file in the root directory (or copy `.env.local` if it exists).
3. Set your API key and optional backend configuration:
   ```env
   # Required: Google Gemini API Key
   API_KEY="your_gemini_api_key_here"
   
   # Optional: URL of the backend server (defaults to relative path /api)
   # Useful if running frontend and backend on different ports or domains
   BACKEND_URL="http://localhost:3001"
   ```
4. Run the app:
   `npm run dev`
