import * as reportRepository from "../repositories/reportRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import AppError from "../utils/AppErrors.js";

export const createReport = async (reportData) => {
  const appointment = await appointmentRepository.findAppointmentById(
    data.appointmentId,
  );

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (appointment.cancelled) {
    throw new AppError("Appointment cancelled", 400);
  }

  if (!appointment.isCompleted) {
    throw new AppError("Appointment not completed", 400);
  }

  const reportData = {
    ...data,
    userId: appointment.userId,
    docId: appointment.docId,
    userData: appointment.userData,
    docData: appointment.docData,
    appointmentData: appointment,
  };

  const report = await reportRepository.createReport(reportData);

  await client.del(`all-report-${appointment.docId}`);
  await client.del(`user-report-${appointment.userId}-${appointment.docId}`);

  return report;
};

export const updateReport = async (reportId, data) => {
  const report = await reportRepository.findReportById(reportId);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  const updated = await reportRepository.updateReport(reportId, data);

  await client.del(`all-report-${report.docId}`);
  await client.del(`user-report-${report.userId}-${report.docId}`);

  return updated;
};

export const deleteReport = async (reportId) => {
  const report = await reportRepository.findReportById(reportId);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  await reportRepository.deleteReport(reportId);

  await client.del(`all-report-${report.docId}`);
  await client.del(`user-report-${report.userId}-${report.docId}`);

  return true;
};

export const getDoctorReports = async (docId) => {
  const cached = await client.get(`all-report-${docId}`);

  if (cached) {
    return JSON.parse(cached);
  }

  const reports = await reportRepository.findReportsByDoctor(docId);

  await client.setEx(`all-report-${docId}`, 120, JSON.stringify(reports));

  return reports;
};

export const getUserReportsWithDoctor = async (docId, userId) => {
  const cached = await client.get(`user-report-${userId}-${docId}`);

  if (cached) {
    return JSON.parse(cached);
  }

  const reports = await reportRepository.findUserReports(userId, docId);

  if (!reports || reports.length === 0) {
    throw new AppError("لا يوجد تقارير", 404);
  }

  await client.setEx(
    `user-report-${userId}-${docId}`,
    120,
    JSON.stringify(reports),
  );

  return reports;
};
