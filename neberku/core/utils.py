"""
Utility functions for Neberku application
"""
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_telegram_message(message, chat_id=None):
    """
    Send a message to Telegram using the bot API.
    
    Args:
        message (str): The message to send
        chat_id (str, int, or list, optional): The chat ID(s) to send to. 
            Can be a single ID or a list of IDs. If not provided, uses TELEGRAM_CHAT_ID from settings.
    
    Returns:
        bool: True if message was sent successfully to at least one recipient, False otherwise
    """
    # Get Telegram bot token from settings
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not bot_token:
        error_msg = 'TELEGRAM_BOT_TOKEN not configured in settings'
        logger.warning(error_msg)
        print(f"⚠️ {error_msg}")
        return False
    
    # Handle multiple chat IDs
    if chat_id is None:
        # Check for multiple chat IDs first, then single chat ID
        chat_ids_list = getattr(settings, 'TELEGRAM_CHAT_IDS', None)
        single_chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
        
        # If multiple chat IDs are configured, use them
        if chat_ids_list and isinstance(chat_ids_list, (list, tuple)) and len(chat_ids_list) > 0:
            return send_telegram_message_multiple(message, list(chat_ids_list))
        
        # Otherwise use single chat ID
        chat_id = single_chat_id
    
    # If chat_id is a list, send to multiple recipients
    if isinstance(chat_id, (list, tuple)):
        return send_telegram_message_multiple(message, chat_id)
    
    if not chat_id:
        error_msg = 'TELEGRAM_CHAT_ID or TELEGRAM_CHAT_IDS not configured in settings'
        logger.warning(error_msg)
        print(f"⚠️ {error_msg}")
        return False
    
    # Convert chat_id to integer if it's a string (Telegram API accepts both)
    try:
        if isinstance(chat_id, str):
            chat_id = int(chat_id)
    except (ValueError, TypeError):
        pass  # Keep as string if conversion fails
    
    # Telegram Bot API endpoint
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    
    # Prepare payload - try with HTML first, fallback to plain text if it fails
    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'  # Enable HTML formatting
    }
    
    try:
        print(f"📤 Attempting to send Telegram message to chat {chat_id}...")
        logger.info(f'Attempting to send Telegram message to chat {chat_id}')
        
        response = requests.post(url, json=payload, timeout=10)
        
        # If HTML parsing fails, try again with plain text
        if response.status_code == 200:
            response_data = response.json()
            if not response_data.get('ok') and 'parse' in str(response_data.get('description', '')).lower():
                print(f"⚠️ HTML parsing error, retrying with plain text...")
                payload['parse_mode'] = None
                del payload['parse_mode']
                response = requests.post(url, json=payload, timeout=10)
        
        # Log the response for debugging
        print(f"📡 Telegram API Response Status: {response.status_code}")
        logger.info(f'Telegram API Response Status: {response.status_code}')
        
        # Check if response is successful
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get('ok'):
                success_msg = f'✅ Telegram message sent successfully to chat {chat_id}'
                logger.info(success_msg)
                print(success_msg)
                return True
            else:
                error_description = response_data.get('description', 'Unknown error')
                error_msg = f'❌ Telegram API error: {error_description}'
                logger.error(error_msg)
                print(error_msg)
                print(f"   Full response: {response_data}")
                return False
        else:
            # Try to get error details from response
            try:
                error_data = response.json()
                error_description = error_data.get('description', f'HTTP {response.status_code}')
                error_msg = f'❌ Telegram API HTTP error {response.status_code}: {error_description}'
                logger.error(error_msg)
                print(error_msg)
                print(f"   Full response: {error_data}")
            except:
                error_msg = f'❌ Telegram API HTTP error {response.status_code}: {response.text}'
                logger.error(error_msg)
                print(error_msg)
            return False
            
    except requests.exceptions.Timeout:
        error_msg = '❌ Telegram API request timed out'
        logger.error(error_msg)
        print(error_msg)
        return False
    except requests.exceptions.ConnectionError as e:
        error_msg = f'❌ Telegram API connection error: {e}'
        logger.error(error_msg)
        print(error_msg)
        return False
    except requests.exceptions.RequestException as e:
        error_msg = f'❌ Failed to send Telegram message: {e}'
        logger.error(error_msg)
        print(error_msg)
        return False
    except Exception as e:
        error_msg = f'❌ Unexpected error sending Telegram message: {e}'
        logger.error(error_msg)
        print(error_msg)
        import traceback
        print(traceback.format_exc())
        return False


