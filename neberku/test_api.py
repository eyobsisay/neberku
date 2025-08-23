#!/usr/bin/env python
"""
Python script to test the guest post creation API
"""
import requests
import json
from pathlib import Path

def test_guest_post_creation():
    """Test creating a guest post with media files"""
    
    # API endpoint
    url = "http://localhost:8000/api/guest-post-create/"
    
    # Test data
    data = {
        'event': 'YOUR_EVENT_UUID_HERE',  # Replace with actual event UUID
        'guest_name': 'John Doe',
        'guest_phone': '+1234567890',
        'wish_text': 'Happy birthday! Here are some photos and videos from the celebration!'
    }
    
    # Create test files (you can replace these with actual files)
    files = []
    
    # Create a simple test image file
    test_image_path = Path('test_image.jpg')
    if not test_image_path.exists():
        # Create a minimal JPEG file for testing
        with open(test_image_path, 'wb') as f:
            # Minimal JPEG header
            f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9')
    
    # Add the test image to photos - each photo gets its own 'photos' key
    with open(test_image_path, 'rb') as f:
        files.append(('photos', ('test_image.jpg', f.read(), 'image/jpeg')))
    
    # Create a simple test video file
    test_video_path = Path('test_video.mp4')
    if not test_video_path.exists():
        # Create a minimal MP4 file for testing
        with open(test_video_path, 'wb') as f:
            # Minimal MP4 header
            f.write(b'\x00\x00\x00\x18ftypmp41\x00\x00\x00\x00mp41isom\x00\x00\x00\x08free\x00\x00\x00\x00')
    
    # Add the test video to videos - each video gets its own 'videos' key
    with open(test_video_path, 'rb') as f:
        files.append(('videos', ('test_video.mp4', f.read(), 'video/mp4')))
    
    print(f"Testing guest post creation with photos and videos...")
    print(f"Data: {json.dumps(data, indent=2)}")
    print(f"Files: {[f[1][0] for f in files]}")
    
    try:
        # Make the request
        response = requests.post(url, data=data, files=files)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.ok:
            print("\n✅ SUCCESS!")
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print("\n❌ ERROR!")
            print("Response:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the Django server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Clean up test files
    if test_image_path.exists():
        test_image_path.unlink()
    if test_video_path.exists():
        test_video_path.unlink()

def test_without_media():
    """Test creating a guest post without media files"""
    
    url = "http://localhost:8000/api/guest-post-create/"
    
    data = {
        'event': 'YOUR_EVENT_UUID_HERE',  # Replace with actual event UUID
        'guest_name': 'Jane Smith',
        'guest_phone': '+1987654321',
        'wish_text': 'Happy birthday! Wishing you all the best!'
    }
    
    print(f"\nTesting guest post creation WITHOUT media files...")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, data=data)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.ok:
            print("\n✅ SUCCESS!")
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print("\n❌ ERROR!")
            print("Response:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
                
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the Django server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == '__main__':
    print("Guest Post Creation API Test")
    print("=" * 40)
    
    # Test with media files
    test_guest_post_creation()
    
    # Test without media files
    test_without_media()
    
    print("\n" + "=" * 40)
    print("Test completed!")
    print("\nNote: Make sure to:")
    print("1. Replace 'YOUR_EVENT_UUID_HERE' with an actual event UUID")
    print("2. Have the Django server running on http://localhost:8000")
    print("3. Have an event with status='active' and payment_status='paid'") 