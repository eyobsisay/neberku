from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.forms.models import BaseInlineFormSet
from django import forms
from .models import EventType, Package, Event, Payment, Guest, GuestPost, MediaFile, EventSettings, PaymentMethod

class EventSettingsFormSet(BaseInlineFormSet):
    """Custom formset for EventSettings inline to prevent duplicates"""
    
    def clean(self):
        """Validate that we don't have duplicate EventSettings"""
        if any(self.errors):
            return
        
        # Check for duplicates
        event_ids = []
        for form in self.forms:
            if form.cleaned_data and not form.cleaned_data.get('DELETE', False):
                event_id = form.cleaned_data.get('event')
                if event_id in event_ids:
                    raise forms.ValidationError('Only one EventSettings per event is allowed.')
                event_ids.append(event_id)
    
    def save(self, commit=True):
        """Override save to prevent creating duplicates"""
        instances = super().save(commit=False)
        
        for instance in instances:
            # If this is a new instance, check if EventSettings already exist
            if not instance.pk:
                if EventSettings.objects.filter(event=instance.event).exists():
                    # Don't create a new one, just skip
                    continue
            
            if commit:
                instance.save()
        
        return instances

@admin.register(EventType)
class EventTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'icon', 'color_display', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['sort_order', 'name']
    list_editable = ['is_active', 'sort_order']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Styling', {
            'fields': ('icon', 'color', 'sort_order')
        }),
    )
    
    def color_display(self, obj):
        if obj.color:
            return format_html(
                '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
                obj.color, obj.color
            )
        return '-'
    color_display.short_description = 'Color'

@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'max_guests', 'max_photos', 'max_videos', 'max_voice', 'is_try', 'is_active', 'created_at']
    list_filter = ['is_active', 'is_try', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['price']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'price', 'is_active', 'is_try')
        }),
        ('Limits', {
            'fields': ('max_guests', 'max_photos', 'max_videos', 'max_voice')
        }),
        ('Features', {
            'fields': ('features',)
        }),
    )

