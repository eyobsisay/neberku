from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from . import views

router = DefaultRouter()
router.register(r'event-types', views.EventTypeViewSet)
router.register(r'packages', views.PackageViewSet)
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'guests', views.GuestViewSet, basename='guest')
router.register(r'guest-posts', views.GuestPostViewSet, basename='guest-post')
router.register(r'guest-post-create', views.GuestPostCreateViewSet, basename='guest-post-create')
router.register(r'media-files', views.MediaFileViewSet, basename='media-file')
router.register(r'public-events', views.PublicEventViewSet, basename='public-event')
router.register(r'payment-methods', views.PaymentMethodViewSet, basename='payment-method')

urlpatterns = [
    path('', include(router.urls)),
    
    # JWT Authentication endpoints
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Custom Authentication endpoints
    path('debug-auth/', views.api_debug_auth, name='api_debug_auth'),
    path('login/', views.api_login, name='api_login'),
    path('register/', views.api_register, name='api_register'),
    path('logout/', views.api_logout, name='api_logout'),
    
    # User profile endpoints
    path('user/profile/', views.api_user_profile, name='api_user_profile'),
    path('user/change-password/', views.api_change_password, name='api_change_password'),
    
    # Guest access endpoints
    path('guest/event/', views.guest_event_access, name='guest_event_access'),
    path('guest/event-by-id/<uuid:event_id>/', views.guest_event_by_id, name='guest_event_by_id'),
    path('guest/public-events/', views.list_public_events, name='list_public_events'),
    
    # Public media endpoint (secure - only returns approved media from approved posts)
    path('public/posts/<uuid:post_id>/media/<uuid:media_id>/', views.public_media_item, name='public_media_item'),
    
    # Telegram webhook endpoint
    path('telegram/webhook/', views.telegram_webhook, name='telegram_webhook'),
] 