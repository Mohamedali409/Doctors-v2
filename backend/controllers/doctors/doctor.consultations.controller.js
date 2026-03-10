import appointmentModel from "../models/appointmentModel.js";
import consultationModel from "../models/consultationModel.js";
import client from "../config/redisClient.js";
import asyncHandler from "../utils/asyncHandler.js";

// import * as consultationService from "../services/consultationService.js";

// create consultation with doctor when the appointment is completed
const createConsultation = asyncHandler(async (req, res, next) => {
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
const consultationCompleted = asyncHandler(async (req, res, next) => {
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
  createConsultation,
  doctorConsultation,
  cancelConsultation,
  doctorConsultation,
};