def send_telegram_message_multiple(message, chat_ids):
    """
    Send a message to multiple Telegram chat IDs.
    
    Args:
        message (str): The message to send
        chat_ids (list): List of chat IDs (str or int) to send to
    
    Returns:
        dict: Dictionary with results for each chat_id
            {
                'success_count': int,
                'failure_count': int,
                'results': {chat_id: bool, ...}
            }
    """
    if not chat_ids:
        print("⚠️ No chat IDs provided for multiple message sending")
        return {'success_count': 0, 'failure_count': 0, 'results': {}}
    
    results = {}
    success_count = 0
    failure_count = 0
    
    print(f"📤 Sending message to {len(chat_ids)} recipient(s)...")
    
    for chat_id in chat_ids:
        try:
            result = send_telegram_message(message, chat_id)
            results[chat_id] = result
            if result:
                success_count += 1
            else:
                failure_count += 1
        except Exception as e:
            print(f"❌ Error sending to chat {chat_id}: {e}")
            results[chat_id] = False
            failure_count += 1
    
    print(f"📊 Message delivery summary: {success_count} successful, {failure_count} failed")
    
    return {
        'success_count': success_count,
        'failure_count': failure_count,
        'results': results
    }


def format_event_creation_message(event, user, payment=None):
    """
    Format a message for event creation notification.
    
    Args:
        event: Event object
        user: User object (event host)
        payment: Payment object (optional)
    
    Returns:
        str: Formatted message
    """
    message = f"""
🎉 <b>New Event Created!</b>

📅 <b>Event:</b> {event.title}
👤 <b>Host:</b> {user.get_full_name() or user.username} ({user.email})
📍 <b>Location:</b> {event.location}
📆 <b>Date:</b> {event.event_date.strftime('%Y-%m-%d') if event.event_date else 'N/A'}
💰 <b>Package:</b> {event.package.name if event.package else 'N/A'}
"""
    
    if payment:
        message += f"""
💳 <b>Payment Details:</b>
   Amount: {payment.amount} ETB
   Method: {payment.payment_method.name if payment.payment_method else 'N/A'}
   Status: {payment.status}
"""
    
    message += f"""
🔗 <b>Event ID:</b> {event.id}
📊 <b>Status:</b> {event.status}
"""
    
    return message


def format_payment_confirmation_message(payment, event, user):
    """
    Format a message for payment confirmation notification.
    
    Args:
        payment: Payment object
        event: Event object
        user: User object (who confirmed the payment)
    
    Returns:
        str: Formatted message
    """
    message = f"""
✅ <b>Payment Confirmed!</b>

💳 <b>Payment Details:</b>
   Amount: {payment.amount} ETB
   Method: {payment.payment_method.name if payment.payment_method else 'N/A'}
   Transaction ID: {payment.transaction_id or 'N/A'}
   Paid At: {payment.paid_at.strftime('%Y-%m-%d %H:%M:%S') if payment.paid_at else 'N/A'}

📅 <b>Event:</b> {event.title}
👤 <b>Event Host:</b> {event.host.get_full_name() or event.host.username}
🔗 <b>Event ID:</b> {event.id}

✅ <b>Confirmed By:</b> {user.get_full_name() or user.username}
📊 <b>Event Status:</b> {event.status}
"""
    
    return message

