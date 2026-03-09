import AppError from "../utils/AppErrors";
import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import consultationModel from "../models/consultationModel.js";
import reportModel from "../models/reportModel.js";
import asyncHandler from "../utils/asyncHandler.js";

// Doctor related:
const addDoctor = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    speciality,
    degree,
    experience,
    about,
    fees,
    address,
    phone,
    start_booked,
    consultation_fees,
  } = req.body;

  const imageFile = req.file;

  if (!name || !email || !password || !confirmPassword) {
    return next(new AppError("Missing required fields", 400));
  }

  if (!validator.isEmail(email)) {
    return next(new AppError("Invalid email format", 400));
  }

  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }

  if (!phone || phone.length !== 11) {
    return next(new AppError("Invalid phone number", 400));
  }

  if (!imageFile) {
    return next(new AppError("Doctor image is required", 400));
  }

  const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
    resource_type: "image",
  });

  const existingDoctor = await doctorModel.findOne({ email });

  if (existingDoctor) {
    return next(new AppError("Doctor already exists", 400));
  }

  const doctor = await doctorModel.create({
    name,
    email,
    password,
    confirmPassword,
    image: imageUpload.secure_url,
    speciality,
    degree,
    experience,
    about,
    fees,
    phone,
    consultation_fees,
    start_booked: JSON.parse(start_booked),
    address: JSON.parse(address),
    date: Date.now(),
  });

  res.status(201).json({
    success: true,
    message: "Doctor added successfully",
    data: doctor,
  });
});

const doctorList = asyncHandler(async (req, res, next) => {
  const doctors = await doctorModel.find({}).select("-password");
  if (doctors.length === 0) {
    return next(new AppError("No doctors found", 404));
  }
  res.status(200).json({ success: true, doctors });
});

const removeDoctor = asyncHandler(async (req, res, next) => {
  const { docId } = req.body;

  const doctor = await doctorModel.findById(docId);
  if (!doctor) {
    return next(new AppError("Doctor not found", 404));
  }
  await doctorModel.findByIdAndDelete(docId);
  res
    .status(200)
    .json({ success: true, message: "Doctor deleted successfully " });
});

//Admin auth:
const loginAdmin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(200).json({ success: true, token });
  } else {
    return next(new AppError("Invalid credentials", 401));
  }
});

const adminDashboard = asyncHandler(async (req, res, next) => {
  const [doctors, users, appointments, consultations, reports] =
    await Promise.all([
      doctorModel.find({}),
      userModel.find({}),
      appointmentModel.find({}),
      consultationModel.find({}),
      reportModel.find({}),
    ]);

  const dashData = {
    doctors: doctors.length,
    users: users.length,
    appointments: appointments.length,
    consultations: consultations.length,
    reports: reports.length,
    lastAppointment: appointments.slice().reverse().slice(0, 5),
    lastConsultation: consultations.slice().reverse().slice(0, 5),
  };

  res.status(200).json({
    success: true,
    message: "Admin dashboard data",
    dashData,
  });
});

//Appointments:
const getAllAppointment = asyncHandler(async (req, res, next) => {
  const appointments = await appointmentModel.find({});
  if (appointments.length === 0) {
    return next(new AppError("Appointments not found", 404));
  }
  res.status(200).json({ success: true, appointments });
});

const cancelAppointment = asyncHandler(async (req, res, next) => {
  const { appointmentId } = req.body;
  const appointmentData = await appointmentModel.findById(appointmentId);

  if (!appointmentData) {
    return next(new AppError("Appointment is not found", 404));
  }
  await appointmentModel.findByIdAndUpdate(appointmentId, {
    cancelled: true,
  });

  // releasing doctor slot

  const { docId, slotDate, slotTime } = appointmentData;

  const doctorData = await doctorModel.findById(docId);

  if (!doctorData) {
    return next(new AppError("Doctor is not found"));
  }

  let slots_booked = doctorData.slots_booked;

  slots_booked[slotDate] = slots_booked[slotDate].filter((e) => e !== slotTime);

  const appointmentUpdate = await doctorModel.findByIdAndUpdate(
    docId,
    { slots_booked },
    { new: true },
  );

  res.status(200).json({
    success: true,
    message: "تم ألغاء الحجز بنجاح",
    mgsToDev: "This is appointment update",
    appointmentInfo: appointmentUpdate,
  });
});

const getUserReportWithDoctorFromAdmin = asyncHandler(
  async (req, res, next) => {
    const { userId } = req.body;

    const userReport = await reportModel.find({ userId });

    if (userReport.length === 0) {
      return next(new AppError("user reports not found", 404));
    }
    res.status(200).json({ success: true, userReport });
  },
);

//Consultations:
const getAllConsultationToAdmin = asyncHandler(async (req, res, next) => {
  const consultation = await consultationModel.find({});
  if (consultation.length === 0) {
    return next(new AppError("Don't have Consultation", 400));
  }
  res.status(200).json({ success: true, consultation });
});

const getAllUserConsultationToAdmin = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  const consultation = await consultationModel.find({ userId });

  if (consultation.length === 0) {
    return next(new AppError("This user don't have any consultations", 404));
  }

  res.status(200).json({ success: true, consultation });
});

