from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.conf import settings
import os
import json

def landing_page(request):
    """Landing page for the platform"""
    return render(request, 'core/landing.html')

def login_view(request):
    """User login view"""
    if request.user.is_authenticated:
        return redirect('core:event_owner_dashboard')
    
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f'Welcome back, {username}!')
                return redirect('core:event_owner_dashboard')
            else:
                messages.error(request, 'Invalid username or password.')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = AuthenticationForm()
    
    return render(request, 'core/login.html', {'form': form})

def register_view(request):
    """User registration view"""
    if request.user.is_authenticated:
        return redirect('core:event_owner_dashboard')
    
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully! Welcome to Neberku!')
            return redirect('core:event_owner_dashboard')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserCreationForm()
    
    return render(request, 'core/register.html', {'form': form})

def logout_view(request):
    """User logout view"""
    logout(request)
    messages.success(request, 'You have been logged out successfully.')
    return redirect('core:landing_page')

@login_required
def event_owner_dashboard(request):
    """Dashboard for event owners to manage their events"""
    return render(request, 'core/event_owner_dashboard.html')

@login_required
def event_specific_dashboard(request, event_id):
    """Dashboard for managing a specific event"""
    context = {
        'event_id': event_id
    }
    return render(request, 'core/event_specific_dashboard.html', context)

def guest_contribution(request):
    """Page for guests to contribute to events"""
    return render(request, 'core/guest_contribution.html')

def event_gallery(request, event_id):
    """Public gallery view for a specific event"""
    context = {
        'event_id': event_id
    }
    return render(request, 'core/guest_contribution.html', context)

@csrf_exempt
@require_http_methods(["POST"])
def contact_form(request):
    """Handle contact form submissions"""
    try:
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        subject = data.get('subject')
        message = data.get('message')
        
        # Here you would typically save to database or send email
        # For now, we'll just log it
        print(f"Contact form submission: {name} ({email}) - {subject}: {message}")
        
        return JsonResponse({'status': 'success', 'message': 'Thank you for your message!'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

def frontend_dashboard(request):
    """Serve the frontend dashboard from Django to avoid CORS issues"""
    return render(request, 'core/frontend_dashboard.html')

def frontend_login(request):
    """Serve the frontend login from Django to avoid CORS issues"""
    return render(request, 'core/frontend_login.html')

def frontend_debug(request):
    """Serve the frontend debug page from Django to avoid CORS issues"""
    return render(request, 'core/frontend_debug.html')

def frontend_register(request):
    """Serve the frontend register page from Django to avoid CORS issues"""
    return render(request, 'core/frontend_register.html')
