import * as appointmentRepository from "../repositories/appointmentRepository.js";
import * as doctorRepository from "../repositories/doctorRepository.js";
import client from "../config/redisClient.js";
import AppError from "../utils/AppErrors.js";

export const getDoctorAppointments = async (docId) => {
  const cachedDoctors = await client.get(`doctor-appointments-${docId}`);

  if (cachedDoctors) {
    return JSON.parse(cachedDoctors);
  }
  const doctorAppointments =
    await appointmentRepository.findAppointmentsByDoctor(docId);

  await client.setEx(
    `doctor-appointments-${docId}`,
    120,
    JSON.stringify(appointments),
  );

  return doctorAppointments;
};

export const completeAppointment = async (docId, appointmentId) => {
  const appointment =
    await appointmentRepository.findAppointmentById(appointmentId);

  if (!appointment || !appointment.docId.equals(docId)) {
    throw new AppError("Appointment not found", 404);
  }

  await appointmentRepository.updateAppointment(appointmentId, {
    isCompleted: true,
  });

  const { slotDate, slotTime } = appointment;

  const doctor = await doctorRepository.findDoctorById(docId);

  let slots = doctor.slots_booked;

  slots[slotDate] = slots[slotDate].filter((e) => e !== slotTime);

  await doctorRepository.updateDoctorSlots(docId, slots);

  await client.del(`doctor-dashboard-${docId}`);
  await client.del(`doctor-appointments-${docId}`);

  return true;
};

export const cancelAppointment = async (docId, appointmentId) => {
  const appointment =
    await appointmentRepository.findAppointmentById(appointmentId);

  if (!appointment || !appointment.docId.equals(docId)) {
    throw new AppError("Appointment not found", 404);
  }

  await appointmentRepository.updateAppointment(appointmentId, {
    cancelled: true,
  });

  const { slotDate, slotTime } = appointment;

  const doctor = await doctorRepository.findDoctorById(docId);

  let slots = doctor.slots_booked;

  slots[slotDate] = slots[slotDate].filter((e) => e !== slotTime);

  await doctorRepository.updateDoctorSlots(docId, slots);

  await client.del(`doctor-dashboard-${docId}`);
  await client.del(`doctor-appointments-${docId}`);

  return true;
};

export const getUserAppointments = async (userId) => {
  const userAppointments =
    await appointmentRepository.findAppointmentsByUser(userId);

  if (userAppointments.length === 0) {
    throw new AppError("User has no appointments yet", 404);
  }

  return userAppointments;
};

export const getAppointmentWithId = async (appointmentId) => {
  const appointment =
    await appointmentRepository.findAppointmentById(appointmentId);

  if (!appointmentId) {
    throw new AppError("Appointment not found", 404);
  }

  return appointment;
};
