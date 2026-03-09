import appointmentModel from "../models/appointmentModel";

export const findAppointmentsByDoctor = (docId) => {
  return appointmentModel.find({ docId });
};

export const findAppointmentById = (appointmentId) => {
  return appointmentModel.find(appointmentId);
};

export const updateAppointment = (appointmentId, data) => {
  return appointmentModel.findByIdAndUpdate(appointmentId, data, { new: true });
};

export const completeAppointment = (appointmentId, slots_booked) => {
  return appointmentModel.findByIdAndUpdate(
    appointmentId,
    { slots_booked },
    { new: true },
  );
};

export const cancelAppointment = (appointmentId, slots_booked) => {
  return appointmentModel.findByIdAndUpdate(
    appointmentId,
    { slots_booked },
    { new: true },
  );
};

export const findAppointmentsByUser = (userId) => {
  return appointmentModel.find({ userId });
};
