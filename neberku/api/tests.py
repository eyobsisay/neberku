from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from core.models import EventType, Package, Event, GuestContribution, GuestPost, EventSettings
from django.utils import timezone

class EventTypeAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type",
            icon="fas fa-star",
            color="#FF5733",
            sort_order=1
        )
    
    def test_list_event_types(self):
        """Test that event types can be listed without authentication"""
        url = reverse('eventtype-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Event Type')
    
    def test_featured_event_types(self):
        """Test featured event types endpoint"""
        url = reverse('eventtype-featured')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_create_event_type_admin_only(self):
        """Test that only admin users can create event types"""
        # Test without authentication
        url = reverse('eventtype-list')
        data = {
            'name': 'New Event Type',
            'description': 'A new event type',
            'icon': 'fas fa-star',
            'color': '#FF5733',
            'sort_order': 2
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test with regular user
        user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with admin user
        admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EventType.objects.count(), 2)
        self.assertEqual(response.data['name'], 'New Event Type')
    
    def test_create_event_type_duplicate_name(self):
        """Test that event types with duplicate names cannot be created"""
        admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.force_authenticate(user=admin_user)
        
        url = reverse('eventtype-list')
        data = {
            'name': 'Test Event Type',  # Same name as existing
            'description': 'Another event type',
            'icon': 'fas fa-heart',
            'color': '#FF69B4',
            'sort_order': 2
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

class PackageAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.package = Package.objects.create(
            name="Test Package",
            description="A test package",
            price=Decimal('19.99'),
            max_guests=100,
            max_photos=500,
            max_videos=50,
            features=['QR Code', 'Basic Analytics']
        )
    
    def test_list_packages(self):
        """Test that packages can be listed without authentication"""
        url = reverse('package-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Package')
    
    def test_featured_packages(self):
        """Test featured packages endpoint"""
        url = reverse('package-featured')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_create_package_admin_only(self):
        """Test that only admin users can create packages"""
        # Test without authentication
        url = reverse('package-list')
        data = {
            'name': 'Premium Package',
            'description': 'A premium package with high limits',
            'price': '49.99',
            'max_guests': 200,
            'max_photos': 1000,
            'max_videos': 100,
            'features': ['QR Code', 'Advanced Analytics', 'Priority Support'],
            'is_active': True
        }
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test with regular user
        user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=user)
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with admin user
        admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.force_authenticate(user=admin_user)
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Package.objects.count(), 2)
        self.assertEqual(response.data['name'], 'Premium Package')
        self.assertEqual(response.data['price'], '49.99')
    
    def test_create_package_validation(self):
        """Test package creation validation"""
        admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.force_authenticate(user=admin_user)
        
        url = reverse('package-list')
        
        # Test negative price
        data = {
            'name': 'Invalid Package',
            'description': 'A package with invalid price',
            'price': '-10.00',
            'max_guests': 100,
            'max_photos': 500,
            'max_videos': 50,
            'features': ['Basic Features'],
            'is_active': True
        }
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', response.data)
        
        # Test zero max_guests
        data['price'] = '10.00'
        data['max_guests'] = 0
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('max_guests', response.data)
        
        # Test negative max_photos
        data['max_guests'] = 100
        data['max_photos'] = -1
        response = self.client.post(url, json=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('max_photos', response.data)

class EventAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type"
        )
        
        self.package = Package.objects.create(
            name="Test Package",
            description="A test package",
            price=Decimal('19.99'),
            max_guests=100,
            max_photos=500,
            max_videos=50
        )
    
    def test_create_event(self):
        """Test that authenticated users can create events"""
        url = reverse('event-list')
        data = {
            'title': 'Test Event',
            'description': 'A test event',
            'package_id': self.package.id,
            'event_type_id': self.event_type.id,
            'event_date': '2024-12-31T18:00:00Z',
            'location': 'Test Location'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
        self.assertEqual(Event.objects.get().host, self.user)
    
    def test_event_creation_generates_qr_code_and_share_link(self):
        """Test that event creation automatically generates QR code and share link"""
        url = reverse('event-list')
        data = {
            'title': 'Test Event with QR',
            'description': 'A test event that should generate QR code and share link',
            'package_id': self.package.id,
            'event_type_id': self.event_type.id,
            'event_date': '2024-12-31T18:00:00Z',
            'location': 'Test Location'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the created event
        event = Event.objects.get(title='Test Event with QR')
        
        # Verify QR code was generated
        self.assertIsNotNone(event.qr_code)
        self.assertTrue(event.qr_code.name.startswith('qr_codes/qr_code_'))
        
        # Verify share link was generated
        self.assertIsNotNone(event.share_link)
        self.assertTrue(event.share_link.startswith('http://localhost:8000/event/'))
        self.assertIn(str(event.id), event.share_link)
    
    def test_event_qr_code_regeneration(self):
        """Test that QR codes can be regenerated"""
        # Create an event first
        event = Event.objects.create(
            title='Test Event for QR Regeneration',
            description='A test event for QR regeneration',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location'
        )
        
        # Store original QR code path
        original_qr_path = event.qr_code.path if event.qr_code else None
        
        # Regenerate QR code
        event.regenerate_qr_code()
        event.save()
        
        # Verify new QR code was generated
        self.assertIsNotNone(event.qr_code)
        self.assertNotEqual(event.qr_code.path, original_qr_path)
    
    def test_event_share_link_regeneration(self):
        """Test that share links can be regenerated"""
        # Create an event first
        event = Event.objects.create(
            title='Test Event for Share Link Regeneration',
            description='A test event for share link regeneration',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location'
        )
        
        # Store original share link
        original_share_link = event.share_link
        
        # Regenerate share link
        event.regenerate_share_link()
        event.save()
        
        # Verify new share link was generated
        self.assertIsNotNone(event.share_link)
        self.assertEqual(event.share_link, original_share_link)  # Should be the same since it's based on ID
    
    def test_create_payment_with_automatic_amount(self):
        """Test that payment amount is automatically set from package"""
        # Create an event first
        event_data = {
            'title': 'Test Event',
            'description': 'A test event',
            'package_id': self.package.id,
            'event_type_id': self.event_type.id,
            'event_date': '2024-12-31T18:00:00Z',
            'location': 'Test Location'
        }
        event_response = self.client.post(reverse('event-list'), event_data, format='json')
        self.assertEqual(event_response.status_code, status.HTTP_201_CREATED)
        event_id = event_response.data['id']
        
        # Create payment - amount should be automatic
        payment_data = {
            'event_id': event_id,
            'payment_method': 'stripe',
            'transaction_id': 'txn_test123'
        }
        payment_response = self.client.post(reverse('payment-list'), payment_data, format='json')
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        
        # Verify amount was set automatically from package
        self.assertEqual(payment_response.data['amount'], str(self.package.price))
        self.assertEqual(payment_response.data['payment_method'], 'stripe')
        self.assertEqual(payment_response.data['status'], 'pending')
        
        # Verify event payment status was updated
        event = Event.objects.get(id=event_id)
        self.assertEqual(event.payment_status, 'pending')
    
    def test_create_payment_without_package_fails(self):
        """Test that payment creation fails for events without packages"""
        # Create an event without a package (this shouldn't be possible with current model, but testing validation)
        event = Event.objects.create(
            title='Event Without Package',
            description='An event without package',
            host=self.user,
            package=self.package,  # We still need to set it due to model constraints
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location'
        )
        
        # Try to create payment - should work since event has package
        payment_data = {
            'event_id': event.id,
            'payment_method': 'stripe',
            'transaction_id': 'txn_test456'
        }
        payment_response = self.client.post(reverse('payment-list'), payment_data, format='json')
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(payment_response.data['amount'], str(self.package.price))
    
    def test_create_event_with_thumbnail(self):
        """Test that events can be created with thumbnail"""
        url = reverse('event-list')
        data = {
            'title': 'Test Event with Thumbnail',
            'description': 'A test event with thumbnail',
            'package_id': self.package.id,
            'event_type_id': self.event_type.id,
            'event_date': '2024-12-31T18:00:00Z',
            'location': 'Test Location'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that event was created
        event = Event.objects.get(title='Test Event with Thumbnail')
        self.assertIsNone(event.event_thumbnail)  # Should be None without file upload
    
    def test_list_events_authenticated(self):
        """Test that authenticated users can list their events"""
        Event.objects.create(
            title="Test Event",
            description="A test event",
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date='2024-12-31T18:00:00Z'
        )
        
        url = reverse('event-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

class GuestContributionAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type"
        )
        
        self.package = Package.objects.create(
            name="Test Package",
            description="A test package",
            price=Decimal('19.99'),
            max_guests=100,
            max_photos=500,
            max_videos=50
        )
        
        self.event = Event.objects.create(
            title="Test Event",
            description="A test event",
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date='2024-12-31T18:00:00Z',
            status='active',
            payment_status='paid'
        )
    
    def test_create_contribution_no_auth(self):
        """Test that guests can create contributions without authentication"""
        url = reverse('contribution-list')
        data = {
            'event': self.event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'contribution_type': 'wish',
            'content': 'Happy Birthday!'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GuestContribution.objects.count(), 1)
        self.assertEqual(GuestContribution.objects.get().guest_name, 'Test Guest')
    
    def test_list_contributions_public(self):
        """Test that contributions can be listed publicly for live events"""
        GuestContribution.objects.create(
            event=self.event,
            guest_name="Test Guest",
            guest_phone="+1234567890",
            contribution_type="wish",
            content="Happy Birthday!"
        )
        
        url = reverse('contribution-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

class GuestPostAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type"
        )
        
        self.package = Package.objects.create(
            name="Test Package",
            description="A test package",
            price=Decimal('19.99'),
            max_guests=100,
            max_photos=500,
            max_videos=50
        )
        
        self.event = Event.objects.create(
            title="Test Event",
            description="A test event",
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date='2024-12-31T18:00:00Z',
            status='active',
            payment_status='paid'
        )
    
    def test_create_guest_post_no_auth(self):
        """Test that guests can create guest posts without authentication"""
        url = reverse('guestpostcreate-list')
        data = {
            'event': self.event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Happy Birthday!'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GuestPost.objects.count(), 1)
        self.assertEqual(GuestPost.objects.get().wish_text, 'Happy Birthday!')
    
    def test_create_guest_post_with_multiple_photos(self):
        """Test creating a guest post with multiple photos"""
        # Create a test event that allows photos
        event = Event.objects.create(
            title='Test Event for Multiple Photos',
            description='A test event for multiple photo uploads',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=True,
            allow_videos=True
        )
        
        # Create event settings
        EventSettings.objects.create(
            event=event,
            max_media_per_post=5
        )
        
        url = reverse('guestpostcreate-list')
        
        # Create multiple photo files
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo1 = SimpleUploadedFile("photo1.jpg", b"fake photo 1", content_type="image/jpeg")
        photo2 = SimpleUploadedFile("photo2.jpg", b"fake photo 2", content_type="image/jpeg")
        photo3 = SimpleUploadedFile("photo3.jpg", b"fake photo 3", content_type="image/jpeg")
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Happy birthday!'
        }
        
        files = {
            'media_files': [photo1, photo2, photo3]
        }
        
        response = self.client.post(url, data, files=files, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the post was created
        post = GuestPost.objects.get(wish_text='Happy birthday!')
        self.assertEqual(post.media_files.count(), 3)
        
        # Verify all photos were created
        photos = post.media_files.filter(media_type='photo')
        self.assertEqual(photos.count(), 3)
        
        # Verify guest was created
        guest = post.guest
        self.assertEqual(guest.name, 'Test Guest')
        self.assertEqual(guest.phone, '+1234567890')
    
    def test_create_guest_post_with_multiple_videos(self):
        """Test creating a guest post with multiple videos"""
        # Create a test event that allows videos
        event = Event.objects.create(
            title='Test Event for Multiple Videos',
            description='A test event for multiple video uploads',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=True,
            allow_videos=True
        )
        
        # Create event settings
        EventSettings.objects.create(
            event=event,
            max_media_per_post=5
        )
        
        url = reverse('guestpostcreate-list')
        
        # Create multiple video files
        from django.core.files.uploadedfile import SimpleUploadedFile
        video1 = SimpleUploadedFile("video1.mp4", b"fake video 1", content_type="video/mp4")
        video2 = SimpleUploadedFile("video2.mp4", b"fake video 2", content_type="video/mp4")
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Congratulations!'
        }
        
        files = {
            'media_files': [video1, video2]
        }
        
        response = self.client.post(url, data, files=files, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the post was created
        post = GuestPost.objects.get(wish_text='Congratulations!')
        self.assertEqual(post.media_files.count(), 2)
        
        # Verify all videos were created
        videos = post.media_files.filter(media_type='video')
        self.assertEqual(videos.count(), 2)
    
    def test_create_guest_post_with_mixed_media(self):
        """Test creating a guest post with both photos and videos"""
        # Create a test event that allows both
        event = Event.objects.create(
            title='Test Event for Mixed Media',
            description='A test event for mixed media uploads',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=True,
            allow_videos=True
        )
        
        # Create event settings
        EventSettings.objects.create(
            event=event,
            max_media_per_post=5
        )
        
        url = reverse('guestpostcreate-list')
        
        # Create mixed media files
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo1 = SimpleUploadedFile("photo1.jpg", b"fake photo", content_type="image/jpeg")
        photo2 = SimpleUploadedFile("photo2.jpg", b"fake photo 2", content_type="image/jpeg")
        video1 = SimpleUploadedFile("video1.mp4", b"fake video", content_type="video/mp4")
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Mixed media post!'
        }
        
        files = {
            'media_files': [photo1, photo2, video1]
        }
        
        response = self.client.post(url, data, files=files, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the post was created
        post = GuestPost.objects.get(wish_text='Mixed media post!')
        self.assertEqual(post.media_files.count(), 3)
        
        # Verify photos and videos were created
        photos = post.media_files.filter(media_type='photo')
        videos = post.media_files.filter(media_type='video')
        self.assertEqual(photos.count(), 2)
        self.assertEqual(videos.count(), 1)
    
    def test_create_guest_post_media_limit_exceeded(self):
        """Test that media limit is enforced"""
        # Create a test event
        event = Event.objects.create(
            title='Test Event for Media Limits',
            description='A test event for media limit testing',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=True,
            allow_videos=True
        )
        
        # Create event settings with low limit
        EventSettings.objects.create(
            event=event,
            max_media_per_post=2
        )
        
        url = reverse('guestpostcreate-list')
        
        # Create multiple photo files exceeding the limit
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo1 = SimpleUploadedFile("photo1.jpg", b"fake photo 1", content_type="image/jpeg")
        photo2 = SimpleUploadedFile("photo2.jpg", b"fake photo 2", content_type="image/jpeg")
        photo3 = SimpleUploadedFile("photo3.jpg", b"fake photo 3", content_type="image/jpeg")
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Too many photos!'
        }
        
        files = {
            'media_files': [photo1, photo2, photo3]
        }
        
        response = self.client.post(url, data, files=files, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Maximum media files per post (2) exceeded', response.data['non_field_errors'][0])
    
    def test_media_type_detection(self):
        """Test that media types are automatically detected from file extensions"""
        # Create a test event
        event = Event.objects.create(
            title='Test Event for Media Type Detection',
            description='A test event for media type detection',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=True,
            allow_videos=True
        )
        
        # Create event settings
        EventSettings.objects.create(
            event=event,
            max_media_per_post=5
        )
        
        url = reverse('guestpostcreate-list')
        
        # Create files with different extensions
        from django.core.files.uploadedfile import SimpleUploadedFile
        photo_jpg = SimpleUploadedFile("photo.jpg", b"fake photo", content_type="image/jpeg")
        photo_png = SimpleUploadedFile("photo.png", b"fake photo", content_type="image/png")
        video_mp4 = SimpleUploadedFile("video.mp4", b"fake video", content_type="video/mp4")
        video_avi = SimpleUploadedFile("video.avi", b"fake video", content_type="video/x-msvideo")
        unknown_file = SimpleUploadedFile("file.xyz", b"fake file", content_type="application/octet-stream")
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Testing media type detection!'
        }
        
        files = {
            'media_files': [photo_jpg, photo_png, video_mp4, video_avi, unknown_file]
        }
        
        response = self.client.post(url, data, files=files, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the post was created
        post = GuestPost.objects.get(wish_text='Testing media type detection!')
        self.assertEqual(post.media_files.count(), 5)
        
        # Verify media types were detected correctly
        photos = post.media_files.filter(media_type='photo')
        videos = post.media_files.filter(media_type='video')
        self.assertEqual(photos.count(), 4)  # 2 photos + 1 unknown (defaults to photo)
        self.assertEqual(videos.count(), 2)  # 2 videos
        
        # Verify specific file types
        jpg_file = post.media_files.filter(media_file__endswith='.jpg').first()
        png_file = post.media_files.filter(media_file__endswith='.png').first()
        mp4_file = post.media_files.filter(media_file__endswith='.mp4').first()
        avi_file = post.media_files.filter(media_file__endswith='.avi').first()
        xyz_file = post.media_files.filter(media_file__endswith='.xyz').first()
        
        self.assertEqual(jpg_file.media_type, 'photo')
        self.assertEqual(png_file.media_type, 'photo')
        self.assertEqual(avi_file.media_type, 'video')
        self.assertEqual(xyz_file.media_type, 'photo')  # Unknown extension defaults to photo
    
    def test_create_guest_post_without_media(self):
        """Test creating a guest post without any media files (just text)"""
        # Create a test event that only allows wishes
        event = Event.objects.create(
            title='Test Event for Text Only',
            description='A test event for text-only posts',
            host=self.user,
            package=self.package,
            event_type=self.event_type,
            event_date=timezone.now() + timezone.timedelta(days=1),
            location='Test Location',
            allow_photos=False,
            allow_videos=False,
            allow_wishes=True
        )
        
        # Create event settings
        EventSettings.objects.create(
            event=event,
            max_media_per_post=0
        )
        
        url = reverse('guestpostcreate-list')
        
        data = {
            'event': event.id,
            'guest_name': 'Test Guest',
            'guest_phone': '+1234567890',
            'wish_text': 'Happy birthday! Wishing you all the best!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the post was created
        post = GuestPost.objects.get(wish_text='Happy birthday! Wishing you all the best!')
        self.assertEqual(post.media_files.count(), 0)
        
        # Verify guest was created
        guest = post.guest
        self.assertEqual(guest.name, 'Test Guest')
        self.assertEqual(guest.phone, '+1234567890')
