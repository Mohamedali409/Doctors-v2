import asyncHandler from "../utils/asyncHandler.js";
import * as consultationService from "../../services/consultationService.js";

// create consultation
export const createConsultation = asyncHandler(async (req, res) => {
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

// complete consultation
export const consultationCompleted = asyncHandler(async (req, res) => {
  const { consultationId, userId } = req.body;
  const docId = req.docId;

  const consultation = await consultationService.completeConsultation(
    consultationId,
    userId,
    docId,
  );

  res.status(200).json({
    success: true,
    message: "تم الانتهاء من الاستشارة بنجاح",
    consultation,
  });
});

// cancel consultation
export const cancelConsultation = asyncHandler(async (req, res) => {
  const { consultationId, userId } = req.body;
  const docId = req.docId;

  const consultation = await consultationService.cancelConsultation(
    consultationId,
    userId,
    docId,
  );

  res.status(200).json({
    success: true,
    message: `تم إلغاء استشارة المريض ${consultation.userData.name}`,
  });
});

// get doctor consultations
export const doctorConsultation = asyncHandler(async (req, res) => {
  const docId = req.docId;

  const consultations = await consultationService.getDoctorConsultations(docId);

  res.status(200).json({
    success: true,
    message: "All Doctor Consultations",
    consultations,
  });
});
