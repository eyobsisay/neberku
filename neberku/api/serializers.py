from rest_framework import serializers
from core.models import EventType, Package, Event, Payment, Guest, GuestPost, MediaFile, EventSettings
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class EventTypeSerializer(serializers.ModelSerializer):
    """Serializer for EventType model"""
    class Meta:
        model = EventType
        fields = ['id', 'name', 'description', 'icon', 'color', 'is_active', 'sort_order']
        read_only_fields = ['id', 'created_at']

class EventTypeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating EventType model"""
    class Meta:
        model = EventType
        fields = ['name', 'description', 'icon', 'color', 'is_active', 'sort_order']
    
    def validate_name(self, value):
        """Ensure event type name is unique"""
        if EventType.objects.filter(name=value).exists():
            raise serializers.ValidationError("An event type with this name already exists.")
        return value

class PackageSerializer(serializers.ModelSerializer):
    """Serializer for Package model"""
    class Meta:
        model = Package
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class PackageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Package model"""
    class Meta:
        model = Package
        fields = ['name', 'description', 'price', 'max_guests', 'max_photos', 'max_videos', 'features', 'is_active']
    
    def validate_price(self, value):
        """Ensure price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value
    
    def validate_max_guests(self, value):
        """Ensure max_guests is positive"""
        if value <= 0:
            raise serializers.ValidationError("Maximum guests must be greater than zero.")
        return value
    
    def validate_max_photos(self, value):
        """Ensure max_photos is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Maximum photos cannot be negative.")
        return value
    
    def validate_max_videos(self, value):
        """Ensure max_videos is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Maximum videos cannot be negative.")
        return value

class EventSettingsSerializer(serializers.ModelSerializer):
    """Serializer for EventSettings model"""
    class Meta:
        model = EventSettings
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class MediaFileSerializer(serializers.ModelSerializer):
    """Serializer for MediaFile model"""
    class Meta:
        model = MediaFile
        fields = [
            'id', 'media_type', 'media_file', 'media_thumbnail',
            'file_size', 'file_name', 'mime_type', 'is_approved', 'created_at'
        ]
        read_only_fields = ['id', 'file_size', 'file_name', 'mime_type', 'created_at']

class MediaFileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating MediaFile"""
    class Meta:
        model = MediaFile
        fields = ['media_type', 'media_file']
    
    def validate(self, data):
        """Validate media file"""
        if not data.get('media_file'):
            raise serializers.ValidationError("Media file is required")
        return data

class GuestSerializer(serializers.ModelSerializer):
    """Serializer for Guest model"""
    total_posts = serializers.ReadOnlyField()
    total_media_files = serializers.ReadOnlyField()
    
    class Meta:
        model = Guest
        fields = [
            'id', 'event', 'name', 'phone', 'total_posts', 'total_media_files',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'ip_address', 'user_agent', 'created_at']

class GuestPostSerializer(serializers.ModelSerializer):
    """Serializer for GuestPost model"""
    guest = GuestSerializer(read_only=True)
    media_files = MediaFileSerializer(many=True, read_only=True)
    total_media_files = serializers.ReadOnlyField()
    photo_count = serializers.ReadOnlyField()
    video_count = serializers.ReadOnlyField()
    
    class Meta:
        model = GuestPost
        fields = [
            'id', 'guest', 'event', 'wish_text', 'media_files',
            'total_media_files', 'photo_count', 'video_count', 'is_approved',
            'created_at', 'approved_at'
        ]
        read_only_fields = ['id', 'is_approved', 'created_at', 'approved_at']

