const functions = require("firebase-functions");
const {googleSheetCredential} = require("./config");
const {reply} = require("./helpers/line");
const {salaryMessage} = require("./helpers/line/messages");
const {getGoogleSheetData, appendGoogleSheetData} = require("./helpers/googlesheets");
const {validateRegistered, registerUser, logoutUser} = require("./helpers/firebase");

exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const {type, message, source: {userId: lineUserID}} = req.body.events[0];
    const isTextMessage = type === "message" && message.type === "text";

    if (isTextMessage) {
      const messageFromUser = message.text.trim();
      const checkRegister = messageFromUser.split("register:");
      const needToRegister = checkRegister && checkRegister[1];

      if (needToRegister) {
        const idCardForRegister = checkRegister[1].trim();
        const hasBeenRegistered = await validateRegistered(lineUserID);

        if (hasBeenRegistered) {
          return replyMessage(req.body, res, "ไม่สามารถลงทะเบียนซ้ำได้ กรุณาลงทะเบียนใหม่หลังจาก logout");
        }

        const employees = await getGoogleSheetData(googleSheetCredential.GOOGLE_SHEET, googleSheetCredential.RANGE);
        const hasEmployee = employees.values.some(([employeeIDCard]) => employeeIDCard === idCardForRegister);

        if (!hasEmployee) {
          return replyMessage(req.body, res, "เลขบัตรประชาชนไม่ตรงกับที่มีในระบบ");
        }

        await registerUser(lineUserID, idCardForRegister);
        return replyMessage(req.body, res, "ลงทะเบียนเรียบร้อย");
      } else {
        if (messageFromUser.startsWith("insert:")) {
          const insertData = messageFromUser.slice(7).split(",");
          if (insertData.length !== 5) {
            return replyMessage(req.body, res, "ข้อมูลไม่ถูกต้อง กรุณากรอกข้อมูลในรูปแบบ insert: <id_card>,<name>,<position>,<salary>,<overtime>");
          }
          const [idCard, name, position, salary, overtime] = insertData.map((item) => item.trim());
          const newRow = [idCard, name, position, salary, overtime];
          await appendGoogleSheetData(googleSheetCredential.GOOGLE_SHEET, googleSheetCredential.RANGE, [newRow]);
          return replyMessage(req.body, res, "ข้อมูลถูกเพิ่มลงใน Google Sheets เรียบร้อยแล้ว");
        }

        switch (messageFromUser) {
          case "register":
            return replyMessage(req.body, res, "กรุณากรอก register:เลขบัตรบัตรประชาชน เช่น register:1234567890123");
          case "insert":
            return replyMessage(req.body, res, "กรุณากรอกข้อมูล:เลขบัตรประชาชน,ชื่อนามสกุล,ตำแหน่ง,เงินเดือน,โอที เช่น insert:1234567890123,นายสมชาย ใจดี,ผู้จัดการ,50000,5000");
          case "salary":
            const hasBeenRegistered = await validateRegistered(lineUserID);

            if (!hasBeenRegistered) {
              return replyMessage(req.body, res, "กรุณาลงทะเบียนก่อนใช้งาน");
            }

            const {idCard} = hasBeenRegistered;
            const employees = await getGoogleSheetData(googleSheetCredential.GOOGLE_SHEET, googleSheetCredential.RANGE);
            const me = employees.values.find(([employeeIDCard]) => employeeIDCard === idCard);

            const salaryFlexMessage = salaryMessage(me);
            reply(req.body, salaryFlexMessage, "flex");
            return res.status(200).send("ok");
          case "logout":
            await logoutUser(lineUserID);
            return replyMessage(req.body, res, "ออกจากระบบเรียบร้อยแล้ว คุณสามารถลงทะเบียนใหม่ได้");
        }
      }
    }

    res.status(200).send("ok");
  } catch (error) {
    console.error(error.message);
    res.status(400).send("error");
  }
});

const replyMessage = (bodyRequest, res, message, type = "text") => {
  reply(bodyRequest, message, type);
  return res.status(200).send("ok");
};
