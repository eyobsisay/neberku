from django.urls import path
from . import views
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

app_name = 'core'

schema_view = get_schema_view(
   openapi.Info(
      title="Neberku Software API",
      default_version='v1',
      description="API documentation for Neberku Software Platform",
      terms_of_service="https://www.neberku.com/terms/",
      contact=openapi.Contact(email="contact@neberku.com"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    # Landing page
    path('', views.landing_page, name='landing_page'),
    
    # Authentication
    path('login/', views.login_view, name='login_view'),
    path('register/', views.register_view, name='register_view'),
    path('logout/', views.logout_view, name='logout_view'),
    
    # Event owner dashboard (requires login)
    path('dashboard/', views.event_owner_dashboard, name='event_owner_dashboard'),
    
    # Event-specific dashboard
    path('dashboard/<uuid:event_id>/', views.event_specific_dashboard, name='event_specific_dashboard'),
    
    # Guest contribution page
    path('contribute/', views.guest_contribution, name='guest_contribution'),
    
    # Event gallery (public)
    path('event/<uuid:event_id>/', views.event_gallery, name='event_gallery'),
    
    # Contact form API
    path('contact/', views.contact_form, name='contact_form'),
    
    # Swagger documentation
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
] 