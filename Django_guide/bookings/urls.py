from django.urls import path

from .views import (
    ListAppointmentView,
    DetailAppointmentView,
    ListMedicalNoteView,
    DetailMedicalNoteView,
)

urlpatterns = [
    path('appointments/', ListAppointmentView.as_view()),
    path('appointments/<int:id>/', DetailAppointmentView.as_view()),
    path('medicalnotes/', ListMedicalNoteView.as_view()),
    path('medicalnotes/<int:id>/', DetailMedicalNoteView.as_view()),
]