import mongoose from "mongoose";

const reportSchema = mongoose.Schema({
  userId: { type: String, required: [true, "User id is required"] },
  docId: { type: String, required: [true, "Doctor id is required"] },
  appointmentId: { type: String, required: [true, "Appointment is required"] },
  userData: { type: Object, required: [true, "User data is required"] },
  appointmentData: {
    type: Object,
    required: [true, "Appointment data is required"],
  },

  docData: { type: Object, required: [true, "Doctor data is required"] },
  //visiDate :{type : Date , default : Date.now}
  complaint: { type: String, required: [true, "Complaint is required"] },
  examination: { type: String, required: [true, "Examination is required"] },
  diagnosis: { type: String, required: [true, "Diagnosis is required"] },
  treatment: [
    {
      name: { type: String, required: [true, "Treatment is required"] },
      dosage: { type: String },
      duration: { type: String },
    },
  ],
  notes: { type: String },
  nextVisit: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const reportModel =
  mongoose.models.report || mongoose.model("report", reportSchema);

export default reportModel;
