import * as doctorRepository from "../repositories/doctorRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import * as reportRepository from "../repositories/reportRepository.js";
import * as consultationRepository from "../repositories/consultationRepository.js";
import client from "../config/redisClient.js";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppErrors";
import bcrypt from "bcrypt";

export const getDoctors = async () => {
  const cachedDoctors = await client.get("doctors");

  if (cachedDoctors) {
    return JSON.parse(cachedDoctors);
  }

  const doctors = await doctorRepository.getAllDoctors();

  await client.setEx("doctors", 300, JSON.stringify(doctors));

  return doctors;
};

export const loginDoctor = async (email, password) => {
  const doctor = await doctorRepository.findDoctorByEmail(email);

  if (!doctor) {
    throw new AppError("Invalid email or password", 401);
  }

  const match = await bcrypt.compare(password, doctor.password);

  if (!match) {
    throw new AppError("Invalid email or password", 401);
  }

  return jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });
};

export const changeAvailability = async (docId) => {
  const doctor = await doctorRepository.findDoctorById(docId);

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  const updatedDoctor = await doctorRepository.updateDoctorById(docId, {
    available: !doctor.available,
  });

  await client.del("doctors");

  return updatedDoctor;
};

export const getDoctorProfile = async (docId) => {
  const cachedDoctor = await client.get(`doctor-data-${docId}`);

  if (cachedDoctor) {
    return JSON.parse(cachedDoctor);
  }

  const doctor = await doctorRepository.findDoctorById(docId);

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  await client.setEx(`doctor-data-${docId}`, 120, JSON.stringify(doctor));

  return doctor;
};

export const updateDoctorProfile = async (docId, data) => {
  const doctor = await doctorRepository.updateDoctorProfile(docId, data);
  if (!doctor) {
    throw new AppError("Doctor not found");
  }

  await client.del(`doctor-data-${docId}`);

  return doctor;
};

export const getDoctorDashboard = async (docId) => {
  const cachedDashboard = await client.get(`doctor-dashboard-${docId}`);

  if (cachedDashboard) {
    return JSON.parse(cachedDashboard);
  }

  const [appointments, consultations] = await Promise.all([
    appointmentRepository.findAppointmentsByDoctor(docId),
    consultationRepository.findConsultationsByDoctor(docId),
  ]);

  let earnings_appointment = 0;

  appointments.forEach((item) => {
    if (item.isCompleted || item.payment) {
      earnings_appointment += item.amount;
    }
  });

  let earnings_consultation = 0;

  consultations.forEach((item) => {
    if (item.isCompleted) {
      earnings_consultation += item.amount;
    }
  });

  const patients = new Set();
  appointments.forEach((a) => patients.add(a.userId));

  const patientsConsultation = new Set();
  consultations.forEach((c) => patientsConsultation.add(c.userId));

  const dashData = {
    earnings_appointment,
    earnings_consultation,

    patients: patients.size,
    patients_Consultation: patientsConsultation.size,

    appointments: appointments.length,

    latestAppointments: [...appointments].reverse().slice(0, 3),

    latestConsultation: [...consultations].reverse().slice(0, 3),
  };

  await client.setEx(
    `doctor-dashboard-${docId}`,
    120,
    JSON.stringify(dashData),
  );

  return dashData;
};

export const clearDoctorSlots = async (docId) => {
  const doctor = await doctorRepository.clearDoctorSlots(docId);

  return doctor;
};
