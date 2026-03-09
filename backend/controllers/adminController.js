import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import consultationModel from "../models/consultationModel.js";
import reportModel from "../models/reportModel.js";

//API for adding a doctor
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experince,
      about,
      fees,
      address,
      phone,
      start_booked,
      consultation_fees,
    } = req.body;

    const imageFile = req.file;

    // check for all data to a doctor
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experince ||
      !about ||
      !fees ||
      !address ||
      !phone ||
      !start_booked ||
      !consultation_fees
    ) {
      return res.json({ success: false, message: "هنام بعض الحقول مفقودة" });
    }

    // check emali validation format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "من فضلك أدخل بريدألكتروني صالح",
      });
    }

    // adding stroning password
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "من فضلك أدخل كله سر  أكبر من 8  أحرف ",
      });
    }
    // hashing password to save in data base
    const slot = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, slot);

    // adding phone number
    if (password.length > 11) {
      return res.json({
        success: false,
        message: "من فضلك أدخل رقم هاتف بطريقه صحيحة",
      });
    }

    // upload image in cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    // adding doctor in data base and save it

    const doctorData = {
      name,
      email,
      password: hashPassword,
      image: imageUrl,
      speciality,
      degree,
      experince,
      about,
      fees,
      phone,
      consultation_fees,
      start_booked: JSON.parse(start_booked),
      address: JSON.parse(address),
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();
    res.json({ success: true, message: "تم أضاف الطبي بنجاح" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//get all doctor for admin list -----> dashbord

const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getAllAppointment = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({});

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: fales, message: error.message });
  }
};
// API for cancel appointment from admin dashbord
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    // releasing doctor slot

    const { docId, slotDate, slotTime } = appointmentData;

    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime,
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "تم ألغاء الحجز بنجاح" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get dashbord data to doctors & users & appointments
const adminDashbord = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});
    const consultations = await consultationModel.find({});
    const reporsts = await reportModel.find({});

    const dashData = {
      doctors: doctors.length,
      users: users.length,
      appointments: appointments.length,
      consultations: consultations.length,
      reporsts: reporsts.length,
      lastAppointment: appointments.reverse().slice(0, 5),
      lastConsultation: consultations.reverse().slice(0, 5),
    };
    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to remove doctors from admin dashbord
const removeDoctor = async (req, res) => {
  try {
    const { docId } = req.body;

    const doctorId = await doctorModel.findById(docId);
    if (doctorId) {
      await doctorModel.findByIdAndDelete(docId);
      res.json({ success: true, message: "Doctor deleted successfully " });
    } else {
      res.json({ success: false, message: "someting wrong" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: fales, message: error.message });
  }
};

// API to get all reports to admin dashbord
const getUserReportToAdmin = async (req, res) => {
  try {
    const reports = await reportModel.find({});
    if (reports) {
      res.json({ success: true, reports });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to delet report from admin dashbord
const deletedReportFromAdmin = async (req, res) => {
  try {
    const { reportId } = req.body;

    const report = await reportModel.findById(reportId);

    if (report) {
      await reportModel.findByIdAndDelete(reportId);
      res.json({ success: true, message: "تم الحذف بنجاح" });
    } else {
      res.json({ success: true, message: "هذا التقرير غير متاح" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//API to edit report from admin
const editReportFromAdmin = async (req, res) => {
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

//api to search about user from doctor dachbord

const searchUserFromAdmin = async (req, res) => {
  try {
    const { q } = req.body;

    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "query and doctor required" });
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
      new Map(
        users.map((u) => [u._id || u.nationaliId || u.phone, u]),
      ).values(),
    );

    res.json({ success: true, users: uniqueUsers });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// api to get user reports from the doctor
const getUserReportWithDoctorFromAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    const userReport = await reportModel.find({ userId });

    if (!userReport) {
      return res.json({ success: false, message: "لا يوجد تقارير" });
    }

    if (userReport.length === 0) {
      return res.json({ success: true, message: "لا يوجد تقارير" });
    }
    res.status(200).json({ success: true, userReport });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// api to get user reports from the Admin
const getUseruserAppointmentWithDoctorFromAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    const userAppointment = await appointmentModel.find({ userId });

    if (!userAppointment) {
      return res.json({ success: false, message: "لا يوجد تقارير" });
    }

    if (userAppointment.length === 0) {
      return res.json({ success: true, message: "لا يوجد تقارير" });
    }
    res.status(200).json({ success: true, userAppointment });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

//api to get all consultation from admin dashbord
const getAllConsultationToAdmin = async (req, res) => {
  try {
    const consultation = await consultationModel.find({});
    if (!consultation) {
      return res.json({ success: false, message: "لا توجد اي استشارات" });
    }
    res.json({ success: true, consultation });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to get user consultation from the admin
const getAllUserConsultationToAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const consultation = await consultationModel.find({ userId });

    if (!consultation) {
      return res.json({
        success: false,
        message: "this user don't have any consultations ",
      });
    }

    res.json({ success: true, consultation });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to canclled consultation from Admin bashbord
const cancelConsultation = async (req, res) => {
  try {
    const { consultationId, userId, docId } = req.body;

    const consultation = await consultationModel.findById(consultationId);
    if (
      consultation &&
      consultation.docId.equals(docId) &&
      consultation.userId.equals(userId)
    ) {
      await consultationModel.findByIdAndUpdate(consultationId, {
        cancelled: true,
      });
      return res.json({
        success: true,
        message: `تم ألغاء 
        استشارة الماريض ${consultation.userData.name}`,
      });
    } else {
      return res.json({ success: false, message: "لم تنجح العملية" });
    }

    // releasing doctor slot

    const { consultDay, consultTime } = consultation;

    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[consultDay] = slots_booked[consultDay].filter(
      (e) => e !== consultTime,
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const completedConsultation = async (req, res) => {
  try {
    const { consultationId, userId, docId } = req.body;

    const consultation = await consultationModel.findById(consultationId);
    if (
      consultation &&
      consultation.docId.equals(docId) &&
      consultation.userId.equals(userId)
    ) {
      await consultationModel.findByIdAndUpdate(consultationId, {
        isCompleted: true,
      });
      return res.json({
        success: true,
        message: `تم ألغاء 
        استشارة الماريض ${consultation.userData.name}`,
      });
    } else {
      return res.json({ success: false, message: "لم تنجح العملية" });
    }

    // releasing doctor slot

    const { consultDay, consultTime } = consultation;

    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[consultDay] = slots_booked[consultDay].filter(
      (e) => e !== consultTime,
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
export {
  addDoctor,
  loginAdmin,
  doctorList,
  getAllAppointment,
  cancelAppointment,
  adminDashbord,
  removeDoctor,
  cancelConsultation,
  getUserReportToAdmin,
  deletedReportFromAdmin,
  editReportFromAdmin,
  searchUserFromAdmin,
  getUserReportWithDoctorFromAdmin,
  getUseruserAppointmentWithDoctorFromAdmin,
  getAllUserConsultationToAdmin,
  completedConsultation,
  getAllConsultationToAdmin,
};
