import reportModel from "../models/reportModel";

export const createReport = (reportData) => {
  return reportModel.create(reportData);
};

export const findReportsByDoctor = (docId) => {
  return reportModel.find({ docId });
};

export const findReportById = (reportId) => {
  return reportModel.findById(reportId);
};

export const findUserReports = (userId, docId) => {
  return reportModel.find({ userId, docId });
};

export const updateReport = (reportId, data) => {
  return reportModel.findByIdAndUpdate(reportId, data, { new: true });
};

export const deleteReport = (reportId) => {
  return reportModel.findByIdAndDelete(reportId);
};
