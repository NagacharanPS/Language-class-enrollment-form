const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const nodemailer = require("nodemailer");
const session = require("express-session");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");

const app = express();
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const db1 = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Naga@1975",
  database: "signup",
});

db1.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
  } else {
    console.log("Connected to database");
  }
});

// Fetch all registrations
app.get("/", (req, res) => {
  const sql = "SELECT * FROM registration";

  db1.query(sql, (err, data) => {
    if (err) {
      console.error("Error while fetching data from database:", err);
      return res.status(500).json({ message: "Error while fetching data" });
    }

    console.log("Data received from database:", data);
    return res.status(200).json({ message: data });
  });
});

// Signup route
app.post("/signup", (req, res) => {
  const values = {
    Username: req.body.name,
    Email: req.body.email,
    Password: req.body.password,
  };

  db1.query(
    "SELECT * FROM registration WHERE Username = ? OR Email = ?",
    [values.Username, values.Email],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Error during registration" });
      }

      if (results.length > 0) {
        const user = results[0];
        return res
          .status(409)
          .json({ message: "User already registered please login" });
      }

      // Insert new user
      const sql =
        "INSERT INTO registration (Username, Email, Password) VALUES (?, ?, ?)";

      db1.query(
        sql,
        [values.Username, values.Email, values.Password],
        (err) => {
          if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ message: "Error inserting data" });
          }

          console.log("Data inserted into database");
          res.status(200).json({ message: "Registration successful" });

          // Send email after response is sent
          const mailOptions = {
            from: "nodemailerservices@gmail.com",
            to: values.Email,
            subject: "Registration Notification",
            text: `Hello ${values.Username},\n\nYou have successfully registered.`,
          };

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error("Error sending mail:", err);
            } else {
              console.log("Email sent:", info.response);
            }
          });
        }
      );
    }
  );
});

//login route

let values;
let loginUser;

app.post("/login", (req, res) => {
  values = {
    email: req.body.email,
    password: req.body.password,
  };

  const sql =
    "select  Email, Username, Password from registration where Email = ? and Password = ?";

  db1.query(sql, [values.email, values.password], (err, results) => {
    if (err) {
      console.error("Error fetching login data from db:", err);
      return res
        .status(500)
        .json({ message: "Error fetching login data from db" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid Email or Password" });
    }

    loginUser = results[0];
    console.log("Login Successfull");

    res.status(200).json({ message: "Login Successful" });

    // Send email after response is sent
    const mailOptions = {
      from: "nodemailerservices@gmail.com",
      to: loginUser.Email,
      subject: "Login Notification",
      html: `<p>Hello ${loginUser.Username}<p/>
      <p>Your login successfull for language class registration<p/>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending login mail:", err);
      } else {
        console.log("Login mail sent:", info.response);
      }
    });
  });
});

app.post("/checkuser", (req, res) => {
  const username = req.body.name;
  const email = req.body.email;

  db1.query(
    "select Username, Email from registration where Username = ? and Email = ?",
    [username, email],
    (err, results) => {
      if (err) {
        console.error("Error while fetching login data by the server:", err);
        return res
          .status(500)
          .json({ message: "Error while fetching login data by the server" });
      } else if (results.length == 0) {
        console.log("User does not exists");
        return res.status(404).json({ message: "User does not exists" });
      } else {
        const user = results[0];
        return res.status(200).json({ message: user });
      }
    }
  );
});

app.post("/forgotpassword", (req, res) => {
  const values = {
    username: req.body.username,
    newPassword: req.body.newPassword,
    confirmPassword: req.body.confirmPassword,
  };

  const sql =
    "SELECT Username, Email, Password FROM registration WHERE Username = ?";

  db1.query(sql, [values.username], (err, results) => {
    if (err) {
      console.error("Error fetching user from DB:", err);
      return res.status(500).json({ message: "Error fetching user details" });
    }

    if (results.length === 0) {
      console.log("User does not exist");
      return res.status(404).json({ message: "User does not exist" });
    }

    const user = results[0];

    if (values.newPassword === user.Password) {
      console.log("New password cannot be the same as the old one");
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });
    }

    // Update the password
    const updateSql = "UPDATE registration SET Password = ? WHERE Username = ?";
    db1.query(updateSql, [values.newPassword, values.username], (err) => {
      if (err) {
        console.error("Error updating password in DB:", err);
        return res.status(500).json({ message: "Error updating password" });
      }

      console.log("Password updated successfully");

      // Sending notification email
      const mailOptions = {
        from: "nodemailerservices@gmail.com",
        to: user.Email,
        subject: "Password Change Notification",
        html: `<p>Hello ${user.Username},</p>
               <p>Your password has been changed successfully. Please login to continue.</p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending password change email:", error);
          return res.status(500).json({
            message: "Password changed but failed to send email",
          });
        }

        console.log("Password change email sent:", info.response);
        return res.status(200).json({
          message: "Password changed successfully and notification sent",
        });
      });
    });
  });
});

app.post("/signout", (req, res) => {
  const values = {
    email: req.body.email,
    password: req.body.password,
  };

  db1.query(
    "SELECT Username, Email FROM registration WHERE Email = ? AND Password = ?",
    [values.email, values.password],
    (err, results) => {
      if (err) {
        console.error("Error fetching signout data from db:", err);
        return res.status(500).json({ message: "Error during signout" });
      } else if (results.length === 0) {
        return res.status(404).json({ message: "User not exists" });
      } else {
        const signoutUser = results[0];
        db1.query(
          "DELETE FROM registration WHERE Email = ?",
          [values.email],
          (err) => {
            if (err) {
              console.error(
                "Error while deleting the user during signout operation",
                err
              );
              return res.status(500).json({
                message:
                  "Error while deleting the user during signout operation",
              });
            } else {
              const mailOptions = {
                from: "nodemailerservices@gmail.com",
                to: signoutUser.Email,
                subject: "Signout Notification",
                text: `Hello ${signoutUser.Username},\n\nYou have successfully signed out from your account.`,
              };

              transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                  console.error("Error sending signout mail:", err);
                } else {
                  console.log("Signout mail sent:", info.response);
                }
              });

              return res.status(200).json({ message: "Signout successful" });
            }
          }
        );
      }
    }
  );
});
// Logout route
app.post("/logout", (req, res) => {
  if (!loginUser.Username) {
    return res.status(401).json({ message: "User not logged in" });
  } else {
    res.status(200).json({ message: "Logout successful" });
    const mailOptions = {
      from: "nodemailerservices@gmail.com", // Replace with your email
      to: loginUser.Email,
      subject: "Logout Notification",
      text: `Hello ${loginUser.Username},\n\nYou have successfully logged out from your account.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending logout email:", err);
        return res.status(500).json({ message: "Error sending logout email" });
      } else {
        console.log("Logout email sent:", info.response);
        res.status(200).json({ message: "Logout successful" });
      }
    });
  }
});

// Start server
app.listen(8080, () => {
  console.log("Listening to port 8080");
});
