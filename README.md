# Pinggy Discord Bot

A Discord bot that provides automated support for Pinggy users by answering common questions and providing helpful information.

## Features

- Automated FAQ responses
- Channel-specific responses
- Rate limiting to prevent spam
- Smart keyword matching
- Error handling and logging

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   DISCORD_TOKEN=your_discord_token_here
   SUPPORT_CHANNEL_ID=your_support_channel_id_here
   ```
4. Start the bot:
   ```bash
   npm start
   ```

## Deployment

This bot is configured for deployment on Railway.app:

1. Push your code to GitHub
2. Connect your repository to Railway.app
3. Add the following environment variables in Railway:
   - `DISCORD_TOKEN`
   - `SUPPORT_CHANNEL_ID`

## Development

To test the FAQ matching system:

```bash
node bot.js
```

The bot will run test queries and show the responses in the console.
