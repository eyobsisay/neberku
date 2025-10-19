#!/usr/bin/env python3
"""
Test script for voice recording functionality in guest post creation endpoint.
This script tests the API endpoint to ensure voice recordings are properly handled.
"""

import requests
import json
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_EVENT_ID = None  # Will be set after creating a test event

def create_test_event():
    """Create a test event for voice recording testing"""
    print("Creating test event...")
    
    # First, get authentication token (assuming you have a test user)
    login_data = {
        "username": "testuser",  # Replace with your test username
        "password": "testpass"   # Replace with your test password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/token/", json=login_data)
        if response.status_code == 200:
            token = response.json()["access"]
            headers = {"Authorization": f"Bearer {token}"}
        else:
            print("Failed to get authentication token. Using without auth...")
            headers = {}
    except Exception as e:
        print(f"Authentication failed: {e}. Using without auth...")
        headers = {}
    
    # Create event data
    event_data = {
        "title": "Voice Recording Test Event",
        "description": "Testing voice recording functionality",
        "package_id": 1,  # Assuming package with ID 1 exists
        "event_type_id": 1,  # Assuming event type with ID 1 exists
        "event_date": "2024-12-31T23:59:59Z",
        "location": "Test Location",
        "allow_photos": True,
        "allow_videos": True,
        "allow_voice": True,  # Enable voice recordings
        "allow_wishes": True,
        "auto_approve_posts": True,
        "is_public": True
    }
    
    try:
        response = requests.post(f"{BASE_URL}/events/", json=event_data, headers=headers)
        if response.status_code == 201:
            event = response.json()
            global TEST_EVENT_ID
            TEST_EVENT_ID = event["id"]
            print(f"Test event created successfully: {TEST_EVENT_ID}")
            return event
        else:
            print(f"Failed to create event: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error creating event: {e}")
        return None

def create_test_voice_file():
    """Create a test voice file (simulate audio recording)"""
    print("Creating test voice file...")
    
    # Create a simple text file to simulate voice recording
    # In real implementation, this would be an actual audio file
    test_content = "This is a test voice recording content."
    test_file_path = "test_voice_recording.txt"
    
    with open(test_file_path, "w") as f:
        f.write(test_content)
    
    return test_file_path

def test_voice_recording_upload():
    """Test uploading voice recording to guest post creation endpoint"""
    if not TEST_EVENT_ID:
        print("No test event available. Cannot test voice recording upload.")
        return False
    
    print(f"Testing voice recording upload for event: {TEST_EVENT_ID}")
    
    # Create test voice file
    voice_file_path = create_test_voice_file()
    
    try:
        # Prepare form data for guest post creation
        form_data = {
            "event": TEST_EVENT_ID,
            "guest_name": "Test Guest",
            "guest_phone": "1234567890",
            "wish_text": "Testing voice recording functionality"
        }
        
        # Prepare files
        files = {
            "voice_recordings": ("test_voice.mp3", open(voice_file_path, "rb"), "audio/mp3")
        }
        
        # Make request to guest post creation endpoint
        response = requests.post(
            f"{BASE_URL}/guest-post-create/",
            data=form_data,
            files=files
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response content: {response.text}")
        
        if response.status_code == 201:
            post_data = response.json()
            print("Voice recording uploaded successfully!")
            print(f"Post ID: {post_data.get('id')}")
            print(f"Media files count: {post_data.get('total_media_files', 0)}")
            print(f"Voice count: {post_data.get('voice_count', 0)}")
            
            # Check if voice recording was properly saved
            media_files = post_data.get('media_files', [])
            voice_files = [mf for mf in media_files if mf.get('media_type') == 'voice']
            
            if voice_files:
                print(f"Voice recording file found: {voice_files[0].get('file_name')}")
                return True
            else:
                print("No voice recording files found in response")
                return False
        else:
            print(f"Failed to upload voice recording: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error testing voice recording upload: {e}")
        return False
    finally:
        # Clean up test file
        if os.path.exists(voice_file_path):
            os.remove(voice_file_path)
            print("Test voice file cleaned up")

def test_mixed_media_upload():
    """Test uploading photos, videos, and voice recordings together"""
    if not TEST_EVENT_ID:
        print("No test event available. Cannot test mixed media upload.")
        return False
    
    print(f"Testing mixed media upload for event: {TEST_EVENT_ID}")
    
    # Create test files
    photo_content = "Test photo content"
    video_content = "Test video content"
    voice_content = "Test voice content"
    
    photo_file = "test_photo.jpg"
    video_file = "test_video.mp4"
    voice_file = "test_voice.mp3"
    
    try:
        # Create test files
        with open(photo_file, "w") as f:
            f.write(photo_content)
        with open(video_file, "w") as f:
            f.write(video_content)
        with open(voice_file, "w") as f:
            f.write(voice_content)
        
        # Prepare form data
        form_data = {
            "event": TEST_EVENT_ID,
            "guest_name": "Mixed Media Guest",
            "guest_phone": "0987654321",
            "wish_text": "Testing mixed media upload (photo, video, voice)"
        }
        
        # Prepare files
        files = {
            "photos": (photo_file, open(photo_file, "rb"), "image/jpeg"),
            "videos": (video_file, open(video_file, "rb"), "video/mp4"),
            "voice_recordings": (voice_file, open(voice_file, "rb"), "audio/mp3")
        }
        
        # Make request
        response = requests.post(
            f"{BASE_URL}/guest-post-create/",
            data=form_data,
            files=files
        )
        
        print(f"Mixed media response status: {response.status_code}")
        print(f"Mixed media response content: {response.text}")
        
        if response.status_code == 201:
            post_data = response.json()
            print("Mixed media uploaded successfully!")
            print(f"Total media files: {post_data.get('total_media_files', 0)}")
            print(f"Photo count: {post_data.get('photo_count', 0)}")
            print(f"Video count: {post_data.get('video_count', 0)}")
            print(f"Voice count: {post_data.get('voice_count', 0)}")
            return True
        else:
            print(f"Failed to upload mixed media: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"Error testing mixed media upload: {e}")
        return False
    finally:
        # Clean up test files
        for file_path in [photo_file, video_file, voice_file]:
            if os.path.exists(file_path):
                os.remove(file_path)
        print("Test files cleaned up")

def main():
    """Main test function"""
    print("=== Voice Recording Functionality Test ===")
    print()
    
    # Test 1: Create test event
    event = create_test_event()
    if not event:
        print("Failed to create test event. Exiting...")
        return
    
    print()
    
    # Test 2: Test voice recording upload
    print("=== Test 1: Voice Recording Upload ===")
    voice_success = test_voice_recording_upload()
    print()
    
    # Test 3: Test mixed media upload
    print("=== Test 2: Mixed Media Upload ===")
    mixed_success = test_mixed_media_upload()
    print()
    
    # Summary
    print("=== Test Summary ===")
    print(f"Voice recording test: {'PASSED' if voice_success else 'FAILED'}")
    print(f"Mixed media test: {'PASSED' if mixed_success else 'FAILED'}")
    
    if voice_success and mixed_success:
        print("All tests passed! Voice recording functionality is working correctly.")
    else:
        print("Some tests failed. Please check the implementation.")

if __name__ == "__main__":
    main()
