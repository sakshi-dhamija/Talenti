const asyncHandler = require("express-async-handler");
const moment = require("moment");

const User = require("../models/user.model");
const Interview = require("../models/interview.model");
const isOverlaps = require("../config/isOverlaps");
const emailSender = require("../config/emailSender");

const addInterview = asyncHandler(async (req, res) => {
  let { startTime, endTime, usersInvited } = req.body;

  usersInvited = usersInvited.split(",");

  if (!startTime) {
    res.status(400);
    throw new Error("Start Time is not valid");
  }
  if (!endTime) {
    res.status(400);
    throw new Error("End Time is not valid");
  }
  if (!usersInvited) {
    res.status(400);
    throw new Error("usersInvited is not valid");
  }

  startTime = new Date(startTime);
  endTime = new Date(endTime);

  if (endTime < startTime) {
    res.status(400);
    throw new Error("End Time cannot be before Start Time");
  }

  if (startTime < Date.now()) {
    res.status(400);
    throw new Error("Start Time and date cannot be before current time");
  }

  if (usersInvited.length <= 1) {
    res.status(400);
    throw new Error("Atleast 2 participants should be selected");
  }

  const users = await User.find({ email: { $in: usersInvited } })
    .populate({
      path: "interviewsScheduled",
      model: "Interview",
      select: "startTime endTime",
    })
    .lean()
    .exec()
 
  for (let user of users) {
    user?.interviewsScheduled.forEach((interview) => {
      if (
        isOverlaps(interview.startTime, interview.endTime, startTime, endTime)
      ) {
        res.status(400);
        throw new Error(
          `User, ${user.email} is already having an interview scheduled at this time. Please select another time.`
        );
      }
    });
  }

  const userIds = [];
  const userNames = [];
  for (let user of users) {
    userIds.push(user._id);
    userNames.push(user.name);
  }
  
  const url = req.protocol + "://" + req.get("host");

  const newInterview = {
    userNames,
    startTime,
    endTime,
    usersInvited: userIds,
  };

  if (req.file) {
    newInterview.resume = url + "/public/resumes/" + req.file.filename;
  }

  let interview = new Interview(newInterview);

  interview = await interview.save();

  for (let user of users) {
    await User.updateOne(
      { _id: user._id },
      { $push: { interviewsScheduled: interview._id } }
    );
  }


  usersInvited.forEach((userMail) => {
    emailSender({
      email: userMail,
      subject: `ICP - Interview @ ${moment(startTime).format(
        "DD-MM-YYYY"
      )}, ${moment(startTime).format("hh:mm A")} - ${moment(endTime).format(
        "hh:mm A"
      )}`,
      body: `Hi, The Interview is scheduled on ${moment(startTime).format(
        "DD-MM-YYYY"
      )}, Time: ${moment(startTime).format("hh:mm A")} - ${moment(
        endTime
      ).format("hh:mm A")}`,
    });
  });

  res.status(201).json({
    message: "Interview added!",
  });
});

const getUpcomingInterviews = asyncHandler(async (req, res) => {
  console.log(req.body);
  let interviews = await Interview.find({ startTime: { $gte: new Date() } })
    .populate({ path: "usersInvited", model: "User", select: "email -_id" })
    .lean()
    .exec();
  console.log(interviews[0]?.usersInvited[0]);
  if (Object.keys(interviews).length === 0) interviews = [];

  res.status(200).json({
    interviews,
  });
});

const getInterviewById = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  const interview = await Interview.findById(interviewId)
    .populate({ path: "usersInvited", model: "User", select: "email -_id" })
    .lean()
    .exec();

  if (!interview) {
    res.status(404);
    throw new Error("Interview not found");
  }

  res.status(200).json({ interview });
});

const updateInterviewDetails = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  let { startTime, endTime, usersInvited } = req.body;
console.log("checking update");
console.log(req.body);
  if (!startTime) {
    res.status(400);
    throw new Error("Start Time is not valid");
  }
  if (!endTime) {
    res.status(400);
    throw new Error("End Time is not valid");
  }
  if (!usersInvited) {
    res.status(400);
    throw new Error("usersInvited is not valid");
  }

  startTime = new Date(startTime);
  endTime = new Date(endTime);

  if (endTime < startTime) {
    res.status(400);
    throw new Error("End Time cannot be before Start Time");
  }

  if (startTime < Date.now()) {
    res.status(400);
    throw new Error("Start Time cannot be before current time");
  }

  if (usersInvited.length <= 1) {
    res.status(400);
    throw new Error("Total users invited should be atleast ");
  }

  const users = await User.find({ name: { $in: usersInvited } })
    .populate({
      path: "interviewsScheduled",
      model: "Interview",
      select: "startTime endTime",
    })
    .lean()
    .exec();

  for (let user of users) {
    user?.interviewsScheduled.forEach((interview) => {
      if (
        interview._id.toString() !== interviewId &&
        isOverlaps(interview.startTime, interview.endTime, startTime, endTime)
      ) {
        res.status(400);
        throw new Error(
          `User, ${user.name} is already having an interview scheduled at this time. Please select another time.`
        );
      }
    });
  }

  // remove this interviewId from users which are no longer participants.
  const oldInterview = await Interview.findById(interviewId)
    .populate({ path: "usersInvited", model: "User", select: "name" })
    .select("usersInvited")
    .lean()
    .exec();
  const { usersInvited: oldUsersInvited } = oldInterview;

  oldUsersInvited.forEach(async (user) => {
    if (!usersInvited.includes(user.email)) {
      const updatedUser = await User.updateOne(
        { _id: user._id },
        { $pull: { interviewsScheduled: interviewId } },
        { new: true }
      );
    }
  });

  // add this interviewId to users
  usersInvited.forEach(async (userEmail) => {
    await User.updateOne(
      { email: userEmail, interviewsScheduled: { $ne: interviewId } },
      { $addToSet: { interviewsScheduled: interviewId } }
    );
  });

  const userIds = [];
  for (let user of users) {
    userIds.push(user._id);
  }

  await Interview.updateOne(
    { _id: interviewId },
    { startTime, endTime, usersInvited: userIds }
  );


  usersInvited.forEach((userMail) => {
    emailSender({
      email: userMail,
      subject: `UPDATED: ICP - Interview @ ${moment(startTime).format(
        "DD-MM-YYYY"
      )}, ${moment(startTime).format("hh:mm A")} - ${moment(endTime).format(
        "hh:mm A"
      )}`,
      body: `Hi, The updated Interview is scheduled on ${moment(
        startTime
      ).format("DD-MM-YYYY")}, Time: ${moment(startTime).format(
        "hh:mm A"
      )} - ${moment(endTime).format("hh:mm A")}`,
    });
  });

  res.status(200).json({
    message: "Successfully updated.",
  });
});

module.exports = {
  addInterview,
  getUpcomingInterviews,
  getInterviewById,
  updateInterviewDetails,
};
