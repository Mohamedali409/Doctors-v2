import doctorModel from "../models/doctorModel";
import userModel from "../models/userModel";

export const getAllDoctors = () => {
  return doctorModel.find({}).select("-password -email");
};

export const findDoctorById = (docId) => {
  return doctorModel.findById(docId);
};

export const findDoctorByEmail = (email) => {
  return doctorModel.find(email);
};

export const updateDoctorById = (docId, data) => {
  return doctorModel.findByIdAndUpdate(docId, data, { new: true });
};

export const toggleAvailability = (docId, available) => {
  return doctorModel.findByIdAndUpdate(
    docId,
    { avalibale: !avalibale },
    { new: true },
  );
};

export const updateDoctorSlots = (docId, slots_booked) => {
  return doctorModel.findByIdAndUpdate(docId, { slots_booked }, { new: true });
};

export const clearDoctorSlots = (docId) => {
  return doctorModel.findByIdAndDelete(
    docId,
    { slots_booked: {} },
    { new: true },
  );
};
