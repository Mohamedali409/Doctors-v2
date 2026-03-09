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

const changeAvalibality = async (req, res, next) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    if (!docData) {
      return next(new AppError("Doctor is not found", 404));
    }
    await doctorModel.findByIdAndUpdate(docData, {
      avalibale: !docData.avalibale,
    });

    await docData.save();

    res.json({
      success: true,
      message: "تم تحديث الحاله بنجاح",
      avalibale: docData.avalibale,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: fales, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    // هشوف الدكاترة موجوده جوه caching  ولا لا
    const chachedDoctors = await client.get("doctors");

    if (chachedDoctors) {
      console.log("من الكاش");
      return res.json({ success: true, doctors: JSON.parse(chachedDoctors) });
    }

    // لو مش متخذنة كدا هروح لي الداتا بيز واجيب البيانات و هخذنها لمده 5 دقائق مثلاً علشان معملش loading علي ال DB
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);

    await client.setEx("doctors", 60, JSON.stringify(doctors));
    console.log("من الداتا بيز");

    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const doctor = await doctorModel.findOne({ email });

    if (!doctor) {
      res.json({
        success: false,
        message: "ربما البريد الاكلتروني أو كلة السر خطاء",
      });
    }
    const comparPassword = await bcrypt.compare(password, doctor.password);

    if (comparPassword) {
      const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({
        success: false,
        message: "ربما البريد الاكلتروني أو كلة السر خطاء",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
// api to get doctor appointments
const doctorAppointments = async (req, res) => {
  try {
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

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCompleted = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      const { docId, slotDate, slotTime } = appointmentData;
      const doctorData = await doctorModel.findById(docId);
      let slots_booked = doctorData.slots_booked;

      slots_booked[slotDate] = slots_booked[slotDate].filter(
        (e) => e !== slotTime,
      );

      await doctorModel.findByIdAndUpdate(docId, { slots_booked });

      res.json({
        success: true,
        message: `أكتمل الكشف من قبل الطبيب ${appointmentData.docData.name}`,
      });
    } else {
      res.json({ success: false, message: "لم تنجح العملية" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
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

      res.json({
        success: true,
        message: `تم ألغاء الكشف من قبل ال ${appointmentData.docData.name}`,
      });
    } else {
      res.json({ success: false, message: "لم تنجح العملية" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// deleted all slots booked from doctor
const deleteSlotsBooked = async (req, res) => {
  try {
    const docId = req.docId;

    const docSlots = await doctorModel.findByIdAndUpdate(docId, {
      slots_booked: {},
    });

    if (docSlots) {
      return res.json({ success: true, message: " تمت العملية يانجم النجوم" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// doctor api ------> dashbord ---- with chached
const doctorDashbord = async (req, res) => {
  try {
    const { docId } = req.body;

    const chachedDoctorDashbord = await client.get(`docotr-dachbord-${docId}`);
    if (chachedDoctorDashbord) {
      console.log("بيانات لوحة التحكم من الكاش الخاصة بالطبيب");
      return res.json({
        success: true,
        dashData: JSON.parse(chachedDoctorDashbord),
      });
    }

    const appointments = await appointmentModel.find({ docId });
    const consultations = await consultationModel.find({ docId });

    let earnings_appointment = 0;
    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings_appointment += item.amount;
      }
    });
    let earnings_consultation = 0;

    consultations.map((item) => {
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
      `docotr-dachbord-${docId}`,
      120,
      JSON.stringify(dashData),
    );

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to get doctor info to -------> dashbord ---- with chached
const doctorProfile = async (req, res) => {
  try {
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
    res.json({ success: true, docInfo });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to update doctor info to -------> dashbord
const doctorProfileUpdate = async (req, res) => {
  try {
    const {
      docId,
      fees,
      address,
      avalibale,
      phone,
      start_booked,
      consultation_fees,
    } = req.body;
    const docInfo = await doctorModel.findByIdAndUpdate(docId, {
      fees,
      consultation_fees,
      address,
      avalibale,
      phone,
      start_booked,
    });

    res.json({
      success: true,
      message: ` تم تحديث الحساب الشخصي لي   ${docInfo.name}`,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to add report to user from dashbord
const addReport = async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    if (!appointment.isCompleted || appointment.cancelled) {
      return res.status(400).json({
        success: false,
        message: "لايمكن كتابة تقرير لمريض ألغى الكشف أو لم يكمل الكشف",
      });
    }

    const todayVisit = new Date(appointment.slotDate);
    const newNextVisit = new Date(nextVisit);

    if (newNextVisit <= todayVisit) {
      return res.status(400).json({
        success: false,
        message: "لا يجوز اختيار موعد قبل يوم الكشف أو في نفس اليوم",
      });
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

    res.status(201).json({
      success: true,
      message: "Report added successfully",
      report: newReport,
    });
    sendMedicalReportEmail(appointment.userData.email, reportData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

//API to edit report
const editReport = async (req, res) => {
  try {
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

      res.json({
        success: true,
        message: ` تم تحديث التقرير بنجاح لي     ${report.userData.name}`,
      });
    } else {
      res.json({ success: false, message: "هذا التقرير غير موجود" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api get all report to doctor dashbord ---- with chached
const allReport = async (req, res) => {
  try {
    const docId = req.docId;
    const chachedAllReport = await client.get(`all-report-${docId}`);
    if (chachedAllReport) {
      console.log("من الكاش يااااامان");

      return res.json({ success: true, reports: JSON.parse(chachedAllReport) });
    }

    const reports = await reportModel.find({ docId });

    await client.setEx(`all-report-${docId}`, 120, JSON.stringify(reports));
    res.json({ success: true, reports });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// api to get user reports from the doctor ---- with chached
const getUserReportWithDoctor = async (req, res) => {
  try {
    const { userId } = req.body;
    const docId = req.docId;

    const chachedUserReportsWithDoctor = await client.get(
      `user-report-${userId}-${docId}`,
    );

    if (chachedUserReportsWithDoctor) {
      return res.json({
        success: true,
        userReport: JSON.parse(chachedUserReportsWithDoctor),
      });
    }
    const userReport = await reportModel.find({ userId, docId });

    if (!userReport) {
      return res.json({ success: false, message: "لا يوجد تقارير" });
    }

    if (userReport.length === 0) {
      return res.json({ success: true, message: "لا يوجد تقارير" });
    }

    await client.setEx(
      `user-report-${userId}-${docId}`,
      120,
      JSON.stringify(userReport),
    );
    res.status(200).json({ success: true, userReport });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// api controller to delete user report from doctor dashbord
const deletedReport = async (req, res) => {
  try {
    const { reportId } = req.body;

    const report = await reportModel.findById(reportId);

    if (report) {
      await reportModel.findByIdAndDelete(reportId);
      res.json({ success: true, message: "تم حذف التقرير بنجاح" });
    } else {
      res.json({ success: false, message: "هذا التقرير غير متاح" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to search about user from doctor dachbord

const searchUser = async (req, res) => {
  try {
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

    const users = appointments.map((a) => a.userData);
    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u._id || u.id || u.phone, u])).values(),
    );

    res.json({ success: true, users: uniqueUsers });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// get how many appointment for this use and report ---- with chached
const useDetails = async (req, res) => {
  try {
    const { userId } = req.body;

    const chachedUserDetalis = await client.get(`user-details-${userId}`);
    if (chachedUserDetalis) {
      console.log("بيانات المريض من الكاش");
      return res.json({
        success: true,
        userDetails: JSON.parse(chachedUserDetalis),
      });
    }

    const userAppointment = await appointmentModel.find({ userId });
    const userReport = await reportModel.find({ userId });

    const userDetails = {
      userAppointment: userAppointment.length,
      userReport: userReport.length,
    };

    await client.setEx(
      `user-details-${userId}`,
      120,
      JSON.stringify(userDetails),
    );

    res.json({ success: true, userDetails });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// create consultation with doctor when the appointment is completed
const createConsaltation = async (req, res) => {
  try {
    const { userId, consultDay, notes, appointmentId, amount } = req.body;
    const docId = req.docId;

    if (!consultDay) {
      return res.json({ success: false, message: "برجاء اختيار اليوم" });
    }

    // هات الـ appointment اللي الدكتور بعته
    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData) {
      return res.json({ success: false, message: "الحجز غير موجود" });
    }

    // تأكد إن الحجز ده يخص نفس المريض والدكتور
    if (
      appointmentData.userId.toString() !== userId ||
      appointmentData.docId.toString() !== docId
    ) {
      return res.json({
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
    const appointmentDate = new Date(`${day}-${month}-${year}`);
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
    res.json({ success: true, message: "تم إنشاء الاستشارة بنجاح" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// completed consultation with doctor
const consultationCompeleted = async (req, res) => {
  try {
    const { consultationId, userId } = req.body;
    const docId = req.docId;

    const consultation = await consultationModel.findById(consultationId);
    if (
      consultation &&
      consultation.docId.equals(docId) &&
      consultation.userId.equals(userId)
    ) {
      await consultationModel.findByIdAndUpdate(consultationId, {
        isCompleted: true,
      });
      res.json({ success: true, message: "تم الانتهاء من الاستشارة بنجاح" });
    } else {
      res.json({ success: false, message: "لم تنجح العملية" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api controller to cancel consultation from doctor
const cancelConsultation = async (req, res) => {
  try {
    const { consultationId, userId } = req.body;
    const docId = req.docId;

    const consultation = await consultationModel.findById(consultationId);
    if (
      consultation &&
      consultation.docId.equals(docId) &&
      consultation.userId.equals(userId)
    ) {
      await consultationModel.findByIdAndUpdate(consultationId, {
        cancelled: true,
      });
      res.json({
        success: true,
        message: `تم ألغاء 
        استشارة الماريض ${consultation.userData.name}`,
      });
    } else {
      res.json({ success: false, message: "لم تنجح العملية" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// get all consultation to doctor ---- with chached
const doctorConsultation = async (req, res) => {
  try {
    const docId = req.docId;

    const chachedConsultation = await client.get(
      `doctor-consultation-${docId}`,
    );
    if (chachedConsultation) {
      console.log("الاستشارة من الكاش");
      return res.json({
        success: true,
        consualtations: JSON.parse(chachedConsultation),
      });
    }

    const consualtations = await consultationModel.find({ docId });

    if (!consualtations) {
      res.json({ success: true, message: "لاتوجد أي استشارات حالياً" });
    }

    await client.setEx(
      `doctor-consultation-${docId}`,
      120,
      JSON.stringify(consualtations),
    );

    res.json({ success: true, consualtations });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
export {
  changeAvalibality,
  doctorList,
  loginDoctor,
  doctorAppointments,
  appointmentCompleted,
  appointmentCancel,
  doctorDashbord,
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
