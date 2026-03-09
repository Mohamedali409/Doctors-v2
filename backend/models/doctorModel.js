import mongoose from "mongoose";
import bcrypt from "bcrypt";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"] },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email should be unique"],
    },
    password: { type: String, required: [true, "Password is required"] },
    confirmPassword: {
      type: String,
      required: [true, "Confirm Password is required"],
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: "Password are not match",
      },
      select: false,
    },
    image: { type: String, required: [true, "image is required"] },
    phone: { type: String, default: "00000000000" },
    speciality: { type: String, required: [true, "Spreciality is required"] },
    degree: { type: String, required: [true, "Doctor degree is required"] },
    experince: {
      type: String,
      required: [true, "Doctor Expreince is required"],
    },
    about: { type: String, required: [true, "Doctor about is required"] },
    avalibale: {
      type: Boolean,
      default: [true, "doctor avalibale is required "],
    },
    fees: { type: Number, required: [true, "Doctor fees is required"] },
    consultation_fees: {
      type: Number,
      required: [true, "Doctor consultation fees is required"],
    },
    address: { type: Object, required: [true, "Doctor address is required "] },
    date: { type: Number, required: [true, "doctor date is required"] },
    slots_booked: { type: Object, default: {} },
    start_booked: {
      from: {
        type: Number,
        required: [true, "Doctor start booked is required"],
        default: 9,
      },
      to: {
        type: Number,
        required: [true, "Doctor end booked is required"],
        default: 16,
      },
      booking_period: {
        type: Number,
        required: [true, "Doctor booked period is required"],
        default: 15,
      },
    },
  },
  { minimize: false },
);

doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.confirmPassword = undefined;
  next();
});

doctorSchema.methods.comparePassword = async function (passwordDoctorEnter) {
  return await bcrypt.compare(this.password, passwordDoctorEnter);
};
const doctorModel =
  mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

export default doctorModel;
