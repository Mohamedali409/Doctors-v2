import consultationModel from "../models/consultationModel";
import AppError from "../utils/AppErrors";

export const createConsultation = (data) => {
  return consultationModel.create(data);
};

export const findConsultationsByDoctor = (docId) => {
  return consultationModel.find({ docId });
};

export const findConsultationById = (consultationId) => {
  return consultationModel.find(consultationId);
};

export const updateConsultation = (consultationId, data) => {
  return consultationModel.findByIdAndUpdate(consultationId, data, {
    new: true,
  });
};

export const completeConsultation = (consultationId) => {
  return consultationModel.findByIdAndUpdate(
    consultationId,
    {
      isCompleted: true,
    },
    { new: true },
  );
};

export const cancelConsultation = (consultationId) => {
  return consultationModel.findByIdAndUpdate(
    consultationId,
    {
      cancelled: true,
    },
    { new: true },
  );
};
