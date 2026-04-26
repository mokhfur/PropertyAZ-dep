import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  // Automated Reminder Logic
  async function checkUnsignedLeases() {
    console.log("Checking for unsigned leases...");
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const leasesRef = db.collection("leases");
      const snapshot = await leasesRef
        .where("status", "==", "pending_tenant")
        .where("reminderSent", "==", false)
        .where("createdAt", "<=", sevenDaysAgo.toISOString())
        .get();

      if (snapshot.empty) {
        console.log("No pending leases found for 7-day reminder.");
        return;
      }

      console.log(`Found ${snapshot.size} leases requiring reminders.`);

      for (const doc of snapshot.docs) {
        const lease = doc.data();
        const tenantId = lease.tenant;
        
        // Fetch tenant email
        const tenantDoc = await db.collection("users").doc(tenantId).get();
        if (!tenantDoc.exists) {
          console.warn(`Tenant ${tenantId} not found for lease ${doc.id}`);
          continue;
        }
        
        const tenantData = tenantDoc.data();
        const email = tenantData?.email;

        if (email && resend) {
          try {
            await resend.emails.send({
              from: "PropertyAZ <notifications@resend.dev>",
              to: email,
              subject: "URGENT: Your Lease Agreement is Awaiting Signature",
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #0f172a;">Lease Agreement Reminder</h2>
                  <p>Hello ${tenantData?.firstName || 'Tenant'},</p>
                  <p>This is an automated reminder regarding the lease agreement initiated on <strong>${new Date(lease.createdAt).toLocaleDateString()}</strong>.</p>
                  <p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; color: #991b1b;">
                    <strong>Urgency:</strong> Our records show that you have not yet signed this agreement. Please review and sign the contract as soon as possible to secure your rental.
                  </p>
                  <p>You can view and sign your contract by logging into your dashboard and visiting the Contracts page.</p>
                  <div style="margin-top: 32px; text-align: center;">
                    <a href="${process.env.APP_URL || 'http://localhost:3000'}/contracts" 
                       style="background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                      Go to Contracts
                    </a>
                  </div>
                  <p style="margin-top: 32px; font-size: 0.8rem; color: #64748b;">
                    If you have already signed this agreement, please ignore this email.
                  </p>
                </div>
              `
            });
            
            // Mark as reminder sent
            await doc.ref.update({ reminderSent: true });
            console.log(`Reminder sent to ${email} for lease ${doc.id}`);
          } catch (err) {
            console.error(`Failed to send email to ${email}:`, err);
          }
        } else if (!resend) {
          console.warn("Resend not configured, skipping email for", email);
          // Still mark as sent in demo mode to avoid local logs flooding? 
          // Actually, let's just log it.
        }
      }
    } catch (error) {
      console.error("Error in checkUnsignedLeases:", error);
    }
  }

  // Run initial check and then every hour
  checkUnsignedLeases();
  setInterval(checkUnsignedLeases, 60 * 60 * 1000);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!resend) {
      console.warn("RESEND_API_KEY not set. Email not sent.");
      return res.status(200).json({ success: true, message: "Email simulation successful (API key missing)" });
    }

    try {
      const data = await resend.emails.send({
        from: "PropertyAZ <notifications@resend.dev>",
        to,
        subject,
        html,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