class EventSettingsInline(admin.StackedInline):
    """Inline admin for EventSettings model - now optional"""
    model = EventSettings
    extra = 1  # Show one empty form if no EventSettings exist
    can_delete = True  # Allow deleting EventSettings if needed
    max_num = 1  # Only allow one EventSettings per event
    formset = EventSettingsFormSet  # Use custom formset
    
    fieldsets = (
        ('File Settings', {
            'fields': ('max_photo_size', 'allowed_photo_formats', 'max_video_size', 'max_video_duration', 'allowed_video_formats', 'max_voice_size', 'max_voice_duration', 'allowed_voice_formats'),
            'classes': ('collapse',)
        }),
        ('Guest Settings', {
            'fields': ('require_approval', 'allow_anonymous', 'max_posts_per_guest', 'max_image_per_post', 'max_video_per_post', 'max_voice_per_post','make_validation_per_media')
        }),
        ('Privacy Settings', {
            'fields': ('public_gallery', 'show_guest_names'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Return the existing EventSettings for this event"""
        qs = super().get_queryset(request)
        return qs
    
    def has_add_permission(self, request, obj=None):
        """Allow adding EventSettings if none exist for this event"""
        if obj and hasattr(obj, 'settings'):
            return False  # Don't allow adding if EventSettings already exist
        return True  # Allow adding if no EventSettings exist
    
    def get_formset(self, request, obj=None, **kwargs):
        """Override formset to handle existing EventSettings properly"""
        formset = super().get_formset(request, obj, **kwargs)
        
        # If we're editing an existing event, ensure we only show existing EventSettings
        if obj and hasattr(obj, 'settings'):
            # Set extra to 0 to prevent adding new forms
            formset.extra = 0
            formset.max_num = 1
            
        return formset
    
    def get_formsets_with_inlines(self, request, obj=None):
        """Ensure proper handling of formsets"""
        for inline in self.get_inline_instances(request, obj):
            yield inline.get_formset(request, obj), inline
    
    def get_queryset(self, request):
        """Return only existing EventSettings, don't allow creating new ones"""
        qs = super().get_queryset(request)
        return qs
    
    def has_add_permission(self, request, obj=None):
        """Never allow adding new EventSettings through inline"""
        return False

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'host', 'event_type', 'event_date', 'status', 'payment_status', 'is_public_display', 'contributor_code', 'total_guest_posts', 'total_media_files', 'like_count', 'is_live']
    list_filter = ['status', 'payment_status', 'event_type', 'is_public', 'created_at', 'event_date']
    search_fields = ['title', 'description', 'host__username', 'host__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'published_at', 'total_guest_posts', 'total_media_files', 'like_count', 'is_live', 'qr_code_display', 'share_link_display', 'contributor_code_display']
    ordering = ['-created_at']
    inlines = [EventSettingsInline]
    
    actions = ['regenerate_qr_codes', 'regenerate_share_links', 'regenerate_contributor_codes', 'toggle_public_status']
    
    fieldsets = (
        ('Event Information', {
            'fields': ('id', 'title', 'description', 'host', 'package', 'event_type', 'event_date', 'location')
        }),
        ('Media & Images', {
            'fields': ('event_thumbnail', 'event_banner', 'qr_code_display', 'share_link_display', 'contributor_code_display')
        }),
        ('Settings', {
            'fields': ('allow_photos', 'allow_videos', 'allow_wishes', 'allow_voice', 'auto_approve_posts', 'is_public')
        }),
        ('Status & Payment', {
            'fields': ('status', 'payment_status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'published_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total_guest_posts(self, obj):
        return obj.total_guest_posts
    total_guest_posts.short_description = 'Guest Posts'
    
    def total_media_files(self, obj):
        return obj.total_media_files
    total_media_files.short_description = 'Media Files'
    
    def like_count(self, obj):
        return obj.like_count
    like_count.short_description = 'Likes'
    
    def qr_code_display(self, obj):
        if obj.qr_code:
            return format_html('<img src="{}" style="max-width: 200px; height: auto;" />', obj.qr_code.url)
        return 'No QR code generated'
    qr_code_display.short_description = 'QR Code'
    
    def share_link_display(self, obj):
        if obj.share_link:
            return format_html('<a href="{}" target="_blank">{}</a>', obj.share_link, obj.share_link)
        return 'No share link generated'
    share_link_display.short_description = 'Share Link'
    
    def is_live(self, obj):
        if obj.is_live:
            return format_html('<span style="color: green;">✓ Live</span>')
        return format_html('<span style="color: red;">✗ Not Live</span>')
    is_live.short_description = 'Status'
    
    def regenerate_qr_codes(self, request, queryset):
        """Admin action to regenerate QR codes for selected events"""
        count = 0
        for event in queryset:
            event.regenerate_qr_code()
            event.save()
            count += 1
        
        self.message_user(request, f'Successfully regenerated QR codes for {count} events.')
    regenerate_qr_codes.short_description = "Regenerate QR codes for selected events"
    
    def regenerate_share_links(self, request, queryset):
        """Admin action to regenerate share links for selected events"""
        count = 0
        for event in queryset:
            event.regenerate_share_link()
            event.save()
            count += 1
        
        self.message_user(request, f'Successfully regenerated share links for {count} events.')
    regenerate_share_links.short_description = "Regenerate share links for selected events"
    
    def contributor_code_display(self, obj):
        if obj.contributor_code:
            return format_html(
                '<code style="background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 1.1em;">{}</code>',
                obj.contributor_code
            )
        return 'No code generated'
    contributor_code_display.short_description = 'Contributor Code'
    
    def is_public_display(self, obj):
        if obj.is_public:
            return format_html('<span style="color: green; font-weight: bold;">✓ Public</span>')
        return format_html('<span style="color: red; font-weight: bold;">✗ Private</span>')
    is_public_display.short_description = 'Public'
    
    def regenerate_contributor_codes(self, request, queryset):
        """Admin action to regenerate contributor codes for selected events"""
        count = 0
        for event in queryset:
            event.regenerate_contributor_code()
            event.save()
            count += 1
        
        self.message_user(request, f'Successfully regenerated contributor codes for {count} events.')
    regenerate_contributor_codes.short_description = "Regenerate contributor codes for selected events"
    
    def toggle_public_status(self, request, queryset):
        """Admin action to toggle public/private status of selected events"""
        count = 0
        for event in queryset:
            event.is_public = not event.is_public
            event.save()
            count += 1
        
        self.message_user(request, f'Successfully toggled public status for {count} events.')
    toggle_public_status.short_description = "Toggle public/private status for selected events"
    
    def save_model(self, request, obj, form, change):
        """Override save - EventSettings are now optional and created manually when needed"""
        super().save_model(request, obj, form, change)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['event', 'amount', 'payment_method', 'status', 'paid_at', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['event__title', 'transaction_id']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('event', 'amount', 'payment_method', 'transaction_id', 'status')
        }),
        ('Timestamps', {
            'fields': ('paid_at', 'created_at')
        }),
    )

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'event', 'total_posts', 'total_media_files', 'created_at']
    list_filter = ['created_at', 'event__event_type']
    search_fields = ['name', 'phone', 'event__title']
    readonly_fields = ['id', 'created_at', 'ip_address', 'user_agent', 'total_posts', 'total_media_files']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Guest Information', {
            'fields': ('id', 'event', 'name', 'phone')
        }),
        ('Metadata', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    def total_posts(self, obj):
        return obj.total_posts
    total_posts.short_description = 'Posts'
    
    def total_media_files(self, obj):
        return obj.total_media_files
    total_media_files.short_description = 'Media Files'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event')

class MediaFileInline(admin.TabularInline):
    """Inline admin for MediaFile model"""
    model = MediaFile
    extra = 0
    readonly_fields = ['id', 'file_size', 'file_name', 'mime_type', 'created_at', 'approved_at']
    fields = ['media_type', 'media_file', 'is_approved', 'file_size', 'file_name']
    
    def has_add_permission(self, request, obj=None):
        return False  # Media files should be added through the post form

@admin.register(GuestPost)
class GuestPostAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'event', 'wish_text_preview', 'total_media_files', 'photo_count', 'video_count', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at', 'event__event_type']
    search_fields = ['wish_text', 'guest__name', 'event__title']
    readonly_fields = ['id', 'created_at', 'approved_at', 'total_media_files', 'photo_count', 'video_count']
    ordering = ['-created_at']
    inlines = [MediaFileInline]
    
    fieldsets = (
        ('Post Information', {
            'fields': ('id', 'event', 'guest', 'wish_text')
        }),
        ('Status', {
            'fields': ('is_approved',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'approved_at')
        }),
    )
    
    def guest_name(self, obj):
        return obj.guest.name
    guest_name.short_description = 'Guest Name'
    
    def wish_text_preview(self, obj):
        return obj.wish_text[:50] + '...' if len(obj.wish_text) > 50 else obj.wish_text
    wish_text_preview.short_description = 'Wish Text'
    
    def total_media_files(self, obj):
        return obj.total_media_files
    total_media_files.short_description = 'Total Media'
    
    def photo_count(self, obj):
        return obj.photo_count
    photo_count.short_description = 'Photos'
    
    def video_count(self, obj):
        return obj.video_count
    video_count.short_description = 'Videos'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('guest', 'event')

@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ['media_type', 'guest_name', 'event', 'post_wish_preview', 'file_size_display', 'is_approved', 'created_at']
    list_filter = ['media_type', 'is_approved', 'created_at', 'event__event_type']
    search_fields = ['post__wish_text', 'guest__name', 'event__title']
    readonly_fields = ['id', 'file_size', 'file_name', 'mime_type', 'created_at', 'approved_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Media Information', {
            'fields': ('id', 'post', 'guest', 'event', 'media_type', 'media_file', 'media_thumbnail')
        }),
        ('File Details', {
            'fields': ('file_size', 'file_name', 'mime_type')
        }),
        ('Status', {
            'fields': ('is_approved',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'approved_at')
        }),
    )
    
    def guest_name(self, obj):
        return obj.guest.name
    guest_name.short_description = 'Guest Name'
    
    def post_wish_preview(self, obj):
        return obj.post.wish_text[:50] + '...' if len(obj.post.wish_text) > 50 else obj.post.wish_text
    post_wish_preview.short_description = 'Post Wish'
    
    def file_size_display(self, obj):
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = 'File Size'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('post', 'guest', 'event')

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'account_number', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'account_number', 'description']
    ordering = ['sort_order', 'name']
    list_editable = ['is_active', 'sort_order']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description')
        }),
        ('Routing', {
            'fields': ('account_number',)
        }),
        ('Status & Ordering', {
            'fields': ('is_active', 'sort_order')
        }),
    )

@admin.register(EventSettings)
class EventSettingsAdmin(admin.ModelAdmin):
    list_display = ['event', 'require_approval', 'public_gallery', 'max_posts_per_guest', 'make_validation_per_media', 'max_image_per_post', 'max_video_per_post', 'max_voice_per_post', 'allow_anonymous', 'show_guest_names']
    list_filter = ['require_approval', 'public_gallery', 'make_validation_per_media', 'allow_anonymous', 'show_guest_names']
    search_fields = ['event__title', 'event__host__username']
    readonly_fields = ['id']
    ordering = ['-event__created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'event')
        }),
        ('File Settings', {
            'fields': ('max_photo_size', 'allowed_photo_formats', 'max_video_size', 'max_video_duration', 'allowed_video_formats', 'max_voice_size', 'max_voice_duration', 'allowed_voice_formats'),
            'classes': ('collapse',)
        }),
        ('Guest Settings', {
            'fields': ('require_approval', 'allow_anonymous', 'max_posts_per_guest', 'make_validation_per_media', 'max_image_per_post', 'max_video_per_post', 'max_voice_per_post')
        }),
        ('Privacy Settings', {
            'fields': ('public_gallery', 'show_guest_names')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('event', 'event__host')
