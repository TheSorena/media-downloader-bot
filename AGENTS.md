# AGENTS.md

## Commands

- **Install**: `npm install`
- **Dev**: `npm run dev` (tsx watch)
- **Build**: `npm run build` (tsc)
- **Start**: `npm start` (node dist/index.js)
- **Type check**: `npx tsc --noEmit`
- **Docker build**: `docker compose up -d --build`

## Tech Stack

- Runtime: Node.js 22+
- Language: TypeScript (ESM modules)
- Bot framework: grammY
- Database: MongoDB (Mongoose)
- Downloader: yt-dlp (Python) + ffmpeg
- Deployment: Docker Compose with Local Bot API Server

## Project Structure

- `src/config/` - Environment config
- `src/models/` - Mongoose models (User, Download)
- `src/downloader/` - yt-dlp engine with progress + file cleanup
- `src/bot/middlewares/` - User tracking, quota, ban check
- `src/bot/commands/` - /start, /help, /stats
- `src/bot/handlers/` - URL detection, quality selection, download+upload
- `src/utils/` - Formatting, URL parsing, logging
- `src/locales/` - Persian text strings
