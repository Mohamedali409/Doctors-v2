import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import appointmentModel from "../models/appointmentModel.js";
import reportModel from "../models/reportModel.js";
import userModel from "../models/userModel.js";
import consultationModel from "../models/consultationModel.js";
import { sendMedicalReportEmail } from "../services/mailService.js";
import client from "../config/redisClient.js";
import AppError from "../utils/AppErrors.js";
import asyncHandler from "../utils/asyncHandler.js";

import * as doctorService from "../services/doctorService.js";
import * as appointmentService from "../services/appointmentService.js";
import * as reportService from "../services/reportService.js";
import * as consultationService from "../services/consultationService.js";

const changeAvailable = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const doctor = await doctorService.changeAvailability(docId);

  res.status(200).json({
    success: true,
    message: "تم تحديث الحاله بنجاح",
    avalibale: doctor.avalibale,
  });
});

const doctorList = asyncHandler(async (req, res, next) => {
  const doctorList = await doctorService.getDoctors();

  res.status(200).json({
    success: true,
    message: "Doctor list",
    doctorList,
  });
});

const loginDoctor = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const token = await doctorService.loginDoctor(email, password);

  res.status(201).json({ success: true, message: "Login successfully", token });
});
// api to get doctor appointments
const doctorAppointments = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const doctorAppointments =
    await appointmentService.getDoctorAppointments(docId);

  res.status(200).json({
    success: true,
    message: "All Doctor Appointments ",
    doctorAppointments,
  });
});

const appointmentCompleted = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  await appointmentService.completeAppointment(docId, appointmentId);

  res.status(200).json({
    success: true,
    message: `أكتمل كشف من قبل الطبيب`,
  });
});

const appointmentCancel = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  await appointmentService.cancelAppointment(docId, appointmentId);

  res.status(200).json({
    success: true,
    message: `تم ألغاء الكشف من قبل ال ${appointmentData.docData.name}`,
  });
});

// deleted all slots booked from doctor
const deleteSlotsBooked = asyncHandler(async (req, res, next) => {
  const docId = req.docId;

  const docSlots = await doctorService.clearDoctorSlots(docId);

  return res
    .status(200)
    .json({ success: true, message: " تمت العملية يانجم النجوم", docSlots });
});

// doctor api ------> dashboard ---- with cached
const doctorDashboard = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const doctorDashboard = await doctorService.getDoctorDashboard(docId);

  res
    .status(200)
    .json({ success: true, message: "Doctor Dashboard Data", doctorDashboard });
});

// api to get doctor info to -------> dashboard ---- with cached
const doctorProfile = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const doctor = await doctorService.getDoctorProfile(docId);

  res
    .status(200)
    .json({ success: true, message: "Doctor profile information", doctor });
});

// api to update doctor info to -------> dashboard
const doctorProfileUpdate = asyncHandler(async (req, res) => {
  const {
    docId,
    fees,
    address,
    avalibale,
    phone,
    start_booked,
    consultation_fees,
  } = req.body;

  const data = {
    fees,
    address,
    avalibale,
    phone,
    start_booked,
    consultation_fees,
  };

  const doctor = await doctorService.updateDoctorProfile(docId, data);
  res.json({
    success: true,
    message: ` تم تحديث الحساب الشخصي لي   ${doctor.name}`,
    doctor,
  });
});

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

//api to search about user from doctor dashboard

const searchUser = asyncHandler(async (req, res, next) => {
  const { q } = req.body;
  const docId = req.docId;

  if (!q || !docId) {
    return res
      .status(400)
      .json({ success: false, message: "query and doctor required" });
  }

  const appointments = await appointmentModel
    .find({
      docId,
      $or: [
        { "userData.name": { $regex: q, $options: "i" } },
        { "userData.nationalId": { $regex: q, $options: "i" } },
        { "userData.phone": { $regex: q.replace(/\s/g, ""), $options: "i" } },
      ],
    })
    .limit(10);

  if (appointments.length === 0) {
    return res
      .status(200)
      .json({ success: true, message: "User is empty", appointments: [] });
  }

  const users = appointments.map((a) => a.userData);
  const uniqueUsers = Array.from(
    new Map(users.map((u) => [u._id || u.id || u.phone, u])).values(),
  );

  res.status(200).json({ success: true, users: uniqueUsers });
});

