// import express, { json } from "express";
// import cors from "cors";
// import "dotenv/config";
// import connectDB from "./config/mongodb.js";
// //import { rateLimit } from "express-rate-limit";
// import connectCloudinary from "./config/cloudinary.js";
// import helmet from "helmet";
// import { sanitizeMiddleware } from "./middlewares/sanitize.js";

// import adminRouter from "./routers/adminRouter.js";
// import doctorRouter from "./routers/doctorRouter.js";
// import userRouter from "./routers/userRouter.js";
// import { normalLimiter } from "./middlewares/rateLimiting.js";
// //import client from "./config/redisClient.js";

// const app = express();
// const port = process.env.PORT || 4000;

// // ✅ CORS لازم يكون أول حاجة بعد إنشاء app
// app.use(cors({
//   origin: [
//     "http://localhost:5173",                 // Vite local
//     "https://slamtak.vercel.app"   // Frontend على Vercel
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// }));

// // app.options("*", cors()); // 👈 مهم جدًا لـ preflight

// connectDB();
// connectCloudinary();


// // middelwares
// app.use(express.json());
// //app.use(limiter);
// app.use(helmet());
// app.use(sanitizeMiddleware);

// //api endpoint
// app.use("/api/admin", adminRouter);
// // localhost:4000/api/admin/add-doctor

// app.use("/api/doctor", normalLimiter, doctorRouter);

// app.use("/api/user", userRouter);

// app.listen(port, () => {
//   console.log(`Server starting in port ${port}`);
// });

import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import helmet from "helmet";
import { sanitizeMiddleware } from "./middlewares/sanitize.js";

import adminRouter from "./routers/adminRouter.js";
import doctorRouter from "./routers/doctorRouter.js";
import userRouter from "./routers/userRouter.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://slamtak.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(helmet());
app.use(sanitizeMiddleware);

// ✅ اتصال مرة واحدة
connectDB();
connectCloudinary();

app.get("/", (req, res) => {
  res.send("Srever is working");
});

// test route
app.get("/api/test", (req, res) => {
  res.json({ ok: true });
});

// routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);

app.listen(port, () => {
  console.log(`Server starting in port ${port}`);
});

// export default app;
