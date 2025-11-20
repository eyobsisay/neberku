from rest_framework.permissions import BasePermission
from core.models import UserProfile


class IsEventOwner(BasePermission):
    """
    Allows access only to authenticated event owners or staff members.
    """
    message = 'Only event owners can access this resource.'

    def has_permission(self, request, view):
        user = request.user
        if getattr(view, 'swagger_fake_view', False):
            return True

        if not user or not user.is_authenticated:
            return False

        if user.is_staff or user.is_superuser:
            return True

        profile = getattr(user, 'profile', None)
        return bool(profile and profile.role == UserProfile.ROLE_EVENT_OWNER)

