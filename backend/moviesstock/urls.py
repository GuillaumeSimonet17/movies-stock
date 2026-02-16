from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),

    # API endpoints (for React frontend)
    path('api/', include('msapp.api.urls')),

    # Legacy template views (keep during migration)
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/", include("accounts.urls")),
]
