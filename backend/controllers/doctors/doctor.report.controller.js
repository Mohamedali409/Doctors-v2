import { sendMedicalReportEmail } from "../services/mailService.js";
import asyncHandler from "../utils/asyncHandler.js";

import * as reportService from "../../services/reportService.js";

// api to add report to user from dashboard
const addReport = asyncHandler(async (req, res, next) => {
  const {
    appointmentId,
    complaint,
    examination,
    diagnosis,
    treatment,
    notes,
    nextVisit,
  } = req.body;

  const reportData = {
    complaint,
    examination,
    diagnosis,
    treatment: Array.isArray(treatment) ? treatment : JSON.parse(treatment),
    notes,
    nextVisit,
    userId: appointment.userId,
    docId: appointment.docId,
    userData: appointment.userData,
    docData: appointment.docData,
    appointmentData: appointment,
    appointmentId,
  };

  const createReport = await reportService.createReport(reportData);

  res.status(201).json({
    success: true,
    message: "Report added successfully",
    report: createReport,
  });
  sendMedicalReportEmail(appointment.userData.email, reportData);
});

//API to edit report
const editReport = asyncHandler(async (req, res, next) => {
  const {
    reportId,
    complaint,
    examination,
    diagnosis,
    treatment,
    notes,
    nextVisit,
  } = req.body;

  const data = {
    complaint,
    examination,
    diagnosis,
    treatment,
    notes,
    nextVisit,
  };

  const reportUpdate = await reportService.updateReport(reportId, data);

  res.status(200).json({
    success: true,
    message: ` تم تحديث التقرير بنجاح لي     ${reportUpdate.userData.name}`,
    reportUpdate,
  });
});

//api get all report to doctor dashboard ---- with cached
const allReport = asyncHandler(async (req, res, next) => {
  const docId = req.docId;

  const doctorReport = await reportService.getDoctorReports(docId);

  res.json({
    success: true,
    message: "All Reports for doctor dashbord",
    doctorReport,
  });
});

// api to get user reports from the doctor ---- with cached
const getUserReportWithDoctor = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const docId = req.docId;

  // const doctorReport = await reportService.getDoctorReports(docId);
  const userReportWithDoctor = await reportService.getUserReportsWithDoctor(
    docId,
    userId,
  );

  res.status(200).json({
    success: true,
    message: "Get all user report with ",
    userReportWithDoctor,
  });
});

// api controller to delete user report from doctor dashboard -----------------find see it
const deletedReport = asyncHandler(async (req, res, next) => {
  const { reportId } = req.body;

  await reportService.deleteReport(reportId);

  res.status(200).json({ success: true, message: "تم حذف التقرير بنجاح" });
});

export {
  addReport,
  allReport,
  getUserReportWithDoctor,
  editReport,
  deletedReport,
};
