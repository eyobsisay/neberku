from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from .models import EventType, Package, Event, Payment, GuestContribution, MediaFile, EventSettings

class EventTypeModelTest(TestCase):
    def setUp(self):
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type",
            icon="fas fa-star",
            color="#FF5733",
            sort_order=1
        )
    
    def test_event_type_creation(self):
        self.assertEqual(self.event_type.name, "Test Event Type")
        self.assertEqual(self.event_type.icon, "fas fa-star")
        self.assertEqual(self.event_type.color, "#FF5733")
        self.assertEqual(self.event_type.sort_order, 1)
        self.assertTrue(self.event_type.is_active)

class PackageModelTest(TestCase):
    def setUp(self):
        self.package = Package.objects.create(
            name="Test Package",
            description="A test package",
            price=Decimal('19.99'),
            max_guests=100,
            max_photos=500,
            max_videos=50,
            features=['QR Code', 'Basic Analytics']
        )
    
    def test_package_creation(self):
        self.assertEqual(self.package.name, "Test Package")
        self.assertEqual(self.package.price, Decimal('19.99'))
        self.assertEqual(self.package.max_guests, 100)
        self.assertTrue(self.package.is_active)

class EventModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.event_type = EventType.objects.create(
            name="Test Event Type",
            description="A test event type",
            icon="fas fa-star",
            color="#FF5733"
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
            event_date=timezone.now() + timezone.timedelta(days=7),
            location='Test Location'
        )
    
    def test_event_creation(self):
        self.assertEqual(self.event.title, "Test Event")
        self.assertEqual(self.event.host, self.user)
        self.assertEqual(self.event.package, self.package)
        self.assertEqual(self.event.event_type, self.event_type)
        self.assertEqual(self.event.status, 'draft')
        self.assertEqual(self.event.payment_status, 'pending')
        self.assertIsNone(self.event.event_thumbnail)  # Should be None by default
    
    def test_event_is_live_property(self):
        # Event should not be live initially
        self.assertFalse(self.event.is_live)
        
        # After payment, event should be live
        self.event.payment_status = 'paid'
        self.event.status = 'active'
        self.event.save()
        self.assertTrue(self.event.is_live)
    
    def test_total_media_files_property(self):
        self.assertEqual(self.event.total_media_files, 0)
    
    def test_event_thumbnail_field(self):
        """Test that event_thumbnail field exists and can be set"""
        self.assertIsNone(self.event.event_thumbnail)
        # In a real scenario, you would test with an actual image file
        # self.event.event_thumbnail = 'path/to/thumbnail.jpg'
        # self.event.save()
        # self.assertIsNotNone(self.event.event_thumbnail)

class GuestContributionModelTest(TestCase):
    def setUp(self):
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
            event_date=timezone.now() + timezone.timedelta(days=7)
        )
        
        self.contribution = GuestContribution.objects.create(
            event=self.event,
            guest_name="Test Guest",
            guest_phone="+1234567890"
        )
    
    def test_contribution_creation(self):
        self.assertEqual(self.contribution.guest_name, "Test Guest")
        self.assertEqual(self.contribution.guest_phone, "+1234567890")
        self.assertTrue(self.contribution.is_approved)
        self.assertEqual(self.contribution.total_media_files, 0)
    
    def test_contribution_str_representation(self):
        expected_str = f"Test Guest - 0 media files for Test Event"
        self.assertEqual(str(self.contribution), expected_str)
    
    def test_contribution_properties(self):
        self.assertEqual(self.contribution.photo_count, 0)
        self.assertEqual(self.contribution.video_count, 0)
        self.assertEqual(self.contribution.total_media_files, 0)

class MediaFileModelTest(TestCase):
    def setUp(self):
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
            event_date=timezone.now() + timezone.timedelta(days=7)
        )
        
        self.contribution = GuestContribution.objects.create(
            event=self.event,
            guest_name="Test Guest",
            guest_phone="+1234567890"
        )
        
        # Create a mock media file (in real scenario, this would be an actual file)
        self.media_file = MediaFile.objects.create(
            contribution=self.contribution,
            event=self.event,
            media_type='photo',
            wish_text="Happy Birthday!",
            file_size=1024,
            file_name="test_photo.jpg",
            mime_type="image/jpeg"
        )
    
    def test_media_file_creation(self):
        self.assertEqual(self.media_file.media_type, "photo")
        self.assertEqual(self.media_file.wish_text, "Happy Birthday!")
        self.assertEqual(self.media_file.file_size, 1024)
        self.assertEqual(self.media_file.file_name, "test_photo.jpg")
        self.assertEqual(self.media_file.mime_type, "image/jpeg")
        self.assertTrue(self.media_file.is_approved)
    
    def test_media_file_str_representation(self):
        expected_str = f"photo from Test Guest - Happy Birthday!"
        self.assertEqual(str(self.media_file), expected_str)
    
    def test_contribution_media_relationship(self):
        self.assertEqual(self.contribution.total_media_files, 1)
        self.assertEqual(self.contribution.photo_count, 1)
        self.assertEqual(self.contribution.video_count, 0)
        self.assertEqual(self.event.total_media_files, 1)
