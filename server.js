const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Set up the static directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicit Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Explicit Admin Route (No .html needed in URL)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Feedback Submission Logic
let feedbacks = [];
app.post('/api/feedback', (req, res) => {
    const { employeeName, department, mealSession, rating, comments } = req.body;
    const dateObj = new Date();
    const istDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istMonthStr = istDateStr.substring(0, 7);

    feedbacks.push({
        employeeName, 
        department, 
        mealSession, 
        rating, 
        comments, // Ensuring comment data is saved to memory
        timestamp: dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dateKey: istDateStr,
        monthKey: istMonthStr
    });

    if (rating <= 2) {
        console.log('\n=============================================');
        console.log('🚨 URGENT: MOMENT MAKERS NEGATIVE ALERT 🚨');
        console.log(`Employee:     ${employeeName}`);
        console.log(`Comments:     "${comments}"`);
        console.log('=============================================\n');
    }

    res.status(200).json({ message: 'Feedback recorded!' });
});

// PDF Generation Route
app.get('/api/report/pdf', (req, res) => {
    const { date, month } = req.query;
    let filtered = feedbacks;
    let reportTitle = 'Samovar (All-Time Feedback)';

    if (date) {
        filtered = feedbacks.filter(fb => fb.dateKey === date);
        reportTitle = `Samovar Daily Report: ${date}`;
    } else if (month) {
        filtered = feedbacks.filter(fb => fb.monthKey === month);
        reportTitle = `Samovar Monthly Report: ${month}`;
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Samovar_Report_${date || month || 'All'}.pdf`);
    
    doc.pipe(res);

    // Header Logic
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
    
    // Table Rendering
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
            
            // CRITICAL FIX: The comments are explicitly printed here, properly wrapped
            doc.text(fb.comments || '-', colCommentsX, currentTop, { width: colCommentsW });

            const lineY = currentTop + rowHeight - 5;
            doc.moveTo(30, lineY).lineTo(565, lineY).strokeColor('#cccccc').lineWidth(0.5).stroke();

            currentTop += rowHeight;
        });
    }
    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));