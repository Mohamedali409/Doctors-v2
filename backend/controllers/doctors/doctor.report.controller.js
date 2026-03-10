import { sendMedicalReportEmail } from "../services/mailService.js";
import asyncHandler from "../utils/asyncHandler.js";
import * as reportService from "../services/reportService.js";

// add report
export const addReport = asyncHandler(async (req, res) => {
  const {
    appointmentId,
    complaint,
    examination,
    diagnosis,
    treatment,
    notes,
    nextVisit,
  } = req.body;

  const data = {
    appointmentId,
    complaint,
    examination,
    diagnosis,
    treatment: Array.isArray(treatment) ? treatment : JSON.parse(treatment),
    notes,
    nextVisit,
  };

  const report = await reportService.createReport(data);

  res.status(201).json({
    success: true,
    message: "Report added successfully",
    report,
  });

  sendMedicalReportEmail(report.userData.email, report);
});

// update report
export const editReport = asyncHandler(async (req, res) => {
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

  const report = await reportService.updateReport(reportId, data);

  res.status(200).json({
    success: true,
    message: `تم تحديث التقرير بنجاح للمريض ${report.userData.name}`,
    report,
  });
});

// get doctor reports
export const allReport = asyncHandler(async (req, res) => {
  const docId = req.docId;

  const reports = await reportService.getDoctorReports(docId);

  res.status(200).json({
    success: true,
    message: "All doctor reports",
    reports,
  });
});

// get user reports with doctor
export const getUserReportWithDoctor = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const docId = req.docId;

  const reports = await reportService.getUserReportsWithDoctor(docId, userId);

  res.status(200).json({
    success: true,
    message: "User reports with doctor",
    reports,
  });
});

// delete report
export const deletedReport = asyncHandler(async (req, res) => {
  const { reportId } = req.body;

  await reportService.deleteReport(reportId);

  res.status(200).json({
    success: true,
    message: "تم حذف التقرير بنجاح",
  });
});