const completedConsultation = asyncHandler(async (req, res, next) => {
  const { consultationId, userId, docId } = req.body;

  const consultation = await consultationModel.findById(consultationId);
  if (
    !consultation ||
    !consultation.docId.equals(docId) ||
    !consultation.userId.equals(userId)
  ) {
    return next(new AppError("Consultation not found or invalid", 404));
  }

  // Mark consultation as completed
  await consultationModel.findByIdAndUpdate(consultationId, {
    isCompleted: true,
  });

  // Release doctor slot
  const { consultDay, consultTime } = consultation;
  const doctorData = await doctorModel.findById(docId);

  if (doctorData) {
    let slots_booked = doctorData.slots_booked;
    if (slots_booked[consultDay]) {
      slots_booked[consultDay] = slots_booked[consultDay].filter(
        (slot) => slot !== consultTime,
      );
    }
    await doctorModel.findByIdAndUpdate(docId, { slots_booked }, { new: true });
  }

  res.status(200).json({
    success: true,
    message: `تم إلغاء استشارة المريض ${consultation.userData.name} وتم تحرير الموعد`,
  });
});

const cancelConsultation = asyncHandler(async (req, res, next) => {
  const { consultationId, userId, docId } = req.body;

  const consultation = await consultationModel.findById(consultationId);
  if (
    !consultation ||
    !consultation.docId.equals(docId) ||
    !consultation.userId.equals(userId)
  ) {
    return next(new AppError("Consultation not found or invalid", 404));
  }

  // Mark consultation as cancelled
  await consultationModel.findByIdAndUpdate(consultationId, {
    cancelled: true,
  });

  // Release doctor slot
  const { consultDay, consultTime } = consultation;
  const doctorData = await doctorModel.findById(docId);

  if (doctorData) {
    let slots_booked = doctorData.slots_booked;
    if (slots_booked[consultDay]) {
      slots_booked[consultDay] = slots_booked[consultDay].filter(
        (slot) => slot !== consultTime,
      );
    }
    await doctorModel.findByIdAndUpdate(docId, { slots_booked }, { new: true });
  }

  res.status(200).json({
    success: true,
    message: `تم إلغاء استشارة المريض ${consultation.userData.name} وتم تحرير الموعد`,
  });
});

//Reports:

const getUserReportToAdmin = asyncHandler(async (req, res, next) => {
  const reports = await reportModel.find({});
  if (reports.length === 0) {
    return next(new AppError("The reports is not found"));
  } else {
    res.status(200).json({ success: true, reports });
  }
});

const deletedReportFromAdmin = asyncHandler(async (req, res, next) => {
  const { reportId } = req.body;

  const report = await reportModel.findById(reportId);

  if (report) {
    await reportModel.findByIdAndDelete(reportId);
    return res.status(200).json({ success: true, message: "تم الحذف بنجاح" });
  } else {
    return next(new AppError("This report not found"));
  }
});

const editReportFromAdmin = asyncHandler(async (req, res, next) => {
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
    await reportModel.findByIdAndUpdate(reportId, {
      complaint,
      examination,
      diagnosis,
      treatment,
      notes,
      nextVisit,
    });

    res.status(200).json({
      success: true,
      message: ` تم تحديث التقرير بنجاح لي     ${report.userData.name}`,
    });
  } else {
    return next(new AppError("This report is not found", 404));
  }
});

const getUserAppointmentWithDoctorFromAdmin = asyncHandler(
  async (req, res, next) => {
    const { userId } = req.body;

    const userAppointment = await appointmentModel.find({ userId });

    if (userAppointment.length === 0) {
      return next(new AppError("Don't have reports", 404));
    }
    res.status(200).json({ success: true, userAppointment });
  },
);

//Search:
const searchUserFromAdmin = asyncHandler(async (req, res, next) => {
  const { q } = req.body;

  if (!q) {
    return next(new AppError("Query and doctor is required", 404));
  }

  const appointments = await appointmentModel
    .find({
      $or: [
        { "userData.name": { $regex: q, $options: "i" } },
        { "userData.nationalId": { $regex: q, $options: "i" } },
        { "userData.phone": { $regex: q.replace(/\s/g, ""), $options: "i" } },
      ],
    })
    .limit(5);

  const users = appointments.map((a) => a.userData);
  const uniqueUsers = Array.from(
    new Map(users.map((u) => [u._id || u.nationaliId || u.phone, u])).values(),
  );

  res.status(200).json({ success: true, users: uniqueUsers });
});

export {
  addDoctor,
  loginAdmin,
  doctorList,
  getAllAppointment,
  cancelAppointment,
  adminDashboard,
  removeDoctor,
  getUserReportToAdmin,
  deletedReportFromAdmin,
  editReportFromAdmin,
  searchUserFromAdmin,
  getUserReportWithDoctorFromAdmin,
  getUserAppointmentWithDoctorFromAdmin,
  getAllConsultationToAdmin,
  getAllUserConsultationToAdmin,
  cancelConsultation,
  completedConsultation,
};