// get how many appointment for this use and report ---- with cached
const useDetails = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  const chachedUserDetalis = await client.get(`user-details-${userId}`);
  if (chachedUserDetalis) {
    console.log("بيانات المريض من الكاش");
    return res.status(200).json({
      success: true,
      userDetails: JSON.parse(chachedUserDetalis),
    });
  }

  const userAppointment = await appointmentModel.find({ userId });
  const userReport = await reportModel.find({ userId });

  if (userAppointment.length === 0 && userReport.length === 0) {
    return res.status(200).json({
      success: true,
      message: "User Appointment or user Report is empaty",
    });
  }

  const userDetails = {
    userAppointment: userAppointment.length,
    userReport: userReport.length,
  };

  await client.setEx(
    `user-details-${userId}`,
    120,
    JSON.stringify(userDetails),
  );

  res.status(200).json({
    success: true,
    message: "User Details for doctor dashbord",
    userDetails,
  });
});

// create consultation with doctor when the appointment is completed
const createConsaltation = asyncHandler(async (req, res, next) => {
  const { userId, consultDay, notes, appointmentId, amount } = req.body;

  const docId = req.docId;

  const data = {
    userId,
    docId,
    consultDay,
    notes,
    appointmentId,
    amount,
  };

  const consultation = await consultationService.createConsultation(data);

  res.status(201).json({
    success: true,
    message: "تم إنشاء الاستشارة بنجاح",
    consultation,
  });
});

// completed consultation with doctor
const consultationCompeleted = asyncHandler(async (req, res, next) => {
  const { consultationId, userId } = req.body;
  const docId = req.docId;

  const consultation = await consultationModel.findById(consultationId);
  if (
    consultation &&
    consultation.docId.equals(docId) &&
    consultation.userId.equals(userId)
  ) {
    const consualtations = await consultationModel.findByIdAndUpdate(
      consultationId,
      {
        isCompleted: true,
      },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "تم الانتهاء من الاستشارة بنجاح",
      consualtations,
    });
  } else {
    res.status(404).json({ success: false, message: "لم تنجح العملية" });
  }
});

// api controller to cancel consultation from doctor
const cancelConsultation = asyncHandler(async (req, res, next) => {
  const { consultationId, userId } = req.body;
  const docId = req.docId;

  const consultation = await consultationModel.findById(consultationId);
  if (
    consultation &&
    consultation.docId.equals(docId) &&
    consultation.userId.equals(userId)
  ) {
    const consualtations = await consultationModel.findByIdAndUpdate(
      consultationId,
      {
        cancelled: true,
      },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: `تم ألغاء 
        استشارة الماريض ${consualtations.userData.name}`,
    });
  } else {
    res.status(404).json({ success: false, message: "لم تنجح العملية" });
  }
});

// get all consultation to doctor ---- with cached
const doctorConsultation = asyncHandler(async (req, res, next) => {
  const docId = req.docId;

  const chachedConsultation = await client.get(`doctor-consultation-${docId}`);
  if (chachedConsultation) {
    console.log("الاستشارة من الكاش");
    return res.status(201).json({
      success: true,
      message: "All doctor consultations form chached",
      consualtations: JSON.parse(chachedConsultation),
    });
  }

  const consualtations = await consultationModel.find({ docId });

  if (consualtations.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لاتوجد أي استشارات حالياً",
      consualtations: [],
    });
  }

  await client.setEx(
    `doctor-consultation-${docId}`,
    120,
    JSON.stringify(consualtations),
  );

  res.status(200).json({
    success: true,
    message: "All Doctor Consultations ",
    consualtations,
  });
});
export {
  changeAvailable, // re wreied
  doctorList,
  loginDoctor,
  doctorAppointments,
  appointmentCompleted,
  appointmentCancel,
  doctorDashboard, // re wreied
  doctorProfile,
  doctorProfileUpdate,
  addReport,
  allReport,
  getUserReportWithDoctor,
  searchUser,
  editReport,
  useDetails,
  createConsaltation,
  consultationCompeleted,
  cancelConsultation,
  doctorConsultation,
  deleteSlotsBooked,
  deletedReport,
};
