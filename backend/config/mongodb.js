// import mongoose from "mongoose";

// const connectDB = async () => {
//   mongoose.connection.on("connected", () => console.log("Database Connected"));

//   await mongoose.connect(`${process.env.MONGODB_URL}/prescripto`);
// };

// export default connectDB;

import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URL, {
      dbName: "prescripto",
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
};

export default connectDB;
