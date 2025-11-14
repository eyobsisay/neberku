# Telegram Bot Setup Guide

This guide explains how to set up Telegram notifications for event creation and payment confirmations in Neberku.

## Prerequisites

- A Telegram account
- Access to the Django settings file

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a conversation with BotFather
3. Send the command `/newbot`
4. Follow the prompts to:
   - Choose a name for your bot (e.g., "Neberku Notifications")
   - Choose a username for your bot (must end with `bot`, e.g., "neberku_notifications_bot")
5. BotFather will provide you with a **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. Save this token securely

## Step 2: Get Your Chat ID

You need to get the chat ID where you want to receive notifications. There are two methods:

### Method 1: Using a Group Chat (Recommended)

1. Create a new group in Telegram
2. Add your bot to the group
3. Send a message in the group
4. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Replace `<YOUR_BOT_TOKEN>` with your actual bot token
5. Look for the `"chat":{"id":-123456789}` in the response
6. The negative number (e.g., `-123456789`) is your group chat ID

### Method 2: Using Direct Messages

1. Start a conversation with your bot by searching for its username
2. Send a message to your bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":123456789}` in the response
5. The positive number is your personal chat ID

## Step 3: Configure Django Settings

You have two options to configure the Telegram bot:

### Option 1: Environment Variables (Recommended for Production)

Add these to your environment variables or `.env` file:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

Then update `neberku/settings.py` to read from environment:

```python
import os
from decouple import config

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = config('TELEGRAM_BOT_TOKEN', default=None)
TELEGRAM_CHAT_ID = config('TELEGRAM_CHAT_ID', default=None)
```

### Option 2: Direct Configuration (For Development)

Edit `neberku/settings.py` directly:

```python
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = 'your_bot_token_here'
TELEGRAM_CHAT_ID = 'your_chat_id_here'  # Can be negative for groups
```

## Step 4: Install Dependencies

Make sure `requests` is installed:

```bash
pip install requests
```

Or if using requirements.txt:

```bash
pip install -r requirements.txt
```

## Step 5: Test the Configuration

1. Start your Django server
2. Create a new event through the dashboard
3. Check your Telegram chat/group for the notification
4. Confirm a payment (as superuser)
5. Check Telegram again for the payment confirmation notification

## Troubleshooting

### Not Receiving Messages

1. **Check Bot Token**: Verify your bot token is correct
2. **Check Chat ID**: Make sure the chat ID is correct (negative for groups, positive for personal chats)
3. **Bot Permissions**: If using a group, make sure the bot has permission to send messages
4. **Check Logs**: Look at Django console output for error messages
5. **Test Manually**: Try sending a message using curl:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
        -H "Content-Type: application/json" \
        -d '{"chat_id": "<YOUR_CHAT_ID>", "text": "Test message"}'
   ```

### Common Errors

- **"TELEGRAM_BOT_TOKEN not configured"**: Bot token is missing or None
- **"TELEGRAM_CHAT_ID not configured"**: Chat ID is missing or None
- **"Failed to send Telegram message"**: Network issue or invalid credentials

## Security Notes

⚠️ **Important**: Never commit your bot token or chat ID to version control!

- Use environment variables for production
- Add `settings.py` to `.gitignore` if storing credentials directly
- Rotate your bot token if it's accidentally exposed

## Message Format

The notifications include:

### Event Creation Notification:
- Event title and details
- Host information
- Location and date
- Package information
- Payment details (if available)
- Event ID and status

### Payment Confirmation Notification:
- Payment amount and method
- Transaction details
- Event information
- Confirmation details
- Event status update

## Support

If you encounter issues, check:
1. Django logs for error messages
2. Telegram Bot API status
3. Network connectivity
4. Bot permissions in group chats

