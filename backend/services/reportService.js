import * as reportRepository from "../repositories/reportRepository.js";
import * as appointmentRepository from "../repositories/appointmentRepository.js";
import AppError from "../utils/AppErrors.js";

// createReport
// updateReport
// deleteReport
// getDoctorReports
// getUserReportsWithDoctor

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
