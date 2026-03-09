import mongoose from "mongoose";

const appointmentSchema = mongoose.Schema({
  userId: { type: String, required: [true, "User id is required"] },
  docId: { type: String, required: [true, "Doctor id is required "] },
  slotDate: { type: String, required: [true, "slot date is required"] },
  slotTime: { type: String, required: [true, "slot time is required"] },
  userData: { type: Object, required: [true, "user data is required"] },
  docData: { type: Object, required: [true, "doctor data is required"] },
  amount: { type: Number, required: [true, "amount is required"] },
  date: { type: Number, required: [true, "date is required"] },
  cancelled: { type: Boolean, required: false },
  payment: { type: Boolean, required: false },
  isCompleted: { type: Boolean, required: false },
});

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
