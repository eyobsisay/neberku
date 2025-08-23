from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import qrcode
from io import BytesIO
from django.core.files import File
from django.conf import settings
import os

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
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    max_guests = models.PositiveIntegerField()
    max_photos = models.PositiveIntegerField()
    max_videos = models.PositiveIntegerField()
    features = models.JSONField(default=list)  # List of features
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - ${self.price}"
    
    class Meta:
        ordering = ['price']

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
    
    # Settings
    allow_photos = models.BooleanField(default=True)
    allow_videos = models.BooleanField(default=True)
    allow_wishes = models.BooleanField(default=True)
    auto_approve_posts = models.BooleanField(default=False)
    
    # Status and payment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
    
    # QR Code and sharing
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    share_link = models.URLField(blank=True, null=True)
    
    # Social features
    likes = models.ManyToManyField(User, related_name='liked_events', blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.host.username}"
    
    def generate_qr_code(self):
        """Generate QR code for the event"""
        try:
            if not self.qr_code and self.id:
                # Create QR code data
                qr_data = f"{settings.SITE_URL}/event/{self.id}/"
                
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
    
    def generate_share_link(self):
        """Generate share link for the event"""
        try:
            if not self.share_link and self.id:
                # Create share link
                share_url = f"{settings.SITE_URL}/event/{self.id}/"
                self.share_link = share_url
        except Exception as e:
            # Log error but don't fail event creation
            print(f"Error generating share link for event {self.id}: {e}")
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
            
    def save(self, *args, **kwargs):
        try:
            # Save first to get the ID
            super().save(*args, **kwargs)
            
            # Generate QR code and share link if they don't exist
            needs_save = False
            
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
                super().save(update_fields=['qr_code', 'share_link', 'published_at'])
                
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
    def like_count(self):
        """Get the total number of likes for this event"""
        return self.likes.count()
    
    def is_liked_by(self, user):
        """Check if a specific user has liked this event"""
        if user.is_authenticated:
            return self.likes.filter(id=user.id).exists()
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
    """Payment tracking for events"""
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=[
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('manual', 'Manual'),
    ])
    transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
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
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'is_approved']),
        ]

class MediaFile(models.Model):
    """Individual media files (photos/videos) related to guest posts"""
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
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
    max_photo_size = models.PositiveIntegerField(default=10)  # MB
    allowed_photo_formats = models.JSONField(default=['jpg', 'png', 'heic'])
    
    # Video settings
    max_video_size = models.PositiveIntegerField(default=100)  # MB
    max_video_duration = models.PositiveIntegerField(default=60)  # seconds
    allowed_video_formats = models.JSONField(default=['mp4', 'mov'])
    
    # Guest settings
    require_approval = models.BooleanField(default=False)
    allow_anonymous = models.BooleanField(default=False)
    max_posts_per_guest = models.PositiveIntegerField(default=5)
    max_media_per_post = models.PositiveIntegerField(default=3)
    
    # Privacy settings
    public_gallery = models.BooleanField(default=False)
    show_guest_names = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.event.title}"
    
    class Meta:
        verbose_name_plural = "Event Settings"
