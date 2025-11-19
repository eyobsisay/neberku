from django.conf import settings
import os
import requests


def format_afromessage_recipient(phone_number: str) -> str:
    """Convert local Ethiopian numbers (09xxxxxxxx) to international format."""
    phone = phone_number.strip()
    country_code = os.environ.get('AFROMESSAGE_COUNTRY_CODE', '+251') or ''
    if phone.startswith('0') and country_code:
        return f"{country_code}{phone[1:]}"
    return phone


def send_afromessage_sms(phone_number: str, message: str):
    """
    Send SMS using AfroMessage gateway.
    Returns tuple (success: bool, error_message: str | None)
    """
    token = os.environ.get('AFROMESSAGE_TOKEN', '')
    from_id = os.environ.get('AFROMESSAGE_FROM_ID', '')
    sender_name = os.environ.get('AFROMESSAGE_SENDER', '')
    callback_url = os.environ.get('AFROMESSAGE_CALLBACK', '')
    base_url = os.environ.get('AFROMESSAGE_BASE_URL', 'https://api.afromessage.com/api/send')
    print(token, from_id, sender_name, callback_url, base_url)
    missing = [name for name, value in [
        ('AFROMESSAGE_TOKEN', token),
        ('AFROMESSAGE_FROM_ID', from_id),
    ] if not value]

    if missing:
        return False, f"Missing SMS configuration values: {', '.join(missing)}"

    headers = {'Authorization': f'Bearer {token}'}
    payload = {
        'callback': callback_url,
        'from': from_id,
        'sender': sender_name,
        'to': format_afromessage_recipient(phone_number),
        'message': message
    }

    # Remove callback if empty to avoid API errors
    if not callback_url:
        payload.pop('callback')

    if settings.DEBUG:
        print("[AfroMessage] Sending SMS", payload)

    try:
        response = requests.post(base_url, json=payload, headers=headers, timeout=15)
    except requests.RequestException as exc:
        if settings.DEBUG:
            print(f"[AfroMessage] Request error: {exc}")
        return False, f"SMS request failed: {exc}"

    if response.status_code != 200:
        if settings.DEBUG:
            print(f"[AfroMessage] HTTP {response.status_code}: {response.text}")
        return False, f"SMS gateway HTTP {response.status_code}: {response.text}"

    try:
        data = response.json()
    except ValueError:
        if settings.DEBUG:
            print("[AfroMessage] Invalid JSON response:", response.text)
        return False, "SMS gateway returned invalid JSON response"

    if data.get('acknowledge') == 'success':
        if settings.DEBUG:
            print("[AfroMessage] SMS request success:", data)
        return True, None

    if settings.DEBUG:
        print("[AfroMessage] Gateway error:", data)
    return False, data.get('message', 'SMS gateway reported an error')


