import * as reportRepository from "../repositories/reportRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import AppError from "../utils/AppErrors.js";

export const createReport = async (reportData) => {
  const appointment = await appointmentRepository.findAppointmentById(
    reportData.appointmentId,
  );

  if (!appointment) {
    throw new AppError("Appointment not found", 404);
  }

  if (!appointment.isCompleted) {
    throw new AppError("Appointment not completed", 400);
  }

  if (appointment.cancelled) {
    throw new AppError("Appointment cancelled", 400);
  }

  const report = await reportRepository.createReport(reportData);

  return report;
};

export const updateReport = async (reportId, data) => {
  const reportUpdate = await reportRepository.updateReport(reportId, data);

  if (!reportUpdate) {
    throw new AppError("The report not found", 404);
  }

  await client.del(`all-report-${docId}`);
  await client.del(`user-report-${userId}-${docId}`);

  return reportUpdate;
};

export const deleteReport = async (reportId) => {
  const report = await reportRepository.findReportById(reportId);

  if (!report) {
    throw new AppError("This report not found");
  }

  await reportRepository.deleteReport(reportId);
  await client.del(`all-report-${docId}`);
  await client.del(`user-report-${userId}-${docId}`);

  return true;
};

export const getDoctorReports = async (docId) => {
  const cachedAllReport = await client.get(`all-report-${docId}`);

  if (cachedAllReport) {
    return JSON.parse(cachedAllReport);
  }
  const doctorReports = await reportRepository.findReportsByDoctor(docId);

  if (!doctorReports) {
    throw new AppError("Doctor report not found");
  }

  await client.setEx(`all-report-${docId}`, 120, JSON.stringify(reports));

  return doctorReports;
};

export const getUserReportsWithDoctor = async (docId, userId) => {
  const cachedUserReportsWithDoctor = await client.get(
    `user-report-${userId}-${docId}`,
  );

  if (cachedUserReportsWithDoctor) {
    return JSON.parse(cachedUserReportsWithDoctor);
  }

  const userReportWithDoctor = await reportRepository.findUserReports(
    userId,
    docId,
  );

  if (!userReportWithDoctor) {
    throw new AppError("لا يوجد تقارير", 404);
  }

  if (userReportWithDoctor.length === 0) {
    throw new AppError("لا يوجد تقارير", 404);
  }

  await client.setEx(
    `user-report-${userId}-${docId}`,
    120,
    JSON.stringify(userReport),
  );

  return userReportWithDoctor;
};
