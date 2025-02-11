const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");

const app = express();
app.use(cors());

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db2 = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Naga@1975",
  database: "enrollment",
});

db2.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to database");
  }
});

app.post("/enrollment", (req, res) => {
  let values = {
    name: req.body.name,
    date: req.body.date,
    gender: req.body.gender,
    address: req.body.address,
    phonenumber: req.body.phonenumber,
    email: req.body.email,
    spanish: req.body.spanish || false,
    french: req.body.french || false,
    german: req.body.german || false,
    italian: req.body.italian || false,
    mandarin: req.body.mandarin || false,
    schedule: req.body.schedule,
    format: req.body.format,
  };

  db2.query(
    "SELECT * FROM studentInfo WHERE Name = ? OR Email = ?",
    [values.name, values.email],
    (err, results) => {
      if (err) {
        console.error("Error while selecting from database:", err);
        return res.status(500).json({
          message: "Error checking existing user in the database",
        });
      }

      //check if user already exists
      else if (results.length > 0) {
        const existingUser = results[0];
        if (
          existingUser.Name === values.name &&
          existingUser.Email === values.email
        ) {
          return res.status(409).json({
            message: "User already registered with this email and username",
          });
        }
      }

      // ✅ If no user exists, insert the data
      const sql =
        "INSERT INTO studentinfo (Name, Date, Gender, Address, PhoneNumber, Email, Spanish, French, German, Italian, Mandarin, Schedule, Format) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

      db2.query(
        sql,
        [
          values.name,
          values.date,
          values.gender,
          values.address,
          values.phonenumber,
          values.email,
          values.spanish,
          values.french,
          values.german,
          values.italian,
          values.mandarin,
          values.schedule,
          values.format,
        ],
        (err) => {
          if (err) {
            console.error("Error inserting data into database:", err);
            return res.status(500).json({ message: "Error inserting data" });
          }

          console.log("Data inserted into database");
          return res
            .status(200)
            .json({ message: "Data inserted successfully" });
        }
      );

      db2.query(
        "SELECT * FROM studentInfo WHERE Name=? AND `Date`=? AND Gender=? AND Address=? AND PhoneNumber=? AND Email=? AND Spanish=? AND French=? AND German=? AND Italian=? AND Mandarin=? AND Schedule=? AND Format=?",
        [
          values.name,
          values.date,
          values.gender,
          values.address,
          values.phonenumber,
          values.email,
          values.spanish,
          values.french,
          values.german,
          values.italian,
          values.mandarin,
          values.schedule,
          values.format,
        ],

        (err, results) => {
          if (err) {
            console.error(
              "Error while selecting language form data from db:",
              err
            );
            return res.status(500).json({
              message: "Error while selecting language form data from db",
            });
          } else if (results.length > 0) {
            const user = results[0];

            const mailOptions = {
              from: "nodemailerservices@gmail.com",
              to: user.Email,
              subject: "Language Class Enrollment",
              text: ` Hello ${user.Name},\n\n You have successfully registered for language class.\n\n This is your registered data.\n\n Participant Name: ${user.Name}\n Date of Birth: ${user.Date}\n Gender: ${user.Gender}\n Address: ${user.Address}\n Phone Number: ${user.PhoneNumber}\n Email: ${user.Email}\n Language: Spanish: ${user.Spanish}, French: ${user.French}, German: ${user.German}, Italian: ${user.Italian}, Mandarin: ${user.Mandarin}\n Schedule: ${user.Schedule}\n Format: ${user.Format}\n\n If this was not you, please contact us immediatly.`,
            };
            transporter.sendMail(mailOptions, (err, res) => {
              if (err) {
                console.error("Error while sending mail");
              } else {
                console.log("Email sent:", res);
              }
            });
          }
        }
      );
    }
  );
});

app.listen(7070, () => {
  console.log("Listening to port 7070");
});
