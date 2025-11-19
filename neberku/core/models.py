from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import qrcode
from io import BytesIO
from django.core.files import File
from django.conf import settings
import os
from ckeditor.fields import RichTextField

class EventType(models.Model):
    """Dynamic event types that can be managed through admin"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="CSS class or icon name")
    color = models.CharField(max_length=7, blank=True, help_text="Hex color code (e.g., #FF5733)")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = "Event Type"
        verbose_name_plural = "Event Types"
    
    def __str__(self):
        return self.name

class Package(models.Model):
    """Event packages with different features and pricing"""
    name = models.CharField(max_length=100, help_text="Package name (e.g., Basic, Premium, Enterprise)")
    description = RichTextField(null=True, blank=True, help_text="Package description for customers")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Package price in ETB")
    max_guests = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum number of guests allowed. Leave empty for unlimited."
    )
    max_photos = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum number of photos allowed. Leave empty for unlimited."
    )
    max_videos = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum number of videos allowed. Leave empty for unlimited."
    )
    max_voice = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum number of voice recordings allowed. Leave empty for unlimited."
    )
    features = models.JSONField(default=list, null=True, blank=True, help_text="List of features as JSON array (e.g., ['QR Code', 'Analytics', 'Support'])")
    is_active = models.BooleanField(default=True, help_text="Whether this package is available for selection")
    is_try = models.BooleanField(
        default=False,
        help_text="If true, events created with this package are activated immediately without payment"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - ${self.price}"
    
    class Meta:
        ordering = ['price']

class PaymentMethod(models.Model):
    """Available payment methods (e.g., Stripe, PayPal, Manual)"""
    code = models.CharField(max_length=50, unique=True, help_text="Identifier used in code/integrations")
    name = models.CharField(max_length=100, help_text="Display name for the payment method")
    description = RichTextField(blank=True, null=True, help_text="Detailed payment instructions shown to users")
    account_number = models.CharField(max_length=100, blank=True, null=True, help_text="Optional receiving account number or wallet ID")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"

class Event(models.Model):
    """Event model for hosting photo/video collection events"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_payment', 'Pending Payment'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_events')
    package = models.ForeignKey(Package, on_delete=models.CASCADE)
    event_type = models.ForeignKey(EventType, on_delete=models.CASCADE, related_name='events')
    
    # Event details
    event_date = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True)
    event_thumbnail = models.ImageField(upload_to='event_thumbnails/', blank=True, null=True, help_text="Event preview image")
    event_video = models.FileField(upload_to='event_videos/', blank=True, null=True, help_text="Event video (mp4, mov, avi, webm)")
    event_banner = models.ImageField(upload_to='event_banners/', blank=True, null=True, help_text="Event banner image for header display")
    
    # Settings
    allow_photos = models.BooleanField(default=True)
    allow_videos = models.BooleanField(default=True)
    allow_voice = models.BooleanField(default=True)
    allow_wishes = models.BooleanField(default=True)
    auto_approve_posts = models.BooleanField(default=False)
    
    # Status and payment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
    
    # QR Code and sharing
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    share_link = models.URLField(blank=True, null=True)
    
    # Contributor access
    contributor_code = models.CharField(max_length=10, unique=True, blank=True, null=True, 
                                     help_text="Unique code for contributors to access this event")
    
    # Social features
    likes = models.ManyToManyField(User, related_name='liked_events', blank=True)
    
    # Privacy settings
    is_public = models.BooleanField(default=False, help_text="If True, event can be accessed without contributor code")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.host.username}"
    
    @property
    def frontend_share_url(self):
        """Get the frontend share URL for guest contribution"""
        return f"{settings.FRONTEND_URL}/guest-contribution.html?event={self.id}"
    
    def generate_qr_code(self):
        """Generate QR code for the event"""
        try:
            if not self.qr_code and self.id:
                # Ensure contributor code exists and is not empty
                if not self.contributor_code:
                    self.generate_contributor_code()
                
                # Double-check that contributor code exists before generating QR code
                if not self.contributor_code:
                    raise ValueError(f"Cannot generate QR code for event {self.id}: contributor_code is missing")
                
                # Create QR code data - use frontend URL for guest contribution with contributor code
                qr_data = f"{settings.FRONTEND_URL}/guest-contribution.html?event={self.id}&code={self.contributor_code}"
                
                # Generate QR code
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=4,
                )
                qr.add_data(qr_data)
                qr.make(fit=True)
                
                # Create image
                img = qr.make_image(fill_color="black", back_color="white")
                
                # Save to BytesIO
                buffer = BytesIO()
                img.save(buffer, format='PNG')
                buffer.seek(0)
                
                # Create filename
                filename = f"qr_code_{self.id}.png"
                
                # Save to model
                self.qr_code.save(filename, File(buffer), save=False)
        except Exception as e:
            # Log error but don't fail event creation
            print(f"Error generating QR code for event {self.id}: {e}")
            pass
    
    def _get_setting_value(self, attr_name, default_value):
        try:
            return getattr(self.settings, attr_name)
        except EventSettings.DoesNotExist:
            return default_value
        except AttributeError:
            return default_value
    
    @property
    def max_posts_per_guest(self):
        return self._get_setting_value('max_posts_per_guest', 5)
    
    @property
    def max_image_per_post(self):
        return self._get_setting_value('max_image_per_post', 3)
    
    @property
    def max_video_per_post(self):
        return self._get_setting_value('max_video_per_post', 2)
    
    @property
    def max_voice_per_post(self):
        return self._get_setting_value('max_voice_per_post', 1)
    
    def generate_share_link(self):
        """Generate share link for the event"""
        try:
            if not self.share_link and self.id:
                # Create share link - use frontend URL for guest contribution
                share_url = f"{settings.FRONTEND_URL}/guest-contribution.html?event={self.id}"
                self.share_link = share_url
        except Exception as e:
            # Log error but don't fail event creation
            print(f"Error generating share link for event {self.id}: {e}")
            pass
    
    def generate_contributor_code(self):
        """Generate a unique contributor code for the event"""
        import random
        import string
        
        try:
            if not self.contributor_code:
                # Generate a 6-character alphanumeric code
                while True:
                    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    # Check if code is unique
                    if not Event.objects.filter(contributor_code=code).exists():
                        self.contributor_code = code
                        break
        except Exception as e:
            # Log error but don't fail event creation
            print(f"Error generating contributor code for event {self.id}: {e}")
            pass
    
    def regenerate_qr_code(self):
        """Regenerate QR code (useful for updating existing events)"""
        # Delete existing QR code if it exists
        if self.qr_code:
            if os.path.exists(self.qr_code.path):
                os.remove(self.qr_code.path)
            self.qr_code.delete(save=False)
        
        # Generate new QR code
        self.generate_qr_code()
    
    def regenerate_share_link(self):
        """Regenerate share link (useful for updating existing events)"""
        self.generate_share_link()
    
    def regenerate_contributor_code(self):
        """Regenerate contributor code (useful for updating existing events)"""
        self.contributor_code = None
        self.generate_contributor_code()
            
    def save(self, *args, **kwargs):
        try:
            # Save first to get the ID
            super().save(*args, **kwargs)
            
            # Generate contributor code FIRST (before QR code, since QR code needs it)
            needs_save = False
            
            if not self.contributor_code:
                self.generate_contributor_code()
                needs_save = True
            
            # Now generate QR code (which requires contributor_code)
            if not self.qr_code:
                self.generate_qr_code()
                needs_save = True
                
            if not self.share_link:
                self.generate_share_link()
                needs_save = True
                
            if self.status == 'active' and not self.published_at:
                self.published_at = timezone.now()
                needs_save = True
                
            # Save again if we made changes
            if needs_save:
                super().save(update_fields=['qr_code', 'share_link', 'contributor_code', 'published_at'])
                
        except Exception as e:
            print(f"Error in Event.save() for event {getattr(self, 'id', 'unknown')}: {e}")
            # Still save the event even if QR code generation fails
            if not self.pk:
                super().save(*args, **kwargs)
            raise
    
    @property
    def is_live(self):
        return self.status == 'active' and self.payment_status == 'paid'
    
    @property
    def total_guest_posts(self):
        return self.guest_posts.count()
    
    @property
    def total_media_files(self):
        return self.media_files.count()
    
    @property
    def photo_count(self):
        return self.media_files.filter(media_type='photo').count()
    
    @property
    def video_count(self):
        return self.media_files.filter(media_type='video').count()
    
    @property
    def voice_count(self):
        return self.media_files.filter(media_type='voice').count()
    
    @property
    def like_count(self):
        """Get the total number of likes for this event"""
        return self.likes.count()
    
    def is_liked_by(self, user):
        """Check if a specific user has liked this event"""
        if user.is_authenticated:
            return self.likes.filter(id=user.id).exists()
        return False
    
    def can_be_accessed_by_guest(self, contributor_code=None):
        """Check if a guest can access this event"""
        # All events require a valid contributor code
        if contributor_code and contributor_code == self.contributor_code:
            return True
        
        return False
    
    def toggle_like(self, user):
        """Toggle like status for a user"""
        if user.is_authenticated:
            if self.is_liked_by(user):
                self.likes.remove(user)
                return False  # Unliked
            else:
                self.likes.add(user)
                return True   # Liked
        return None  # Not authenticated
    
    class Meta:
        ordering = ['-created_at']

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    """Payment tracking for events"""
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.CASCADE, related_name='payments')
    transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Payment for {self.event.title} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']

