from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.http import Http404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from core.models import EventType, Package, Event, Payment, Guest, GuestPost, MediaFile, EventSettings, PaymentMethod
from .serializers import (
    EventTypeSerializer, EventTypeCreateSerializer, PackageSerializer, PackageCreateSerializer, EventSerializer, EventCreateSerializer, EventGallerySerializer,
    EventSummarySerializer, EventGuestAccessSerializer, PaymentSerializer, PaymentCreateSerializer, GuestSerializer, GuestPostSerializer, GuestPostCreateSerializer,
    GuestPostListSerializer, MediaFileSerializer, MediaFileCreateSerializer, PaymentMethodSerializer
)
from rest_framework import serializers
import math

def format_file_size(bytes_size):
    """Convert bytes to human readable format"""
    if bytes_size == 0:
        return "0 Bytes"
    size_names = ["Bytes", "KB", "MB", "GB"]
    i = int(math.floor(math.log(bytes_size, 1024)))
    p = math.pow(1024, i)
    s = round(bytes_size / p, 2)
    return f"{s} {size_names[i]}"

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that includes user information in the response.
    """
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Get the user from the request data
            username = request.data.get('username')
            password = request.data.get('password')
            
            if username and password:
                user = authenticate(username=username, password=password)
                if user:
                    # Add user information to the response
                    response.data.update({
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'is_superuser': user.is_superuser,
                            'is_staff': user.is_staff
                        }
                    })
        return response

class EventTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event types.
    
    Provides full CRUD access to event types for administrators.
    Event types are predefined categories that help organize and categorize events.
    """
    queryset = EventType.objects.filter(is_active=True)
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = []  # Disable throttling for this viewset

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve', 'featured']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return EventTypeCreateSerializer
        return EventTypeSerializer
    
    def get_queryset(self):
        """Filter event types based on user permissions"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return EventType.objects.none()
        
        user = self.request.user
        if user.is_staff:
            return EventType.objects.all()
        return EventType.objects.filter(is_active=True)
    
    def list(self, request, *args, **kwargs):
        """List event types - allow anyone to view active ones"""
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve event type - allow anyone to view active ones"""
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured event types - allow anyone to view"""
        featured_types = self.queryset.filter(is_active=True).order_by('sort_order')[:6]
        serializer = self.get_serializer(featured_types, many=True)
        return Response(serializer.data)

class PackageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event packages.
    
    Provides full CRUD access to event packages for administrators.
    Packages define pricing, limits, and features for different types of events.
    """
    queryset = Package.objects.filter(is_active=True)
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = []  # Disable throttling for this viewset
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve', 'featured']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return PackageCreateSerializer
        return PackageSerializer
    
    def get_queryset(self):
        """Filter packages based on user permissions"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return Package.objects.none()
        
        user = self.request.user
        if user.is_staff:
            return Package.objects.all()
        return Package.objects.filter(is_active=True)
    
    def list(self, request, *args, **kwargs):
        """List packages - allow anyone to view active ones"""
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve package - allow anyone to view active ones"""
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured packages - allow anyone to view"""
        featured_packages = self.queryset.filter(is_active=True)[:3]
        serializer = self.get_serializer(featured_packages, many=True)
        return Response(serializer.data)

class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing events.
    
    Allows event hosts to create, manage, and publish events.
    Events can be in different states: draft, pending payment, active, completed, or cancelled.
    """
    queryset = Event.objects.all().order_by('-created_at')
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter events based on user and status"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return Event.objects.none()
        
        user = self.request.user
        if user.is_superuser:
            return Event.objects.all()
        return Event.objects.filter(host=user)
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return EventCreateSerializer
        elif self.action == 'gallery':
            return EventGallerySerializer
        elif self.action == 'summary':
            return EventSummarySerializer
        return EventSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new event with proper error handling"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating event: {e}")
            raise
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Set the host when creating an event"""
        try:
            event = serializer.save(host=self.request.user)
            print(f"Event created successfully: {event.id}")
            
            # Create event settings with user-provided values or sensible defaults
            try:
                # Get user-provided settings from the request data
                request_data = self.request.data
                
                settings_data = {
                    'event': event,
                    'max_posts_per_guest': request_data.get('max_posts_per_guest', 5),
                    'max_image_per_post': request_data.get('max_image_per_post', 3),
                    'max_video_per_post': request_data.get('max_video_per_post', 2),
                    'max_voice_per_post': request_data.get('max_voice_per_post', 1)
                }
                
                settings = EventSettings.objects.create(**settings_data)
                print(f"EventSettings created for event {event.id}: {settings_data}")
                
            except Exception as e:
                # Log error but don't fail event creation
                print(f"Error creating EventSettings for event {event.id}: {e}")
                pass
            
            # Automatically create Payment object when event is created
            try:
                # Check if payment already exists (shouldn't happen, but safety check)
                if not Payment.objects.filter(event=event).exists():
                    # Get payment method from request if provided, otherwise use first active method
                    payment_method = None
                    payment_method_id = request_data.get('payment_method_id')
                    if payment_method_id:
                        try:
                            payment_method = PaymentMethod.objects.get(id=payment_method_id, is_active=True)
                        except PaymentMethod.DoesNotExist:
                            pass
                    
                    # If no payment method specified, get the first active one
                    if not payment_method:
                        payment_method = PaymentMethod.objects.filter(is_active=True).first()
                    
                    # Create payment with amount from package
                    if payment_method and event.package:
                        payment = Payment.objects.create(
                            event=event,
                            amount=event.package.price,
                            payment_method=payment_method,
                            status='pending'
                        )
                        print(f"Payment created for event {event.id}: {payment.id} - Amount: {payment.amount} ETB")
                    else:
                        print(f"Warning: Could not create payment for event {event.id} - payment_method or package missing")
                        
            except Exception as e:
                # Log error but don't fail event creation
                print(f"Error creating Payment for event {event.id}: {e}")
                pass
                
        except Exception as e:
            print(f"Error in perform_create: {e}")
            raise
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an event after payment"""
        event = self.get_object()
        
        if event.payment_status != 'paid':
            return Response(
                {'error': 'Event must be paid before activation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'active'
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)
    
    
    @action(detail=True, methods=['get'])
    def gallery(self, request, pk=None):
        """Get event gallery for public viewing"""
        event = get_object_or_404(Event, pk=pk)
        
        if not event.is_live:
            raise Http404("Event not found or not live")
        
        serializer = EventGallerySerializer(event)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get event summary for dashboard"""
        event = self.get_object()
        serializer = EventSummarySerializer(event)
        return Response(serializer.data)
    
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish an event"""
        event = self.get_object()
        
        if event.status != 'draft':
            return Response(
                {'error': 'Only draft events can be published'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'pending_payment'
        event.save()
        
        serializer = self.get_serializer(event)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def guest_access(self, request):
        """Get event for guest access using contributor code only"""
        contributor_code = request.query_params.get('code')
        
        if not contributor_code:
            return Response(
                {'error': 'Contributor code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find event by contributor code
            event = Event.objects.get(contributor_code=contributor_code)
        except Event.DoesNotExist:
            return Response(
                {'error': 'Invalid contributor code. Event not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if event is live
        if not event.is_live:
            return Response(
                {'error': 'Event is not live'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # For private events, validate the code
        # For public events, any valid code will work
        if not event.can_be_accessed_by_guest(contributor_code):
            return Response(
                {'error': 'Access denied. Invalid contributor code or event is private.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = EventGuestAccessSerializer(event, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def public_events(self, request):
        """List all public events that guests can access without a code"""
        # Only show live public events
        public_events = Event.objects.filter(
            is_public=True,
            status='active',
            payment_status='paid'
        ).order_by('-published_at')
        
        serializer = EventGuestAccessSerializer(public_events, many=True, context={'request': request})
        return Response(serializer.data)

class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payments"""
    queryset = Payment.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer
    
    def get_queryset(self):
        """Filter payments based on user - only superusers can see all payments"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return Payment.objects.none()
        
        user = self.request.user
        # Only superusers can see all payments
        if user.is_superuser:
            return Payment.objects.all()
        # Regular users can only see their own event payments
        return Payment.objects.filter(event__host=user)
    
    def perform_create(self, serializer):
        """Create payment and update event status"""
        event = serializer.validated_data['event']
        
        # Check if payment already exists for this event
        existing_payment = Payment.objects.filter(event=event).first()
        
        if existing_payment:
            # Update existing payment instead of creating new one
            existing_payment.amount = serializer.validated_data.get('amount', existing_payment.amount)
            existing_payment.payment_method = serializer.validated_data.get('payment_method', existing_payment.payment_method)
            existing_payment.transaction_id = serializer.validated_data.get('transaction_id', existing_payment.transaction_id)
            existing_payment.save()
            
            # Update event payment status
            event.payment_status = 'pending'
            event.save()
            
            # Set the instance to the existing payment for the response
            serializer.instance = existing_payment
        else:
            # Create new payment
            payment = serializer.save()
            
            # Update event payment status
            event.payment_status = 'pending'
            event.save()
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm payment (simulate payment confirmation) - Only superusers can confirm"""
        payment = self.get_object()
        
        # Only superusers can confirm payments
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can confirm payments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payment.status = 'completed'
        payment.paid_at = timezone.now()
        payment.save()
        
        # Update event payment status
        event = payment.event
        event.payment_status = 'paid'
        event.status = 'active'
        event.save()
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

class GuestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing guests.
    
    Provides read-only access to guest information for event hosts.
    Guests are people who have contributed to events.
    """
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    def get_queryset(self):
        """Filter guests based on user"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return Guest.objects.none()
        
        user = self.request.user
        if user.is_staff:
            return Guest.objects.all()
        return Guest.objects.filter(event__host=user)

class GuestPostCreateViewSet(viewsets.GenericViewSet):
    """
    Dedicated ViewSet for creating guest posts.
    
    This ViewSet handles the complex logic of creating guests and posts
    without the model validation conflicts of ModelViewSet.
    """
    serializer_class = GuestPostCreateSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Create the post first
            post = serializer.save()
            
            # Handle media files after post creation
            # Get files directly from request.FILES for multiple file uploads
            photos = request.FILES.getlist('photos')
            videos = request.FILES.getlist('videos')
            voice_recordings = request.FILES.getlist('voice_recordings')
            
            if photos or videos or voice_recordings:
                event = post.event
                guest = post.guest
                
                # Check media limits from EventSettings (per-guest limits)
                try:
                    settings = event.settings
                    max_image_per_post = settings.max_image_per_post
                    max_video_per_post = settings.max_video_per_post
                    max_voice_per_post = settings.max_voice_per_post
                except EventSettings.DoesNotExist:
                    # Use default limits if no settings exist
                    max_image_per_post = 3
                    max_video_per_post = 2
                    max_voice_per_post = 1
                
                # Check individual media type limits
                if len(photos) > max_image_per_post:
                    post.delete()
                    raise serializers.ValidationError(f"Maximum images per post ({max_image_per_post}) exceeded. You uploaded {len(photos)} images.")
                
                if len(videos) > max_video_per_post:
                    post.delete()
                    raise serializers.ValidationError(f"Maximum videos per post ({max_video_per_post}) exceeded. You uploaded {len(videos)} videos.")
                
                if len(voice_recordings) > max_voice_per_post:
                    post.delete()
                    raise serializers.ValidationError(f"Maximum voice recordings per post ({max_voice_per_post}) exceeded. You uploaded {len(voice_recordings)} voice recordings.")
                
                # Check file size limits from EventSettings
                try:
                    event_settings = event.settings
                    max_image_size_mb = getattr(event_settings, 'max_photo_size', None)
                    max_video_size_mb = getattr(event_settings, 'max_video_size', None)
                    max_voice_size_mb = getattr(event_settings, 'max_voice_size', None)
                    
                    # Convert MB to bytes for validation
                    max_image_size_bytes = max_image_size_mb * 1024 * 1024 if max_image_size_mb else None
                    max_video_size_bytes = max_video_size_mb * 1024 * 1024 if max_video_size_mb else None
                    max_voice_size_bytes = max_voice_size_mb * 1024 * 1024 if max_voice_size_mb else None
                    
                    # Validate photo sizes
                    for photo in photos:
                        if max_image_size_bytes and photo.size > max_image_size_bytes:
                            print(f"Photo '{photo.name}' is too large ({format_file_size(photo.size)}). "
                                f"Maximum allowed size is {max_image_size_mb}MB.")
                            raise serializers.ValidationError(
                                f"Photo '{photo.name}' is too large ({format_file_size(photo.size)}). "
                                f"Maximum allowed size is {max_image_size_mb}MB."
                            )
                    
                    # Validate video sizes
                    for video in videos:
                        print(f"Video '{video.name}' size: {format_file_size(video.size)}")
                        print(f"Max video size: {max_video_size_bytes}")
                        if max_video_size_bytes and video.size > max_video_size_bytes:
                            print(f"Video '{video.name}' is too large ({format_file_size(video.size)}). "
                                f"Maximum allowed size is {max_video_size_mb}MB.")
                            raise serializers.ValidationError(
                                f"Video '{video.name}' is too large ({format_file_size(video.size)}). "
                                f"Maximum allowed size is {max_video_size_mb}MB."
                            )
                    
                    # Validate voice recording sizes
                    for voice_recording in voice_recordings:
                        if max_voice_size_bytes and voice_recording.size > max_voice_size_bytes:
                            raise serializers.ValidationError(
                                f"Voice recording '{voice_recording.name}' is too large ({format_file_size(voice_recording.size)}). "
                                f"Maximum allowed size is {max_voice_size_mb}MB."
                            )
                            
                except serializers.ValidationError:
                    # Re-raise ValidationError to prevent saving the post
                    raise
                except Exception as e:
                    # If there's an error with EventSettings, log it but don't block the upload
                    print(f"Warning: Could not validate file sizes: {str(e)}")
                
                # Check package limits for media files
                package = event.package
                current_photo_count = MediaFile.objects.filter(event=event, media_type='photo').count()
                current_video_count = MediaFile.objects.filter(event=event, media_type='video').count()
                current_voice_count = MediaFile.objects.filter(event=event, media_type='voice').count()
                
                # Calculate how many photos/videos/voice can be approved based on package limits
                max_photos_allowed = package.max_photos if package.max_photos is not None else float('inf')
                max_videos_allowed = package.max_videos if package.max_videos is not None else float('inf')
                max_voice_allowed = package.max_voice if package.max_voice is not None else float('inf')
                
                photos_remaining = max(0, max_photos_allowed - current_photo_count)
                videos_remaining = max(0, max_videos_allowed - current_video_count)
                voice_remaining = max(0, max_voice_allowed - current_voice_count)
                
                # Create media files for photos
                for i, photo in enumerate(photos):
                    try:
                        # Check if this photo exceeds package limit AND post is approved
                        is_photo_approved = post.is_approved and i < photos_remaining
                        
                        MediaFile.objects.create(
                            post=post,
                            guest=guest,
                            event=event,
                            media_type='photo',
                            media_file=photo,
                            file_size=photo.size,
                            file_name=photo.name,
                            mime_type=photo.content_type or 'image/jpeg',
                            is_approved=is_photo_approved  # Set approval based on both post and package limit
                        )
                    except Exception as e:
                        # If there's an error creating a media file, delete the post and raise error
                        post.delete()
                        raise serializers.ValidationError(f"Error processing photo {photo.name}: {str(e)}")
                
                # Create media files for videos
                for i, video in enumerate(videos):
                    try:
                        # Check if this video exceeds package limit AND post is approved
                        is_video_approved = post.is_approved and i < videos_remaining
                        
                        MediaFile.objects.create(
                            post=post,
                            guest=guest,
                            event=event,
                            media_type='video',
                            media_file=video,
                            file_size=video.size,
                            file_name=video.name,
                            mime_type=video.content_type or 'video/mp4',
                            is_approved=is_video_approved  # Set approval based on both post and package limit
                        )
                    except Exception as e:
                        # If there's an error creating a media file, delete the post and raise error
                        post.delete()
                        raise serializers.ValidationError(f"Error processing video {video.name}: {str(e)}")
                
                # Create media files for voice recordings
                for i, voice_recording in enumerate(voice_recordings):
                    try:
                        # Check if this voice recording exceeds package limit AND post is approved
                        is_voice_approved = post.is_approved and i < voice_remaining
                        
                        MediaFile.objects.create(
                            post=post,
                            guest=guest,
                            event=event,
                            media_type='voice',
                            media_file=voice_recording,
                            file_size=voice_recording.size,
                            file_name=voice_recording.name,
                            mime_type=voice_recording.content_type or 'audio/mp3',
                            is_approved=is_voice_approved  # Set approval based on both post and package limit
                        )
                    except Exception as e:
                        # If there's an error creating a media file, delete the post and raise error
                        post.delete()
                        raise serializers.ValidationError(f"Error processing voice recording {voice_recording.name}: {str(e)}")
            
            # Return the created post using the standard serializer
            result_serializer = GuestPostSerializer(post)
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            raise

class GuestPostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing guest posts (no authentication required for creation)"""
    queryset = GuestPost.objects.all()
    serializer_class = GuestPostSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_permissions(self):
        """Allow anyone to create, list, and retrieve approved posts from live events"""
        if self.action in ['create', 'list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter posts based on user and event"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return GuestPost.objects.none()
        
        user = self.request.user
        
        if user.is_authenticated:
            if user.is_superuser:
                return GuestPost.objects.all()
            return GuestPost.objects.filter(event__host=user)
        
        # For unauthenticated users:
        # - For retrieve (viewing single post by ID): Allow any approved post (for social media sharing)
        # - For list: Only show approved posts from live events
        if self.action == 'retrieve':
            # Allow viewing any approved post when accessed directly (shared links)
            return GuestPost.objects.filter(is_approved=True)
        else:
            # For listing, only show approved posts from live events
            return GuestPost.objects.filter(
                event__status='active',
                event__payment_status='paid',
                is_approved=True
            )
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return GuestPostCreateSerializer
        return GuestPostSerializer
    
    def get_serializer(self, *args, **kwargs):
        """Override to handle custom serializer properly"""
        serializer_class = self.get_serializer_class()
        if serializer_class == GuestPostCreateSerializer:
            # For custom serializer, don't pass model instance
            return serializer_class(*args, **kwargs)
        return super().get_serializer(*args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """Override create to handle custom serializer"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        """Perform the actual creation"""
        if isinstance(serializer, GuestPostCreateSerializer):
            # Custom serializer handles its own creation
            serializer.save()
        else:
            # Default model serializer
            serializer.save()
    
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def by_event(self, request):
        """Get posts by event ID"""
        event_id = request.query_params.get('event_id')
        if not event_id:
            return Response(
                {'error': 'event_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            event = Event.objects.get(pk=event_id)
            if not event.is_live:
                raise Http404("Event not found or not live")
            
            # For superusers, show all posts (approved and pending)
            # For all other users (authenticated or not), show only approved posts
            if request.user.is_authenticated and request.user.is_superuser:
                posts = GuestPost.objects.filter(
                    event=event
                ).order_by('-created_at')
            else:
                posts = GuestPost.objects.filter(
                    event=event,
                    event__host=request.user,
                    is_approved=True
                ).order_by('-created_at')
            
            serializer = GuestPostSerializer(posts, many=True)
            return Response(serializer.data)
            
        except Event.DoesNotExist:
            raise Http404("Event not found")
    
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a post (host only)"""
        post = self.get_object()
        
        if not request.user.is_authenticated or post.event.host != request.user:
            return Response(
                {'error': 'Only event host can approve posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        post.is_approved = True
        post.save()
        
        # Also approve all media files
        post.media_files.update(is_approved=True)
        
        serializer = self.get_serializer(post)
        return Response(serializer.data)
    
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a post (host only)"""
        post = self.get_object()
        
        if not request.user.is_authenticated or post.event.host != request.user:
            return Response(
                {'error': 'Only event host can reject posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        post.is_approved = False
        post.save()
        
        # Also reject all media files
        post.media_files.update(is_approved=False)
        
        serializer = self.get_serializer(post)
        return Response(serializer.data)

class MediaFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual media files.
    
    Allows event hosts to view, approve, and reject media files
    uploaded by guests to their events.
    """
    queryset = MediaFile.objects.all()
    serializer_class = MediaFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    def get_queryset(self):
        """Filter media files based on user"""
        # Check if this is a Swagger schema generation request
        if getattr(self, 'swagger_fake_view', False):
            return MediaFile.objects.none()
        
        user = self.request.user
        if user.is_staff:
            return MediaFile.objects.all()
        return MediaFile.objects.filter(event__host=user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a media file (host only)"""
        media_file = self.get_object()
        
        if not request.user.is_authenticated or media_file.event.host != request.user:
            return Response(
                {'error': 'Only event host can approve media files'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        media_file.is_approved = True
        media_file.save()
        
        serializer = self.get_serializer(media_file)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a media file (host only)"""
        media_file = self.get_object()
        
        if not request.user.is_authenticated or media_file.event.host != request.user:
            return Response(
                {'error': 'Only event host can reject media files'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        media_file.is_approved = False
        media_file.save()
        
        serializer = self.get_serializer(media_file)
        return Response(serializer.data)

class PublicEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for viewing live events without authentication.
    
    Provides public access to event galleries, posts, and media files
    for events that are active and paid.
    """
    queryset = Event.objects.filter(status='active', payment_status='paid')
    serializer_class = EventGallerySerializer
    permission_classes = [permissions.AllowAny]
    
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return response
    
    def get_queryset(self):
        """Only show live events"""
        return Event.objects.filter(
            status='active',
            payment_status='paid'
        ).prefetch_related('guest_posts', 'guest_posts__media_files')
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """Get all posts for a specific event"""
        print(f"Posts API called for event ID: {pk}")
        
        event = get_object_or_404(Event, pk=pk)
        print(f"Event found: {event.title}, Status: {event.status}, Payment: {event.payment_status}")
        
        if not event.is_live:
            print(f"Event not live: status={event.status}, payment_status={event.payment_status}")
            raise Http404("Event not found or not live")
        
        posts = GuestPost.objects.filter(
            event=event,
            is_approved=True
        ).order_by('-created_at')
        
        print(f"Found {posts.count()} approved posts for event {pk}")
        
        serializer = GuestPostListSerializer(posts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def media(self, request, pk=None):
        """Get all media files for a specific event"""
        event = get_object_or_404(Event, pk=pk)
        
        if not event.is_live:
            raise Http404("Event not found or not live")
        
        media_files = MediaFile.objects.filter(
            event=event,
            is_approved=True
        ).order_by('-created_at')
        
        serializer = MediaFileSerializer(media_files, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Like or unlike an event"""
        event = get_object_or_404(Event, pk=pk)
        
        if not event.is_live:
            raise Http404("Event not found or not live")
        
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required to like events'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Toggle like status
        is_liked = event.toggle_like(request.user)
        
        return Response({
            'is_liked': is_liked,
            'like_count': event.like_count,
            'message': 'Event liked!' if is_liked else 'Event unliked!'
        })

@api_view(['GET'])
@permission_classes([AllowAny])
def public_media_item(request, post_id, media_id):
    """
    Public endpoint to retrieve a specific approved media item from an approved post.
    This endpoint validates that:
    - The post is approved
    - The media item is approved
    - The media belongs to the post
    This prevents users from accessing unapproved media by changing the URL.
    """
    try:
        # Get the post and verify it's approved
        try:
            post = GuestPost.objects.get(id=post_id, is_approved=True)
        except GuestPost.DoesNotExist:
            return Response(
                {'error': 'Post not found or not approved', 'post_id': str(post_id)},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the media file and verify it belongs to the post and is approved
        try:
            media_file = MediaFile.objects.get(
                id=media_id,
                post=post,
                is_approved=True
            )
        except MediaFile.DoesNotExist:
            # Check if media exists but is not approved or doesn't belong to post
            media_exists = MediaFile.objects.filter(id=media_id).exists()
            if media_exists:
                return Response(
                    {'error': 'Media item exists but is not approved or does not belong to this post', 
                     'media_id': str(media_id), 'post_id': str(post_id)},
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                return Response(
                    {'error': 'Media item not found', 'media_id': str(media_id)},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Serialize the media file with post context
        serializer = MediaFileSerializer(media_file, context={'request': request})
        
        # Include minimal post info for context
        response_data = serializer.data
        response_data['post'] = {
            'id': str(post.id),
            'guest': {
                'name': post.guest.name if post.guest else 'Anonymous'
            },
            'wish_text': post.wish_text,
            'created_at': post.created_at,
            'event': {
                'id': str(post.event.id),
                'title': post.event.title,
                'description': post.event.description,
                'event_date': post.event.event_date,
                'location': post.event.location,
            } if post.event else None
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        return Response(
            {'error': f'Error retrieving media: {str(e)}', 'trace': error_trace},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for listing active payment methods"""
    queryset = PaymentMethod.objects.filter(is_active=True).order_by('sort_order', 'name')
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get_queryset(self):
        # Allow admin to see all
        if getattr(self, 'swagger_fake_view', False):
            return PaymentMethod.objects.none()
        user = self.request.user
        if user.is_staff:
            return PaymentMethod.objects.all().order_by('sort_order', 'name')
        return PaymentMethod.objects.filter(is_active=True).order_by('sort_order', 'name')


# Authentication API Views
@api_view(['GET'])
@permission_classes([AllowAny])
def api_debug_auth(request):
    """Debug endpoint to check authentication status - JWT version"""
    
    # Check for JWT token in Authorization header
    auth_header = request.headers.get('Authorization', '')
    has_jwt_token = auth_header.startswith('Bearer ')
    
    return Response({
        'authenticated': request.user.is_authenticated,
        'user': str(request.user) if request.user.is_authenticated else None,
        'has_jwt_token': has_jwt_token,
        'auth_header': auth_header[:20] + '...' if len(auth_header) > 20 else auth_header,
        'headers': dict(request.headers),
        'method': request.method,
        'path': request.path,
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    """API endpoint for user login - JWT version"""
   
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        
        return Response({
            'success': True,
            'access': str(access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff
            },
            'message': 'Login successful'
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    """API endpoint for user registration"""
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    password2 = request.data.get('password2')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    phone_number = request.data.get('phone_number', '').strip()
    
    # Validate phone number format: 09xxxxxxxx (10 digits starting with 09)
    if phone_number:
        if not phone_number.startswith('09') or len(phone_number) != 10 or not phone_number.isdigit():
            return Response(
                {'error': 'Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if not username or not email or not password or not password2:
        return Response(
            {'error': 'Username, email, and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if password != password2:
        return Response(
            {'error': 'Passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Store phone number in user profile if available, or in a custom field
        # For now, we'll store it in a UserProfile if it exists, otherwise skip
        # You can extend this later to create a UserProfile model
        if phone_number:
            # If you have a UserProfile model, uncomment this:
            # from core.models import UserProfile
            # UserProfile.objects.create(user=user, phone_number=phone_number)
            # For now, we'll just store it in a note or skip it
            pass
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            },
            'message': 'User created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error creating user: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def api_logout(request):
    """API endpoint for user logout - JWT version"""
    try:
        # For JWT, we can't really "logout" on the server side since tokens are stateless
        # The client should simply discard the tokens
        # However, we can implement token blacklisting if needed
        
        # Always return success for logout - let the client handle token removal
        # This allows logout to work even if the user is already logged out
        return Response({
            'success': True,
            'message': 'Logout successful. Please discard your tokens on the client side.'
        })
    except Exception as e:
        return Response(
            {'error': f'Logout error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def guest_event_access(request):
    """API endpoint for guests to access events using contributor code only"""
    contributor_code = request.query_params.get('code')
    
    if not contributor_code:
        return Response(
            {'error': 'Contributor code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find event by contributor code
        event = Event.objects.get(contributor_code=contributor_code)
    except Event.DoesNotExist:
        return Response(
            {'error': 'Invalid contributor code. Event not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if event is live
    if not event.is_live:
        return Response(
            {'error': 'Event is not live'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # For private events, validate the code
    # For public events, any valid code will work
    if not event.can_be_accessed_by_guest(contributor_code):
        return Response(
            {'error': 'Access denied. Invalid contributor code or event is private.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Serialize the event for guest access
    serializer = EventGuestAccessSerializer(event, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def guest_event_by_id(request, event_id):
    """API endpoint for guests to access events directly by event ID (for share links/QR codes)"""
    try:
        # Find event by ID
        event = Event.objects.get(pk=event_id)
    except Event.DoesNotExist:
        return Response(
            {'error': 'Event not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if event is live
    if not event.is_live:
        return Response(
            {'error': 'Event is not live or accessible'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # For public events, allow direct access
    # For private events, require contributor code validation
    if not event.is_public:
        return Response(
            {'error': 'This is a private event. Please use the contributor code to access.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Serialize the event for guest access
    serializer = EventGuestAccessSerializer(event, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_events(request):
    """API endpoint to list all public events that guests can access without a code"""
    # Only show live public events
    public_events = Event.objects.filter(
        is_public=True,
        status='active',
        payment_status='paid'
    ).order_by('-published_at')
    
    serializer = EventGuestAccessSerializer(public_events, many=True, context={'request': request})
    return Response(serializer.data)
