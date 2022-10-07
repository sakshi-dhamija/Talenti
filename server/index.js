const path = require("path");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const initializeDBConnection = require("./config/db.connect");
const errorHandlerRoute = require("./middlewares/errorHandler");
const interviewRouter = require("./routers/interview.router");
const userRouter = require("./routers/user.router");

const importData = require("./seeder");
const constants = require("./config/constant");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression()); 
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

initializeDBConnection();
importData();

app.use("/api/interviews", interviewRouter);
app.use("/api/users", userRouter);

app.get("/", (req, res) => {
  res.send("Hey, Welcome to the backend!");
});

app.use(errorHandlerRoute.notFound);
app.use(errorHandlerRoute.errorHandler);

app.listen(constants.general.PORT, () => {
  console.log("Backend Server is running.");
});
