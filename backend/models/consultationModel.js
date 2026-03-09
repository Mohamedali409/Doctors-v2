import mongoose from "mongoose";

const consultationSchema = mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.ObjectId,
    ref: "appointment",
    required: true,
  },
  appointmentData: {
    type: Object,
    required: [true, "appointment is required"],
  },
  docId: {
    type: mongoose.Schema.ObjectId,
    ref: "doctor",
    required: [true, "Doctor id is required"],
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "user",
    required: [true, "user id is required"],
  },
  userData: { type: Object, required: [true, "user data is required"] },
  docData: { type: Object, required: [true, "Doctor Data is required"] },
  consultDay: { type: String, required: [true, "consul date is required"] },
  consultTime: { type: String },
  amount: { type: Number, required: [true, "Amount is required"] },
  isCompleted: { type: Boolean, default: false },
  cancelled: { type: Boolean, required: false },
  notes: { type: String, required: false },
});

const consultationModel =
  mongoose.models.consultation ||
  mongoose.model("consultation", consultationSchema);

export default consultationModel;