class Guest(models.Model):
    """Guest information model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='guests')
    
    # Guest info (no login required)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    
    # Metadata
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.event.title}"
    
    @property
    def total_posts(self):
        return self.posts.count()
    
    @property
    def total_media_files(self):
        return self.media_files.count()
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'phone']),
        ]
        unique_together = ['event', 'phone']

class GuestPost(models.Model):
    """Guest post containing wish text and optional media files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='posts')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='guest_posts')
    
    # Post content
    wish_text = models.TextField(help_text="Share your wish, message, or thoughts for the event")
    
    # Metadata
    is_approved = models.BooleanField(default=True)  # Auto-approved by default
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Post from {self.guest.name} - {self.wish_text[:50]}"
    
    def save(self, *args, **kwargs):
        if self.is_approved and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)
    
    @property
    def total_media_files(self):
        return self.media_files.count()
    
    @property
    def photo_count(self):
        return self.media_files.filter(media_type='photo').count()
    
    @property
    def video_count(self):
        return self.media_files.filter(media_type='video').count()
    
    @property
    def voice_count(self):
        return self.media_files.filter(media_type='voice').count()
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'is_approved']),
        ]

class MediaFile(models.Model):
    """Individual media files (photos/videos/voice) related to guest posts"""
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
        ('voice', 'Voice Recording'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(GuestPost, on_delete=models.CASCADE, related_name='media_files')
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='media_files')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='media_files')
    
    # Media details
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    media_file = models.FileField(upload_to='contributions/')
    media_thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    
    # Metadata
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    
    # Approval status
    is_approved = models.BooleanField(default=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.media_type} from {self.guest.name} - {self.post.wish_text[:30]}"
    
    def save(self, *args, **kwargs):
        if self.is_approved and not self.approved_at:
            self.approved_at = timezone.now()
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'media_type', 'is_approved']),
            models.Index(fields=['post', 'media_type']),
        ]

