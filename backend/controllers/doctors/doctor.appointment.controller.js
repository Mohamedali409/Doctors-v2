import asyncHandler from "../utils/asyncHandler.js";
import * as appointmentService from "../../services/appointmentService.js";

// api to get doctor all appointments
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

// this controller do --> the doctor can completed appointment
const appointmentCompleted = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  await appointmentService.completeAppointment(docId, appointmentId);

  res.status(200).json({
    success: true,
    message: `أكتمل كشف من قبل الطبيب`,
  });
});

// this controller do --> the doctor can cancelled appointment
const appointmentCancel = asyncHandler(async (req, res, next) => {
  const { docId, appointmentId } = req.body;

  await appointmentService.cancelAppointment(docId, appointmentId);

  res.status(200).json({
    success: true,
    message: `تم ألغاء الكشف من قبل ال ${appointmentData.docData.name}`,
  });
});

export { doctorAppointments, appointmentCompleted, appointmentCancel };
