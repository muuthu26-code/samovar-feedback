const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Securely load the Firebase Key
let serviceAccount;
try {
    serviceAccount = require(process.env.RENDER ? '/etc/secrets/firebase-key.json' : './firebase-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Database connected successfully!");
} catch (err) {
    console.log("Waiting for secure Firebase key...");
}

const db = admin.firestore();

// Explicit Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Save Feedback permanently to Firebase
app.post('/api/feedback', async (req, res) => {
    const { employeeName, department, mealSession, rating, comments } = req.body;
    const dateObj = new Date();
    const istDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istMonthStr = istDateStr.substring(0, 7);

    const newFeedback = {
        employeeName, department, mealSession, rating, comments,
        timestamp: dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dateKey: istDateStr,
        monthKey: istMonthStr,
        createdAt: admin.firestore.FieldValue.serverTimestamp() 
    };

    try {
        await db.collection('feedbacks').add(newFeedback);
        
        if (rating <= 2) {
            console.log('\n=============================================');
            console.log('🚨 URGENT: MOMENT MAKERS NEGATIVE ALERT 🚨');
            console.log(`Employee:     ${employeeName}`);
            console.log(`Comments:     "${comments}"`);
            console.log('=============================================\n');
        }
        res.status(200).json({ message: 'Feedback permanently recorded!' });
    } catch (error) {
        console.error("Error saving to Firebase:", error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
});

// Generate PDF from Permanent Firebase Data
app.get('/api/report/pdf', async (req, res) => {
    const { date, month } = req.query;
    let reportTitle = 'Samovar (All-Time Feedback)';

    try {
        const snapshot = await db.collection('feedbacks').orderBy('createdAt', 'asc').get();
        let allFeedbacks = [];
        snapshot.forEach(doc => allFeedbacks.push(doc.data()));

        let filtered = allFeedbacks;
        
        if (date) {
            filtered = allFeedbacks.filter(fb => fb.dateKey === date);
            reportTitle = `Samovar Daily Report: ${date}`;
        } else if (month) {
            filtered = allFeedbacks.filter(fb => fb.monthKey === month);
            reportTitle = `Samovar Monthly Report: ${month}`;
        }

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Samovar_Report_${date || month || 'All'}.pdf`);
        
        doc.pipe(res);

        const logoPath = path.join(__dirname, 'public', 'logo.jpeg');
        try {
            doc.image(logoPath, (doc.page.width - 160) / 2, 25, { width: 160 });
            doc.y = 115;
        } catch (err) { 
            doc.y = 50; 
        }

        doc.fontSize(14).font('Helvetica-Bold').text(reportTitle, { align: 'center' });
        doc.fontSize(9).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });
        doc.moveDown(1.5);
        
        if (filtered.length === 0) {
            doc.moveDown(2);
            doc.fontSize(12).text('No feedback recorded for this selected period.', { align: 'center' });
        } else {
            const tableTop = 180;
            const padding = 10;
            
            const colTimeX = 30;     const colTimeW = 90;
            const colNameX = 125;    const colNameW = 85;
            const colDeptX = 215;    const colDeptW = 110;
            const colSessionX = 330; const colSessionW = 75;
            const colRatingX = 410;  const colRatingW = 40;
            const colCommentsX = 455;const colCommentsW = 110;

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Date & Time', colTimeX, tableTop);
            doc.text('Employee', colNameX, tableTop);
            doc.text('Department', colDeptX, tableTop);
            doc.text('Session', colSessionX, tableTop);
            doc.text('Rating', colRatingX, tableTop);
            doc.text('Comments', colCommentsX, tableTop);

            doc.moveTo(30, tableTop + 15).lineTo(565, tableTop + 15).strokeColor('#333333').lineWidth(1).stroke();

            doc.font('Helvetica').fontSize(9);
            let currentTop = tableTop + 25;

            filtered.forEach(fb => {
                const commentHeight = doc.heightOfString(fb.comments || '-', { width: colCommentsW });
                const rowHeight = Math.max(commentHeight, 25) + padding;

                if (currentTop + rowHeight > 750) {
                    doc.addPage();
                    currentTop = 50; 
                }

                doc.text(fb.timestamp, colTimeX, currentTop, { width: colTimeW });
                doc.text(fb.employeeName, colNameX, currentTop, { width: colNameW, ellipsis: true });
                doc.text(fb.department, colDeptX, currentTop, { width: colDeptW, ellipsis: true });
                doc.text(fb.mealSession, colSessionX, currentTop, { width: colSessionW });
                doc.text(`${fb.rating} / 5`, colRatingX, currentTop, { width: colRatingW });
                doc.text(fb.comments || '-', colCommentsX, currentTop, { width: colCommentsW });

                const lineY = currentTop + rowHeight - 5;
                doc.moveTo(30, lineY).lineTo(565, lineY).strokeColor('#cccccc').lineWidth(0.5).stroke();

                currentTop += rowHeight;
            });
        }
        doc.end();
    } catch (error) {
        console.error("Error pulling from Firebase:", error);
        res.status(500).send("Error generating report");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));