class GuestPostCreateSerializer(serializers.Serializer):
    """
    Custom serializer for creating GuestPost with guest creation logic.
    
    This serializer handles basic data validation and defines file upload fields.
    Media files (photos and videos) are processed in the view for better file handling.
    """
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.filter(status='active', payment_status='paid'),
        help_text="Event ID where the post will be created"
    )
    guest_name = serializers.CharField(
        max_length=100, 
        help_text="Guest's full name"
    )
    guest_phone = serializers.CharField(
        max_length=20, 
        help_text="Guest's phone number"
    )
    wish_text = serializers.CharField(
        help_text="Share your wish, message, or thoughts for the event"
    )
    
    # Note: Media files (photos and videos) are handled directly in the view
    # To upload multiple files, use form-data with multiple 'photos' and 'videos' keys
    
    # Explicitly declare this is not a model serializer
    class Meta:
        # This is a custom serializer, not tied to any specific model
        pass
    
    def validate(self, data):
        """Validate the input data"""
        event = data['event']
        guest_phone = data['guest_phone']
        
        # Check if event allows wishes
        if not event.allow_wishes:
            raise serializers.ValidationError("This event does not allow wishes.")
        
        # Check if event allows photos/videos
        if not event.allow_photos and not event.allow_videos:
            raise serializers.ValidationError("This event does not allow media uploads.")
        
        # Check limits from event settings
        try:
            settings = event.settings
            max_posts = settings.max_posts_per_guest
            
            # Check posts per guest limit
            existing_guest = Guest.objects.filter(event=event, phone=guest_phone).first()
            if existing_guest:
                current_posts = existing_guest.posts.count()
                if current_posts >= max_posts:
                    raise serializers.ValidationError(f"Maximum posts per guest ({max_posts}) reached for this phone number.")
                
        except EventSettings.DoesNotExist:
            # Use default limits if no settings exist
            pass
        
        return data
    
    def create(self, validated_data):
        """Create the guest post with associated guest"""
        guest_name = validated_data.pop('guest_name')
        guest_phone = validated_data.pop('guest_phone')
        event = validated_data['event']
        
        # Get or create guest
        guest, created = Guest.objects.get_or_create(
            event=event,
            phone=guest_phone,
            defaults={
                'name': guest_name,
                'ip_address': self.context['request'].META.get('REMOTE_ADDR'),
                'user_agent': self.context['request'].META.get('HTTP_USER_AGENT', '')
            }
        )
        
        # Update guest name if it changed
        if not created and guest.name != guest_name:
            guest.name = guest_name
            guest.save()
        
        # Create the post
        post = GuestPost.objects.create(
            guest=guest,
            event=event,
            wish_text=validated_data['wish_text']
        )
        
        return post

class GuestPostListSerializer(serializers.ModelSerializer):
    """Serializer for listing guest posts"""
    event_title = serializers.CharField(source='event.title', read_only=True)
    guest_name = serializers.CharField(source='guest.name', read_only=True)
    media_files = MediaFileSerializer(many=True, read_only=True)
    total_media_files = serializers.ReadOnlyField()
    
    class Meta:
        model = GuestPost
        fields = [
            'id', 'event_title', 'guest_name', 'wish_text', 'media_files', 
            'total_media_files', 'created_at'
        ]
        read_only_fields = ['id', 'event_title', 'guest_name', 'total_media_files', 'created_at']

class EventSerializer(serializers.ModelSerializer):
    """Serializer for Event model"""
    host = UserSerializer(read_only=True)
    package = PackageSerializer(read_only=True)
    package_id = serializers.PrimaryKeyRelatedField(
        queryset=Package.objects.filter(is_active=True),
        write_only=True,
        source='package'
    )
    event_type = EventTypeSerializer(read_only=True)
    event_type_id = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.filter(is_active=True),
        write_only=True,
        source='event_type'
    )
    settings = EventSettingsSerializer(read_only=True)
    total_guest_posts = serializers.ReadOnlyField()
    total_media_files = serializers.ReadOnlyField()
    photo_count = serializers.ReadOnlyField()
    video_count = serializers.ReadOnlyField()
    is_live = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'host', 'package', 'package_id',
            'event_type', 'event_type_id', 'event_date', 'location', 'event_thumbnail', 'event_video',
            'allow_photos', 'allow_videos', 'allow_wishes', 'auto_approve_posts', 'status', 'payment_status',
            'qr_code', 'share_link', 'created_at', 'updated_at', 'published_at',
            'settings', 'total_guest_posts', 'total_media_files', 'photo_count', 'video_count', 'is_live',
            'is_public', 'contributor_code'
        ]
        read_only_fields = ['id', 'host', 'status', 'payment_status', 'qr_code', 
                           'share_link', 'created_at', 'updated_at', 'published_at',
                           'settings', 'total_guest_posts', 'total_media_files', 'photo_count', 'video_count', 'is_live',
                           'contributor_code']

class EventCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating events"""
    package_id = serializers.PrimaryKeyRelatedField(
        queryset=Package.objects.filter(is_active=True),
        source='package',
        help_text="Package ID for the event"
    )
    event_type_id = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.filter(is_active=True),
        source='event_type',
        help_text="Event type ID"
    )
    event_thumbnail = serializers.ImageField(
        required=False,
        help_text="Event preview image (optional)"
    )
    event_video = serializers.FileField(
        required=False,
        help_text="Event video (optional, mp4, mov, avi, webm)"
    )
    
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'package_id', 'event_type_id', 'event_date', 'location',
            'event_thumbnail', 'event_video', 'allow_photos', 'allow_videos', 'allow_wishes', 'auto_approve_posts',
            'is_public'
        ]
    
    def validate_title(self, value):
        """Ensure title is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Event title cannot be empty.")
        return value.strip()
    
    def validate_description(self, value):
        """Ensure description is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Event description cannot be empty.")
        return value.strip()
    
    def validate_event_date(self, value):
        """Ensure event date is in the future"""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Event date must be in the future.")
        return value
    
    def validate_event_video(self, value):
        """Validate event video file"""
        if value:
            # Check file size (max 100MB)
            if value.size > 100 * 1024 * 1024:
                raise serializers.ValidationError("Event video must be smaller than 100MB.")
            
            # Check file type
            allowed_types = ['video/mp4', 'video/mov', 'video/avi', 'video/webm']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError("Event video must be MP4, MOV, AVI, or WebM format.")
        
        return value

class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model"""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        write_only=True,
        source='event'
    )
    
    class Meta:
        model = Payment
        fields = [
            'id', 'event', 'event_id', 'amount', 'payment_method',
            'transaction_id', 'status', 'paid_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'paid_at', 'created_at']

class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Payment model with automatic amount from package"""
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(),
        write_only=True,
        source='event'
    )
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'event', 'event_id', 'amount', 'payment_method',
            'transaction_id'
        ]
        read_only_fields = ['amount']
    
    def validate_event_id(self, value):
        """Validate that the event exists and has a package"""
        if not hasattr(value, 'package'):
            raise serializers.ValidationError("Event must have a package selected.")
        return value
    
    def validate(self, data):
        """Set the amount automatically from the package"""
        event = data.get('event')
        if event and hasattr(event, 'package') and event.package:
            data['amount'] = event.package.price
        else:
            raise serializers.ValidationError("Event must have a valid package to determine payment amount.")
        return data

class EventGallerySerializer(serializers.ModelSerializer):
    """Serializer for event gallery view"""
    guest_posts = GuestPostListSerializer(many=True, read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    total_media_files = serializers.ReadOnlyField()
    qr_code = serializers.SerializerMethodField()
    share_link = serializers.SerializerMethodField()
    like_count = serializers.ReadOnlyField()
    is_liked_by_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_date', 'location', 'event_type',
            'event_thumbnail', 'package_name', 'guest_posts', 'total_guest_posts', 
            'total_media_files', 'is_live', 'qr_code', 'share_link', 'like_count', 'is_liked_by_user',
            'is_public'
        ]
        read_only_fields = ['id', 'total_guest_posts', 'total_media_files', 'is_live', 'like_count']
    
    def get_qr_code(self, obj):
        """Get QR code URL if it exists"""
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None
    
    def get_share_link(self, obj):
        """Get share link if it exists"""
        return obj.share_link
    
    def get_is_liked_by_user(self, obj):
        """Check if the current user has liked this event"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_liked_by(request.user)
        return False

class EventSummarySerializer(serializers.ModelSerializer):
    """Serializer for event summary/dashboard"""
    package_name = serializers.CharField(source='package.name', read_only=True)
    package_price = serializers.DecimalField(source='package.price', max_digits=10, decimal_places=2, read_only=True)
    photo_count = serializers.SerializerMethodField()
    video_count = serializers.SerializerMethodField()
    total_media_files = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'event_type', 'event_date', 'status', 'payment_status',
            'event_thumbnail', 'package_name', 'package_price', 'photo_count', 'video_count',
            'total_guest_posts', 'total_media_files', 'is_live', 'created_at'
        ]
        read_only_fields = ['id', 'total_guest_posts', 'total_media_files', 'is_live', 'created_at']
    
    def get_photo_count(self, obj):
        return obj.media_files.filter(media_type='photo').count()
    
    def get_video_count(self, obj):
        return obj.media_files.filter(media_type='video').count() 

class EventGuestAccessSerializer(serializers.ModelSerializer):
    """Serializer for guest access to events"""
    event_type = EventTypeSerializer(read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    package_max_photos = serializers.IntegerField(source='package.max_photos', read_only=True)
    package_max_videos = serializers.IntegerField(source='package.max_videos', read_only=True)
    guest_max_media_per_post = serializers.SerializerMethodField()
    total_guest_posts = serializers.ReadOnlyField()
    total_media_files = serializers.ReadOnlyField()
    is_accessible = serializers.SerializerMethodField()
    frontend_share_url = serializers.ReadOnlyField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_date', 'location', 'event_type',
            'event_thumbnail', 'package_name', 'package_max_photos', 'package_max_videos',
            'guest_max_media_per_post', 'total_guest_posts', 'total_media_files', 'is_public', 'is_accessible',
            'frontend_share_url'
        ]
        read_only_fields = ['id', 'total_guest_posts', 'total_media_files', 'frontend_share_url']
    
    def get_guest_max_media_per_post(self, obj):
        """Get the maximum media files per guest post from EventSettings"""
        try:
            return obj.settings.max_media_per_post
        except EventSettings.DoesNotExist:
            return 3  # Default value
    
    def get_is_accessible(self, obj):
        """Check if the event is accessible to the current request"""
        request = self.context.get('request')
        if request:
            contributor_code = request.query_params.get('code')
            return obj.can_be_accessed_by_guest(contributor_code)
        return False