class EventSettings(models.Model):
    """Additional settings for events"""
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='settings')
    
    # Photo settings
    max_photo_size = models.PositiveIntegerField(default=100)  # MB
    allowed_photo_formats = models.JSONField(default=['jpg', 'png', 'heic'])
    
    # Video settings
    max_video_size = models.PositiveIntegerField(default=100)  # MB
    max_video_duration = models.PositiveIntegerField(default=60)  # seconds
    allowed_video_formats = models.JSONField(default=['mp4', 'mov'])
    
    # Voice settings
    max_voice_size = models.PositiveIntegerField(default=100)  # MB
    max_voice_duration = models.PositiveIntegerField(default=300)  # seconds (5 minutes)
    allowed_voice_formats = models.JSONField(default=['mp3', 'wav', 'm4a', 'aac'])
    
    # Guest settings
    require_approval = models.BooleanField(default=False)
    allow_anonymous = models.BooleanField(default=False)
    max_posts_per_guest = models.PositiveIntegerField(default=1)
    make_validation_per_media = models.BooleanField(
        default=False,
        help_text="If enabled, users' media is validated per media type (images, videos, voice). If disabled, they can apply any media with the value set in max_posts_per_guest"
    )
    max_image_per_post = models.PositiveIntegerField(default=3, help_text="Maximum number of images per guest post")
    max_video_per_post = models.PositiveIntegerField(default=2, help_text="Maximum number of videos per guest post")
    max_voice_per_post = models.PositiveIntegerField(default=1, help_text="Maximum number of voice recordings per guest post")
    
    # Privacy settings
    public_gallery = models.BooleanField(default=False)
    show_guest_names = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.event.title}"
    
    class Meta:
        verbose_name_plural = "Event Settings"


class PhoneOTP(models.Model):
    """OTP model for phone number authentication"""
    phone_number = models.CharField(max_length=20, db_index=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'is_verified']),
        ]
    
    def __str__(self):
        return f"OTP for {self.phone_number} - {self.otp_code}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        return not self.is_expired() and not self.is_verified and self.attempts < 5