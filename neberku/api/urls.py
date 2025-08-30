from django.urls import path, include
from rest_framework.routers import DefaultRouter
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

urlpatterns = [
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('debug-auth/', views.api_debug_auth, name='api_debug_auth'),
    path('login/', views.api_login, name='api_login'),
    path('register/', views.api_register, name='api_register'),
    path('logout/', views.api_logout, name='api_logout'),
] 