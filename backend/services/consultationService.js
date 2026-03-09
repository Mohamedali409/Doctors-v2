import * as consultationRepository from "../repositories/consultationRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import AppError from "../utils/AppErrors.js";

export const createConsultation = async (data) => {
  const appointment = await appointmentRepository.findAppointmentById(
    data.appointmentId,
  );

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (!appointment.isCompleted) {
    throw new AppError("Appointment not completed", 400);
  }

  if (appointment.cancelled) {
    throw new AppError("Appointment was cancelled", 400);
  }

  return consultationRepository.createConsultation(data);
};

export const completeConsultation = async (consultationId, userId) => {
  const consultation =
    await consultationRepository.findConsultationById(consultationId);

  if (!consultation) {
    throw new AppError("Consultation not found", 404);
  }

  if (!consultation.userId.equals(userId)) {
    throw new AppError("You can't complete this consultation", 403);
  }

  if (consultation.isCompleted) {
    throw new AppError("Consultation already completed", 400);
  }

  if (consultation.cancelled) {
    throw new AppError("Consultation was cancelled", 400);
  }

  return consultationRepository.completeConsultation(consultationId);
};

export const cancelConsultation = async (consultationId, userId) => {
  const consultation =
    await consultationRepository.findConsultationById(consultationId);

  if (!consultation) {
    throw new AppError("Consultation not found", 404);
  }

  if (!consultation.userId.equals(userId)) {
    throw new AppError("You can't cancel this consultation", 403);
  }

  if (consultation.isCompleted) {
    throw new AppError("Consultation already completed", 400);
  }

  if (consultation.cancelled) {
    throw new AppError("Consultation already cancelled", 400);
  }

  return consultationRepository.cancelConsultation(consultationId);
};

export const getDoctorConsultations = async (docId) => {
  const doctorConsultations =
    await consultationRepository.findConsultationsByDoctor(docId);

  if (doctorConsultations.length === 0) {
    throw new AppError("Doctor has no consultations yet", 404);
  }

  return doctorConsultations;
};
