# Interior Creator

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `OPENAI_API_KEY` or `VITE_OPENAI_API_KEY` in [.env.local](.env.local) to your OpenAI API key
3. Run the app:
   `npm run dev`

## Production AI Setup

Add `OPENAI_API_KEY` to the Vercel project environment variables for Production, Preview, and Development, then redeploy. The app checks `/api/openai-responses` before enabling generation.
