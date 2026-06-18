const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let feedbacks = []; 

app.post('/api/feedback', (req, res) => {
    const { employeeName, department, mealSession, rating, comments } = req.body;
    
    // Create specific date formats for accurate IST tracking and filtering
    const dateObj = new Date();
    const istDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Format: YYYY-MM-DD
    const istMonthStr = istDateStr.substring(0, 7); // Format: YYYY-MM
    
    const newFeedback = { 
        employeeName, 
        department, 
        mealSession, 
        rating, 
        comments, 
        timestamp: dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dateKey: istDateStr,
        monthKey: istMonthStr
    };
    
    feedbacks.push(newFeedback);

    if (rating <= 2) {
        triggerNegativeFeedbackAlert(newFeedback);
    }

    res.status(200).json({ message: 'Feedback successfully recorded!' });
});

// Updated PDF Generation Route with Filtering
app.get('/api/report/pdf', (req, res) => {
    const { date, month } = req.query;
    
    let filteredFeedbacks = feedbacks;
    let reportTitle = 'Samovar (All-Time Feedback)';

    // Filter logic based on Admin selection
    if (date) {
        filteredFeedbacks = feedbacks.filter(fb => fb.dateKey === date);
        reportTitle = `Samovar Daily Report: ${date}`;
    } else if (month) {
        filteredFeedbacks = feedbacks.filter(fb => fb.monthKey === month);
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
        doc.fontSize(12).font('Helvetica-Bold').text('Radisson Blu Plaza Hotel Mysore', { align: 'center' });
        doc.moveDown(2);
    }

    doc.fontSize(14).font('Helvetica-Bold').text(reportTitle, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });
    doc.moveDown(1.5);

    if (filteredFeedbacks.length === 0) {
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

        filteredFeedbacks.forEach((fb) => {
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
});

function triggerNegativeFeedbackAlert(feedback) {
    console.log('\n=============================================');
    console.log('🚨 URGENT: MOMENT MAKERS NEGATIVE ALERT 🚨');
    console.log(`Employee:     ${feedback.employeeName}`);
    console.log(`Comments:     "${feedback.comments}"`);
    console.log('=============================================\n');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running!`);
});