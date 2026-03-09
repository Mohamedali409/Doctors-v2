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

const changeAvailable = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const docData = await doctorModel.findById(docId);
  if (!docData) {
    return next(new AppError("Doctor is not found", 404));
  }
  await doctorModel.findByIdAndUpdate(docId, {
    avalibale: !docData.avalibale,
  });

  await client.del("doctors");
  await docData.save();

  res.status(200).json({
    success: true,
    message: "تم تحديث الحاله بنجاح",
    avalibale: docData.avalibale,
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

  const comparPassword = await bcrypt.compare(password, doctor.password);

  if (comparPassword) {
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ success: true, token });
  } else {
    next(new AppError("ربما البريد الاكلتروني أو كلة السر خطاء", 404));
  }
});
// api to get doctor appointments
const doctorAppointments = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  // هشوف الدكاترة موجوده جوه caching  ولا لا
  const chachedDoctors = await client.get(`doctor-appointments-${docId}`);

  if (chachedDoctors) {
    console.log("من الكاش");
    return res.json({
      success: true,
      appointments: JSON.parse(chachedDoctors),
    });
  }
  const appointments = await appointmentModel.find({ docId });
  await client.setEx(
    `doctor-appointments-${docId}`,
    120,
    JSON.stringify(appointments),
  );

  res.status(200).json({
    success: true,
    message: "All Doctor Appointments ",
    appointments,
  });
});

const appointmentCompleted = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  const appointmentData = await appointmentModel.findById(appointmentId);
  if (appointmentData && appointmentData.docId.equals(docId)) {
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
    });
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime,
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked }, { new: true });

    // delete redis cache
    await client.del(`doctor-dashboard-${docId}`);
    await client.del(`doctor-appointments-${docId}`);

    res.status(200).json({
      success: true,
      message: `أكتمل الكشف من قبل الطبيب ${appointmentData.docData.name}`,
    });
  } else {
    return next(new AppError("لم تنجح العملية", 400));
  }
});

const appointmentCancel = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  const appointmentData = await appointmentModel.findById(appointmentId);
  if (appointmentData && appointmentData.docId.equals(docId)) {
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime,
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.status(200).json({
      success: true,
      message: `تم ألغاء الكشف من قبل ال ${appointmentData.docData.name}`,
    });
    await client.del(`doctor-appointments-${docId}`);
    await client.del(`doctor-dashboard-${docId}`);
  } else {
    return next(new AppError("لم تنجح العملية"));
  }
});

// deleted all slots booked from doctor
const deleteSlotsBooked = asyncHandler(async (req, res, next) => {
  const docId = req.docId;

  const docSlots = await doctorModel.findByIdAndUpdate(
    docId,
    {
      slots_booked: {},
    },
    { new: true },
  );

  if (docSlots) {
    return res
      .status(200)
      .json({ success: true, message: " تمت العملية يانجم النجوم", docSlots });
  }
});

// doctor api ------> dashboard ---- with cached
const doctorDashboard = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const chachedDoctorDashbord = await client.get(`doctor-dashboard-${docId}`);
  if (chachedDoctorDashbord) {
    console.log("بيانات لوحة التحكم من الكاش الخاصة بالطبيب");
    return res.json({
      success: true,
      dashData: JSON.parse(chachedDoctorDashbord),
    });
  }

  const appointments = await appointmentModel
    .find({ docId })
    .select("amount isCompleted payment userId");
  const consultations = await consultationModel.find({ docId });

  let earnings_appointment = 0;
  appointments.forEach((item) => {
    //map
    if (item.isCompleted || item.payment) {
      earnings_appointment += item.amount;
    }
  });
  let earnings_consultation = 0;

  consultations.forEach((item) => {
    //map
    if (item.isCompleted) {
      earnings_consultation += item.amount;
    }
  });

  const patients = [];
  appointments.map((items) => {
    if (!patients.includes(items.userId)) {
      patients.push(items.userId);
    }
  });

  const patients_Consultation = [];
  consultations.map((items) => {
    if (!patients_Consultation.includes(items.userId)) {
      patients_Consultation.push(items.userId);
    }
  });

  const dashData = {
    earnings_appointment,
    earnings_consultation,
    patients_Consultation: patients_Consultation.length,
    appointments: appointments.length,
    patients: patients.length,
    latestAppointments: appointments.reverse().slice(0, 3),
    latestConsultation: consultations.reverse().slice(0, 3),
  };

  await client.setEx(
    `doctor-dashboard-${docId}`,
    120,
    JSON.stringify(dashData),
  );

  res
    .status(200)
    .json({ success: true, message: "Doctor dashbord info", dashData });
});

