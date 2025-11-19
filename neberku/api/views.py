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
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings
from core.models import EventType, Package, Event, Payment, Guest, GuestPost, MediaFile, EventSettings, PaymentMethod, PhoneOTP
from core.utils import (
    send_telegram_message, 
    format_event_creation_message, 
    format_payment_confirmation_message,
    format_payment_pending_message
)
from .serializers import (
    EventTypeSerializer, EventTypeCreateSerializer, PackageSerializer, PackageCreateSerializer, EventSerializer, EventCreateSerializer, EventGallerySerializer,
    EventSummarySerializer, EventGuestAccessSerializer, PaymentSerializer, PaymentCreateSerializer, GuestSerializer, GuestPostSerializer, GuestPostCreateSerializer,
    GuestPostListSerializer, MediaFileSerializer, MediaFileCreateSerializer, PaymentMethodSerializer
)
from rest_framework import serializers
import math
import random
from datetime import timedelta
from .sms import send_afromessage_sms

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
            if serializer.validated_data['package'].is_try:
                serializer.validated_data['status'] = 'active'
                serializer.validated_data['payment_status'] = 'paid'
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
                            status='paid' if event.package.is_try else 'pending'
                        )
                        print(f"Payment created for event {event.id}: {payment.id} - Amount: {payment.amount} ETB")
                        
                        # Send Telegram notification for event creation (to all configured recipients)
                        try:
                            message = format_event_creation_message(event, self.request.user, payment)
                            # send_telegram_message will automatically handle multiple recipients if configured
                            send_telegram_message(message)
                        except Exception as e:
                            # Don't fail event creation if Telegram fails
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.error(f'Exception sending Telegram notification for event {event.id}: {e}')
                        
                        # Also send payment pending notification with action buttons (separate try block)
                        try:
                            pending_message, reply_markup = format_payment_pending_message(payment, event)
                            send_telegram_message(pending_message, reply_markup=reply_markup)
                        except Exception as e:
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.error(f'Failed to send payment pending notification: {e}')
                    else:
                        print(f"Warning: Could not create payment for event {event.id} - payment_method or package missing")
                        # Send Telegram notification even if payment wasn't created
                        try:
                            message = format_event_creation_message(event, self.request.user, None)
                            result = send_telegram_message(message)
                            if not result:
                                print(f"⚠️ Telegram notification failed for event {event.id} - check console for details")
                        except Exception as e:
                            print(f"❌ Exception sending Telegram notification for event {event.id}: {e}")
                            import traceback
                            traceback.print_exc()
                        
            except Exception as e:
                # Log error but don't fail event creation
                print(f"Error creating Payment for event {event.id}: {e}")
                # Try to send Telegram notification anyway
                try:
                    message = format_event_creation_message(event, self.request.user, None)
                    result = send_telegram_message(message)
                    if not result:
                        print(f"⚠️ Telegram notification failed for event {event.id} - check console for details")
                except Exception as telegram_error:
                    print(f"❌ Exception sending Telegram notification for event {event.id}: {telegram_error}")
                    import traceback
                    traceback.print_exc()
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
        
        # Send Telegram notification for payment confirmation (to all configured recipients)
        try:
            message = format_payment_confirmation_message(payment, event, request.user)
            # send_telegram_message will automatically handle multiple recipients if configured
            result = send_telegram_message(message)
            if isinstance(result, dict):
                # Multiple recipients
                if result.get('success_count', 0) > 0:
                    print(f"✅ Telegram notification sent to {result['success_count']} recipient(s) for payment {payment.id}")
                if result.get('failure_count', 0) > 0:
                    print(f"⚠️ Telegram notification failed for {result['failure_count']} recipient(s) for payment {payment.id}")
            elif not result:
                print(f"⚠️ Telegram notification failed for payment {payment.id} - check console for details")
        except Exception as e:
            # Don't fail payment confirmation if Telegram fails
            print(f"❌ Exception sending Telegram notification for payment {payment.id}: {e}")
            import traceback
            traceback.print_exc()
        
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
                
                # Get EventSettings
                try:
                    settings = event.settings
                    make_validation_per_media = getattr(settings, 'make_validation_per_media', False)
                    max_posts_per_guest = getattr(settings, 'max_posts_per_guest', 1)
                    max_image_per_post = settings.max_image_per_post
                    max_video_per_post = settings.max_video_per_post
                    max_voice_per_post = settings.max_voice_per_post
                except EventSettings.DoesNotExist:
                    # Use default limits if no settings exist
                    make_validation_per_media = False
                    max_posts_per_guest = 1
                    max_image_per_post = 3
                    max_video_per_post = 2
                    max_voice_per_post = 1
                
                # Count existing posts by this guest for this event (excluding the current post)
                existing_posts_count = GuestPost.objects.filter(event=event, guest=guest).exclude(id=post.id).count()
                
                # Calculate total media files being uploaded in this post
                total_media_files_in_post = len(photos) + len(videos) + len(voice_recordings)
                
                if not make_validation_per_media:
                    # Validation per guest: allow any media type, total media files limited by max_posts_per_guest
                    # Count total media files this guest has already uploaded (excluding media from current post)
                    existing_media_count = MediaFile.objects.filter(event=event, guest=guest).exclude(post=post).count()
                    total_media_after_upload = existing_media_count + total_media_files_in_post
                    
                    if total_media_after_upload > max_posts_per_guest:
                        post.delete()
                        raise serializers.ValidationError(
                            f"Maximum media files per guest ({max_posts_per_guest}) exceeded. "
                            f"You have already uploaded {existing_media_count} media file(s), "
                            f"and you're trying to upload {total_media_files_in_post} more. "
                            f"Total would be {total_media_after_upload}, but maximum allowed is {max_posts_per_guest}."
                        )
                else:
                    # Validation per media type: validate each media type separately using max_image_per_post, etc.
                    # Also validate max_posts_per_guest limit
                    print("Validation per media type: validate each media type separately using max_image_per_post, etc.")
                    print(f"Existing posts count: {existing_posts_count}")
                    print(f"Max posts per guest: {max_posts_per_guest}")
                    existing_media_count = MediaFile.objects.filter(event=event, guest=guest).exclude(post=post).count()
                    total_media_after_upload = existing_media_count + total_media_files_in_post
                    if total_media_after_upload > max_posts_per_guest:
                        post.delete()
                        raise serializers.ValidationError(
                            f"Maximum posts per guest ({max_posts_per_guest}) exceeded. "
                            f"You have already created {existing_media_count} post(s) for this event remaining media files {max_posts_per_guest - existing_media_count}."
                        )
                    
                    # Validate per media type limits by counting existing media for this guest
                    existing_photo_count = MediaFile.objects.filter(
                        event=event,
                        guest=guest,
                        media_type='photo'
                    ).exclude(post=post).count()
                    existing_video_count = MediaFile.objects.filter(
                        event=event,
                        guest=guest,
                        media_type='video'
                    ).exclude(post=post).count()
                    existing_voice_count = MediaFile.objects.filter(
                        event=event,
                        guest=guest,
                        media_type='voice'
                    ).exclude(post=post).count()
                    
                    # Validate photos
                    if existing_photo_count + len(photos) > max_image_per_post:
                        post.delete()
                        raise serializers.ValidationError(
                            f"Maximum images per post ({max_image_per_post}) exceeded. "
                            f"You have already uploaded {existing_photo_count} image(s), "
                            f"and you're trying to upload {len(photos)} more. "
                            f"Total would be {existing_photo_count + len(photos)}, but maximum allowed is {max_image_per_post}."
                        )
                    
                    # Validate videos
                    if existing_video_count + len(videos) > max_video_per_post:
                        post.delete()
                        raise serializers.ValidationError(
                            f"Maximum videos per post ({max_video_per_post}) exceeded. "
                            f"You have already uploaded {existing_video_count} video(s), "
                            f"and you're trying to upload {len(videos)} more. "
                            f"Total would be {existing_video_count + len(videos)}, but maximum allowed is {max_video_per_post}."
                        )
                    
                    # Validate voice recordings
                    if existing_voice_count + len(voice_recordings) > max_voice_per_post:
                        post.delete()
                        raise serializers.ValidationError(
                            f"Maximum voice recordings per post ({max_voice_per_post}) exceeded. "
                            f"You have already uploaded {existing_voice_count} voice recording(s), "
                            f"and you're trying to upload {len(voice_recordings)} more. "
                            f"Total would be {existing_voice_count + len(voice_recordings)}, but maximum allowed is {max_voice_per_post}."
                        )
                
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


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def api_user_profile(request):
    """API endpoint to get and update user profile"""
    user = request.user
    
    if request.method == 'GET':
        # Return user profile data
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'date_joined': user.date_joined
        }, status=status.HTTP_200_OK)
    
    elif request.method in ['PUT', 'PATCH']:
        # Update user profile
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        phone_number = request.data.get('phone_number', '').strip()
        
        # Validate email if provided
        if email:
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response(
                    {'error': 'Email already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = email
        
        # Validate phone number format if provided: 09xxxxxxxx
        if phone_number:
            if not phone_number.startswith('09') or len(phone_number) != 10 or not phone_number.isdigit():
                return Response(
                    {'error': 'Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Store phone number - for now we'll skip it since there's no UserProfile model
            # You can extend this later to create a UserProfile model
        
        # Update user fields
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        
        try:
            user.save()
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                },
                'message': 'Profile updated successfully'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Error updating profile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_change_password(request):
    """API endpoint to change user password"""
    user = request.user
    
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not old_password or not new_password or not confirm_password:
        return Response(
            {'error': 'Old password, new password, and confirmation are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != confirm_password:
        return Response(
            {'error': 'New passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(new_password) < 8:
        return Response(
            {'error': 'New password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify old password
    if not user.check_password(old_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if new password is same as old password
    if user.check_password(new_password):
        return Response(
            {'error': 'New password must be different from current password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user.set_password(new_password)
        user.save()
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Error changing password: {str(e)}'},
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


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def telegram_webhook(request):
    """
    Handle Telegram webhook callbacks for button clicks.
    This endpoint receives callback queries when users click inline keyboard buttons.
    Telegram sends updates in the format: {"update_id": 123, "callback_query": {...}}
    """
    try:
        import json
        data = json.loads(request.body)
        
        # Telegram sends updates in this format: {"update_id": 123, "callback_query": {...}}
        # Check if this is a callback query (button click)
        if 'callback_query' in data:
            callback_query = data['callback_query']
            callback_data = callback_query.get('data', '')
            chat_id = callback_query['message']['chat']['id']
            message_id = callback_query['message']['message_id']
            
            # Extract payment ID from callback data
            if callback_data.startswith('confirm_payment_'):
                payment_id = callback_data.replace('confirm_payment_', '').strip()
                return handle_payment_confirmation(payment_id, chat_id, message_id, callback_query['id'])
            elif callback_data.startswith('reject_payment_'):
                payment_id = callback_data.replace('reject_payment_', '').strip()
                return handle_payment_rejection(payment_id, chat_id, message_id, callback_query['id'])
        
        return Response({'ok': True}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error processing Telegram webhook: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def handle_payment_confirmation(payment_id, chat_id, message_id, callback_query_id):
    """Handle payment confirmation from Telegram button click"""
    try:
        from django.conf import settings
        import requests
        
        # Get payment object
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            answer_callback_query(callback_query_id, "❌ Payment not found", show_alert=True)
            return Response({'ok': False, 'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment is already confirmed
        if payment.status == 'completed':
            answer_callback_query(callback_query_id, "⚠️ Payment already confirmed", show_alert=True)
            return Response({'ok': False, 'error': 'Payment already confirmed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Confirm the payment (similar to the confirm endpoint)
        payment.status = 'completed'
        payment.paid_at = timezone.now()
        payment.save()
        
        # Update event payment status
        event = payment.event
        event.payment_status = 'paid'
        event.status = 'active'
        event.save()
        
        # Answer the callback query
        answer_callback_query(callback_query_id, "✅ Payment confirmed successfully!")
        
        # Update the message to show confirmation
        confirmation_message = format_payment_confirmation_message(
            payment, 
            event, 
            User.objects.filter(is_superuser=True).first() or event.host
        )
        
        # Edit the original message
        edit_message_text(chat_id, message_id, confirmation_message)
        
        # Send confirmation notification to all configured recipients
        try:
            send_telegram_message(confirmation_message)
        except Exception as e:
            print(f"Failed to send confirmation notification: {e}")
        
        return Response({'ok': True, 'message': 'Payment confirmed'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error confirming payment: {e}")
        import traceback
        traceback.print_exc()
        answer_callback_query(callback_query_id, f"❌ Error: {str(e)}", show_alert=True)
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def handle_payment_rejection(payment_id, chat_id, message_id, callback_query_id):
    """Handle payment rejection from Telegram button click"""
    try:
        from django.conf import settings
        import requests
        
        # Get payment object
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            answer_callback_query(callback_query_id, "❌ Payment not found", show_alert=True)
            return Response({'ok': False, 'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if payment is already processed
        if payment.status == 'completed':
            answer_callback_query(callback_query_id, "⚠️ Payment already confirmed", show_alert=True)
            return Response({'ok': False, 'error': 'Payment already confirmed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Reject the payment
        payment.status = 'failed'
        payment.save()
        
        # Answer the callback query
        answer_callback_query(callback_query_id, "❌ Payment rejected")
        
        # Update the message
        rejection_message = f"""
❌ <b>Payment Rejected</b>

💳 <b>Payment ID:</b> {payment.id}
📅 <b>Event:</b> {payment.event.title}
💰 <b>Amount:</b> {payment.amount} ETB
📊 <b>Status:</b> Rejected
"""
        edit_message_text(chat_id, message_id, rejection_message)
        
        return Response({'ok': True, 'message': 'Payment rejected'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error rejecting payment: {e}")
        import traceback
        traceback.print_exc()
        answer_callback_query(callback_query_id, f"❌ Error: {str(e)}", show_alert=True)
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def answer_callback_query(callback_query_id, text, show_alert=False):
    """Answer a Telegram callback query"""
    from django.conf import settings
    import requests
    
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not bot_token:
        return False
    
    url = f'https://api.telegram.org/bot{bot_token}/answerCallbackQuery'
    payload = {
        'callback_query_id': callback_query_id,
        'text': text,
        'show_alert': show_alert
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        return response.status_code == 200
    except Exception as e:
        print(f"Error answering callback query: {e}")
        return False


def edit_message_text(chat_id, message_id, text):
    """Edit a Telegram message"""
    from django.conf import settings
    import requests
    
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    if not bot_token:
        return False
    
    url = f'https://api.telegram.org/bot{bot_token}/editMessageText'
    payload = {
        'chat_id': chat_id,
        'message_id': message_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        return response.status_code == 200
    except Exception as e:
        print(f"Error editing message: {e}")
        return False


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


@api_view(['POST'])
@permission_classes([AllowAny])
def send_phone_otp(request):
    """Send OTP to phone number for authentication"""
    phone_number = request.data.get('phone_number', '').strip()
    name = request.data.get('name', '').strip()
    
    if not phone_number:
        return Response(
            {'error': 'Phone number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate phone number format: 09xxxxxxxx (10 digits starting with 09)
    if not phone_number.startswith('09') or len(phone_number) != 10 or not phone_number.isdigit():
        return Response(
            {'error': 'Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Set expiration time (5 minutes from now)
    expires_at = timezone.now() + timedelta(minutes=5)
    
    # Invalidate previous OTPs for this phone number
    PhoneOTP.objects.filter(phone_number=phone_number, is_verified=False).update(is_verified=True)
    
    # Create new OTP record
    otp_record = PhoneOTP.objects.create(
        phone_number=phone_number,
        otp_code=otp_code,
        expires_at=expires_at
    )
    
    sms_message = f"Your Neberku verification code is {otp_code}. It expires in 5 minutes."
    sms_success, sms_error = send_afromessage_sms(phone_number, sms_message)

    if not sms_success:
        if settings.DEBUG:
            print(f"SMS send failed for {phone_number}: {sms_error}")
        else:
            return Response(
                {'error': f'Failed to send OTP. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    response_payload = {
        'success': True,
        'message': 'OTP sent successfully',
        'expires_in': 300  # 5 minutes in seconds
    }

    # Only expose OTP code in debug environments for easier testing
    if settings.DEBUG:
        response_payload['otp_code'] = otp_code
    
    return Response(response_payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_phone_otp(request):
    """Verify OTP and create/login user, return JWT tokens"""
    phone_number = request.data.get('phone_number', '').strip()
    otp_code = request.data.get('otp_code', '').strip()
    name = request.data.get('name', '').strip()
    
    if not phone_number or not otp_code:
        return Response(
            {'error': 'Phone number and OTP code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate phone number format
    if not phone_number.startswith('09') or len(phone_number) != 10 or not phone_number.isdigit():
        return Response(
            {'error': 'Phone number must be in format: 09xxxxxxxx (10 digits starting with 09)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Find valid OTP record
    try:
        otp_record = PhoneOTP.objects.filter(
            phone_number=phone_number,
            is_verified=False
        ).order_by('-created_at').first()
        
        if not otp_record:
            return Response(
                {'error': 'No OTP found for this phone number. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if OTP is expired
        if otp_record.is_expired():
            return Response(
                {'error': 'OTP has expired. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check attempts
        if otp_record.attempts >= 5:
            return Response(
                {'error': 'Too many failed attempts. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify OTP code
        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save()
            return Response(
                {'error': f'Invalid OTP code. {5 - otp_record.attempts} attempts remaining.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark OTP as verified
        otp_record.is_verified = True
        otp_record.save()
        
        # Find or create user by phone number
        # Since User model doesn't have phone_number field, we'll use username based on phone
        username = f"user_{phone_number}"
        user = None
        
        # Try to find existing user by username (phone-based)
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Create new user
            # Generate a random password (user won't need it for phone auth)
            user = User(
                username=username,
                email=f"{phone_number}@neberku.local",
                first_name=name if name else phone_number
            )
            user.set_password(get_random_string(32))
            user.save()
        
        # Update user name if provided
        if name and user.first_name != name:
            user.first_name = name
            user.save()
        
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
                'phone_number': phone_number
            },
            'message': 'OTP verified successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error verifying OTP: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def guest_my_posts(request):
    """Return authenticated guest's posts based on their phone number"""
    user = request.user
    username = user.username or ''
    phone_number = ''

    if username.startswith('user_'):
        phone_number = username.split('user_', 1)[1]

    # Allow explicit override via query param (for potential future use)
    if not phone_number:
        phone_number = request.query_params.get('phone', '').strip()

    if not phone_number:
        return Response(
            {'error': 'Authenticated guest not found or phone number missing.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    posts = GuestPost.objects.filter(
        guest__phone=phone_number
    ).select_related('event', 'guest').order_by('-created_at')

    serializer = GuestPostSerializer(
        posts,
        many=True,
        context={'request': request, 'guest_phone_for_media': phone_number}
    )

    return Response({
        'success': True,
        'phone_number': phone_number,
        'count': len(serializer.data),
        'posts': serializer.data
    }, status=status.HTTP_200_OK)
