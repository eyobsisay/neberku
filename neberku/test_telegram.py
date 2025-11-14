"""
Test script for Telegram bot integration
Run this script to test if Telegram messaging is working correctly
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'neberku.settings')
django.setup()

from django.conf import settings
from core.utils import send_telegram_message
import requests

def test_telegram_config():
    """Test if Telegram configuration is set up correctly"""
    print("=" * 60)
    print("Testing Telegram Configuration")
    print("=" * 60)
    
    # Check bot token
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not bot_token:
        print("❌ TELEGRAM_BOT_TOKEN is not configured")
        return False
    else:
        print(f"✅ TELEGRAM_BOT_TOKEN is configured: {bot_token[:10]}...")
    
    # Check chat ID
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
    if not chat_id:
        print("❌ TELEGRAM_CHAT_ID is not configured")
        return False
    else:
        print(f"✅ TELEGRAM_CHAT_ID is configured: {chat_id}")
    
    return True

def test_bot_info():
    """Test if bot token is valid by getting bot info"""
    print("\n" + "=" * 60)
    print("Testing Bot Token Validity")
    print("=" * 60)
    
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not bot_token:
        print("❌ Bot token not configured")
        return False
    
    url = f'https://api.telegram.org/bot{bot_token}/getMe'
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                print(f"✅ Bot token is valid!")
                print(f"   Bot Name: {bot_info.get('first_name', 'N/A')}")
                print(f"   Bot Username: @{bot_info.get('username', 'N/A')}")
                print(f"   Bot ID: {bot_info.get('id', 'N/A')}")
                return True
            else:
                print(f"❌ Bot API returned error: {data.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error checking bot info: {e}")
        return False

def test_chat_access():
    """Test if bot can access the chat"""
    print("\n" + "=" * 60)
    print("Testing Chat Access")
    print("=" * 60)
    
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
    
    if not bot_token or not chat_id:
        print("❌ Bot token or chat ID not configured")
        return False
    
    # Convert chat_id to int if it's a string
    try:
        if isinstance(chat_id, str):
            chat_id = int(chat_id)
    except (ValueError, TypeError):
        pass
    
    url = f'https://api.telegram.org/bot{bot_token}/getChat'
    payload = {'chat_id': chat_id}
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                chat_info = data.get('result', {})
                print(f"✅ Bot can access the chat!")
                print(f"   Chat Type: {chat_info.get('type', 'N/A')}")
                if chat_info.get('type') == 'private':
                    print(f"   User: {chat_info.get('first_name', '')} {chat_info.get('last_name', '')}")
                elif chat_info.get('type') in ['group', 'supergroup']:
                    print(f"   Group Title: {chat_info.get('title', 'N/A')}")
                return True
            else:
                error_desc = data.get('description', 'Unknown error')
                print(f"❌ Cannot access chat: {error_desc}")
                print(f"\n💡 Common issues:")
                print(f"   - For private chats: Make sure you've started a conversation with the bot")
                print(f"   - For groups: Make sure the bot is added to the group")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error checking chat access: {e}")
        return False

def test_send_message():
    """Test sending a message"""
    print("\n" + "=" * 60)
    print("Testing Message Sending")
    print("=" * 60)
    
    test_message = """
🧪 <b>Test Message from Neberku</b>

This is a test message to verify Telegram integration is working correctly.

✅ If you receive this message, everything is configured properly!
"""
    
    # Check if multiple chat IDs are configured
    chat_ids = getattr(settings, 'TELEGRAM_CHAT_IDS', None)
    if chat_ids and isinstance(chat_ids, (list, tuple)):
        print(f"Sending test message to {len(chat_ids)} recipient(s)...")
        from core.utils import send_telegram_message_multiple
        result = send_telegram_message_multiple(test_message, list(chat_ids))
        
        if isinstance(result, dict):
            success = result.get('success_count', 0)
            failure = result.get('failure_count', 0)
            if success > 0:
                print(f"✅ Test message sent successfully to {success} recipient(s)!")
                print("   Check your Telegram chats/groups to see the message.")
                if failure > 0:
                    print(f"⚠️ Failed to send to {failure} recipient(s)")
                return True
            else:
                print(f"❌ Failed to send test message to all recipients")
                return False
    else:
        print("Sending test message to single recipient...")
        result = send_telegram_message(test_message)
        
        if result:
            print("✅ Test message sent successfully!")
            print("   Check your Telegram chat/group to see the message.")
            return True
        else:
            print("❌ Failed to send test message")
            print("   Check the error messages above for details.")
            return False

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("Telegram Integration Test Suite")
    print("=" * 60 + "\n")
    
    # Run tests
    config_ok = test_telegram_config()
    if not config_ok:
        print("\n❌ Configuration test failed. Please configure Telegram settings first.")
        return
    
    bot_ok = test_bot_info()
    if not bot_ok:
        print("\n❌ Bot token test failed. Please check your bot token.")
        return
    
    chat_ok = test_chat_access()
    if not chat_ok:
        print("\n❌ Chat access test failed. Please check your chat ID and bot permissions.")
        return
    
    message_ok = test_send_message()
    
    print("\n" + "=" * 60)
    if message_ok:
        print("✅ All tests passed! Telegram integration is working correctly.")
    else:
        print("❌ Some tests failed. Please check the error messages above.")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    main()

