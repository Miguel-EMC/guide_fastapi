from django.contrib import admin
from django.urls import path
from patients.views import DetailPatientView, ListPatientsView

urlpatterns = [
    path('patients/', ListPatientsView.as_view()),
    path('patients/<int:pk>/', DetailPatientView.as_view()),
]
