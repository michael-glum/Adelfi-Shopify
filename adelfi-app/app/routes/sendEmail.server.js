import nodemailer from "nodemailer";
import { json } from "@remix-run/node";

const EMAIL_PASS = process.env.EMAIL_PASS;

export default async function sendEmail(shop, content, hasAttachment) {
    try {
        const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "mglum@adelfi.shop",
            pass: EMAIL_PASS,
        },
        });

        const subject = (hasAttachment) ? "Discounts for " + shop : "Commissions owed by " + shop;
        const text = (hasAttachment) ? "Shop: " + shop + "\n\n(Automatic Discount Generator)" 
            : "Shop: " + shop + "\nCommissions Owed: $" + content + "\n\n(Automatic Commission Tracker)";

        const mailOptions = (hasAttachment) ? {
        from: "mglum@adelfi.shop",
        to: "mglum@adelfi.shop",
        subject: subject,
        text: text,
        attachments: [
            {
            filename: shop + "_codes.txt",
            content: content.map(obj => JSON.stringify(obj)).join("\n"),
            }
        ]
        } : {
        from: "mglum@adelfi.shop",
        to: "mglum@adelfi.shop",
        subject: subject,
        text: text,
        };

        const info = await transporter.sendMail(mailOptions);
        return json({ message: "Email sent successfully", info });
    } catch (error) {
        console.error("Email sending failed", error);
        return json({ error: "Email sending failed", details: error });
    }
}