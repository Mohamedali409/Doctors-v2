import * as consultationRepository from "../repositories/consultationRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import client from "../config/redisClient.js";
import AppError from "../utils/AppErrors.js";

// create consultation
export const createConsultation = async (data) => {
  const appointment = await appointmentRepository.findAppointmentById(
    data.appointmentId,
  );

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (appointment.cancelled) {
    throw new AppError("Appointment was cancelled", 400);
  }

  if (!appointment.isCompleted) {
    throw new AppError("هذا الحجز لم يتم الكشف فيه بعد", 400);
  }

  if (
    !appointment.userId.equals(data.userId) ||
    !appointment.docId.equals(data.docId)
  ) {
    throw new AppError("هذا الحجز لا يخص هذا المريض", 403);
  }

  // convert dates
  const [day, month, year] = appointment.slotDate.split("-");
  const appointmentDate = new Date(`${year}-${month}-${day}`);
  const consultDate = new Date(data.consultDay);

  if (consultDate <= appointmentDate) {
    throw new AppError("ميعاد الاستشارة لازم يكون بعد ميعاد الكشف", 400);
  }

  const consultationData = {
    ...data,
    appointmentData: appointment,
    userData: appointment.userData,
    docData: appointment.docData,
  };

  const consultation =
    await consultationRepository.createConsultation(consultationData);

  // clear cache
  await client.del(`doctor-consultation-${data.docId}`);

  return consultation;
};

// complete consultation
export const completeConsultation = async (consultationId, userId, docId) => {
  const consultation =
    await consultationRepository.findConsultationById(consultationId);

  if (!consultation) {
    throw new AppError("Consultation not found", 404);
  }

  if (
    !consultation.userId.equals(userId) ||
    !consultation.docId.equals(docId)
  ) {
    throw new AppError("You can't complete this consultation", 403);
  }

  if (consultation.isCompleted) {
    throw new AppError("Consultation already completed", 400);
  }

  if (consultation.cancelled) {
    throw new AppError("Consultation was cancelled", 400);
  }

  const updated =
    await consultationRepository.completeConsultation(consultationId);

  await client.del(`doctor-consultation-${docId}`);

  return updated;
};

// cancel consultation
export const cancelConsultation = async (consultationId, userId, docId) => {
  const consultation =
    await consultationRepository.findConsultationById(consultationId);

  if (!consultation) {
    throw new AppError("Consultation not found", 404);
  }

  if (
    !consultation.userId.equals(userId) ||
    !consultation.docId.equals(docId)
  ) {
    throw new AppError("You can't cancel this consultation", 403);
  }

  if (consultation.isCompleted) {
    throw new AppError("Consultation already completed", 400);
  }

  if (consultation.cancelled) {
    throw new AppError("Consultation already cancelled", 400);
  }

  const updated =
    await consultationRepository.cancelConsultation(consultationId);

  await client.del(`doctor-consultation-${docId}`);

  return updated;
};

// get doctor consultations
export const getDoctorConsultations = async (docId) => {
  const cached = await client.get(`doctor-consultation-${docId}`);

  if (cached) {
    return JSON.parse(cached);
  }

  const consultations =
    await consultationRepository.findConsultationsByDoctor(docId);

  await client.setEx(
    `doctor-consultation-${docId}`,
    120,
    JSON.stringify(consultations),
  );

  return consultations;
};
