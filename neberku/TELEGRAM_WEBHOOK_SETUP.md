# Telegram Webhook Setup Guide

This guide explains how to set up Telegram webhooks to enable payment confirmation buttons in Telegram messages.

## Overview

When a new event is created with a pending payment, the system will send a Telegram message with action buttons:
- ✅ **Confirm Payment** - Confirms the payment and activates the event
- ❌ **Reject Payment** - Rejects the payment

## Step 1: Set Up Webhook URL

You need to configure Telegram to send updates to your Django server. The webhook endpoint is:
```
https://api.koshkoshe.com/api/telegram/webhook/
```
(Replace with your actual domain)

### Option 1: Using Telegram Bot API (Recommended)

Set the webhook using curl or a script:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://api.koshkoshe.com/api/telegram/webhook/"}'
```

### Option 2: Using Python Script

Create a file `set_telegram_webhook.py`:

```python
import requests
from django.conf import settings

bot_token = "YOUR_BOT_TOKEN"
webhook_url = "https://api.koshkoshe.com/api/telegram/webhook/"

url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
payload = {"url": webhook_url}

response = requests.post(url, json=payload)
print(response.json())
```

Run it:
```bash
python set_telegram_webhook.py
```

## Step 2: Verify Webhook

Check if webhook is set correctly:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

You should see your webhook URL in the response.

## Step 3: Test the Integration

1. **Create a new event** through the dashboard
2. **Check Telegram** - You should receive:
   - An event creation notification
   - A payment pending notification with buttons
3. **Click "✅ Confirm Payment"** button
4. **Verify**:
   - The message updates to show confirmation
   - Payment status changes to "completed"
   - Event status changes to "active"

## How It Works

1. **Event Creation**: When an event is created, the system sends:
   - Event creation notification (info message)
   - Payment pending notification (with action buttons)

2. **Button Click**: When a user clicks a button:
   - Telegram sends a callback query to your webhook
   - The webhook processes the action
   - Payment is confirmed/rejected
   - The original message is updated
   - A confirmation notification is sent

3. **Security**: 
   - The webhook endpoint is public (AllowAny) but validates payment IDs
   - Only valid payment IDs can be processed
   - Duplicate confirmations are prevented

## Troubleshooting

### Buttons Not Appearing

1. **Check bot token**: Verify `TELEGRAM_BOT_TOKEN` in settings
2. **Check message format**: Ensure `format_payment_pending_message` is called
3. **Check console logs**: Look for error messages

### Buttons Not Working

1. **Webhook not set**: Run the webhook setup command
2. **Webhook URL incorrect**: Verify the URL is accessible
3. **Server not accessible**: Ensure your server is publicly accessible
4. **Check Django logs**: Look for webhook processing errors

### Testing Webhook Locally

For local development, use a tool like **ngrok** to expose your local server:

```bash
ngrok http 8000
```

Then set webhook to the ngrok URL:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-ngrok-url.ngrok.io/api/telegram/webhook/"}'
```

## Security Considerations

1. **HTTPS Required**: Telegram requires HTTPS for webhooks (except localhost)
2. **Token Security**: Never expose your bot token
3. **Validation**: The webhook validates payment IDs before processing
4. **Rate Limiting**: Consider adding rate limiting for production

## Webhook Endpoint Details

- **URL**: `/api/telegram/webhook/`
- **Method**: POST
- **Authentication**: None (public endpoint)
- **Content-Type**: application/json
- **Format**: Telegram Update object

## Manual Testing

You can test the webhook manually by sending a test callback:

```python
import requests

webhook_url = "https://api.koshkoshe.com/api/telegram/webhook/"
test_data = {
    "update_id": 123456,
    "callback_query": {
        "id": "test_callback_id",
        "from": {"id": 346435059, "first_name": "Test"},
        "message": {
            "message_id": 123,
            "chat": {"id": 346435059}
        },
        "data": "confirm_payment_<PAYMENT_ID>"
    }
}

response = requests.post(webhook_url, json=test_data)
print(response.json())
```

Replace `<PAYMENT_ID>` with an actual payment ID from your database.

## Support

If you encounter issues:
1. Check Django console logs
2. Verify webhook is set correctly
3. Test webhook endpoint manually
4. Check Telegram Bot API status