// api to get doctor info to -------> dashboard ---- with cached
const doctorProfile = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const chachedDoctorProfile = await client.get(`doctor-data-${docId}`);
  if (chachedDoctorProfile) {
    console.log("بيانات الدكتور من الكاش");

    return res.json({
      success: true,
      docInfo: JSON.parse(chachedDoctorProfile),
    });
  }
  const docInfo = await doctorModel.findById(docId).select("-password");
  await client.setEx(`doctor-data-${docId}`, 120, JSON.stringify(docInfo));
  res.json({ success: true, message: "Doctor profile information", docInfo });
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
  const docInfo = await doctorModel.findByIdAndUpdate(
    docId,
    {
      fees,
      consultation_fees,
      address,
      avalibale,
      phone,
      start_booked,
    },
    { new: true },
  );

  await client.del(`doctor-data-${docId}`);

  res.json({
    success: true,
    message: ` تم تحديث الحساب الشخصي لي   ${docInfo.name}`,
    docInfo,
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

  if (!complaint || !examination || !diagnosis || !treatment) {
    return next(new AppError("All required fields must be provided", 400));
  }

  const appointment = await appointmentModel.findById(appointmentId);
  if (!appointment) {
    return next(new AppError("Appointment not found", 404));
  }

  if (!appointment.isCompleted || appointment.cancelled) {
    return next(
      new AppError("لايمكن كتابة تقرير لمريض ألغى الكشف أو لم يكمل الكشف", 404),
    );
  }

  const todayVisit = new Date(appointment.slotDate);
  const newNextVisit = new Date(nextVisit);

  if (newNextVisit <= todayVisit) {
    return next(
      new AppError("لا يجوز اختيار موعد قبل يوم الكشف أو في نفس اليوم", 404),
    );
  }

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

  const newReport = new reportModel(reportData);
  await newReport.save();

  await client.del(`all-report-${docId}`);
  await client.del(`user-report-${userId}-${docId}`);

  res.status(201).json({
    success: true,
    message: "Report added successfully",
    report: newReport,
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

  const report = await reportModel.findById(reportId);

  if (report) {
    await reportModel.findByIdAndUpdate(
      reportId,
      {
        complaint,
        examination,
        diagnosis,
        treatment,
        notes,
        nextVisit,
      },
      { new: true },
    );

    await client.del(`all-report-${docId}`);
    await client.del(`user-report-${userId}-${docId}`);

    res.status(200).json({
      success: true,
      message: ` تم تحديث التقرير بنجاح لي     ${report.userData.name}`,
    });
  } else {
    return next(new AppError("هذا التقرير غير موجود", 404));
  }
});

//api get all report to doctor dashboard ---- with cached
const allReport = asyncHandler(async (req, res, next) => {
  const docId = req.docId;
  const chachedAllReport = await client.get(`all-report-${docId}`);
  if (chachedAllReport) {
    console.log("من الكاش يااااامان");

    return res.status(200).json({
      success: true,
      message: "All report with doctor from chache",
      reports: JSON.parse(chachedAllReport),
    });
  }

  const reports = await reportModel.find({ docId });

  await client.setEx(`all-report-${docId}`, 120, JSON.stringify(reports));
  res.json({
    success: true,
    message: "All Reports for doctor dashbord",
    reports,
  });
});

// api to get user reports from the doctor ---- with cached
const getUserReportWithDoctor = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const docId = req.docId;

  const chachedUserReportsWithDoctor = await client.get(
    `user-report-${userId}-${docId}`,
  );

  if (chachedUserReportsWithDoctor) {
    return res.status(200).json({
      success: true,
      message: "User report with doctor form chach",
      userReport: JSON.parse(chachedUserReportsWithDoctor),
    });
  }
  const userReport = await reportModel.find({ userId, docId });

  if (userReport.length === 0) {
    return res.status(200).json({ success: true, message: "لا يوجد تقارير" });
  }

  await client.setEx(
    `user-report-${userId}-${docId}`,
    120,
    JSON.stringify(userReport),
  );
  res
    .status(200)
    .json({ success: true, message: "Get all user report with ", userReport });
});

// api controller to delete user report from doctor dashbord -----------------find see it
const deletedReport = asyncHandler(async (req, res, next) => {
  const { reportId } = req.body;

  const report = await reportModel.findById(reportId);

  if (report) {
    await reportModel.findByIdAndDelete(reportId);
    await client.del(`all-report-${docId}`);
    await client.del(`user-report-${userId}-${docId}`);
    res.status(200).json({ success: true, message: "تم حذف التقرير بنجاح" });
  } else {
    res.status(200).json({ success: true, message: "هذا التقرير غير متاح" });
  }
});

//api to search about user from doctor dachbord

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

  if (!consultDay) {
    return res
      .status(404)
      .json({ success: false, message: "برجاء اختيار اليوم" });
  }

  // هات الـ appointment اللي الدكتور بعته
  const appointmentData = await appointmentModel.findById(appointmentId);

  if (!appointmentData) {
    return res.status(404).json({ success: false, message: "الحجز غير موجود" });
  }

  // تأكد إن الحجز ده يخص نفس المريض والدكتور
  if (
    appointmentData.userId.toString() !== userId ||
    appointmentData.docId.toString() !== docId
  ) {
    return res.status(404).json({
      success: false,
      message: "هذا الحجز لا يخص هذا المريض",
    });
  }

  // تأكد إن الكشف فعلاً اتعمل
  if (!appointmentData.isCompleted) {
    return res.json({
      success: false,
      message: "هذا الحجز لم يتم الكشف فيه بعد",
    });
  }

  // تأكد إن يوم الاستشارة بعد يوم الحجز
  // لازم نحول slotDate لـ Date
  const [day, month, year] = appointmentData.slotDate.split("-");
  const appointmentDate = new Date(`${year}-${month}-${day}`); // عكسنا هنا ترتيب التاريخ
  const consultDate = new Date(consultDay);

  if (consultDate <= appointmentDate) {
    return res.json({
      success: false,
      message: "ميعاد الاستشارة لازم يكون بعد ميعاد الكشف",
    });
  }

  // لو كل الشروط تمام
  const newConsaltation = new consultationModel({
    userId,
    docId,
    consultDay,
    notes,
    appointmentId,
    amount,
    appointmentData: appointmentData,
    userData: appointmentData.userData,
    docData: appointmentData.docData,
  });

  await newConsaltation.save();
  res.status(200).json({ success: true, message: "تم إنشاء الاستشارة بنجاح" });
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
