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
        employeeName, department, mealSession, rating, comments,
        timestamp: dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dateKey: istDateStr,
        monthKey: istMonthStr
    });
    res.status(200).json({ message: 'Feedback recorded!' });
});

// PDF Generation Route
app.get('/api/report/pdf', (req, res) => {
    const { date, month } = req.query;
    let filtered = feedbacks;
    if (date) filtered = feedbacks.filter(fb => fb.dateKey === date);
    else if (month) filtered = feedbacks.filter(fb => fb.monthKey === month);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Header Logic
    const logoPath = path.join(__dirname, 'public', 'logo.jpeg');
    try {
        doc.image(logoPath, (doc.page.width - 160) / 2, 25, { width: 160 });
        doc.y = 115;
    } catch (err) { doc.y = 50; }

    doc.fontSize(14).font('Helvetica-Bold').text('Samovar Report', { align: 'center' });
    doc.moveDown(1.5);
    
    // Table Rendering
    if (filtered.length === 0) doc.text('No feedback found.', { align: 'center' });
    else {
        filtered.forEach(fb => {
            doc.fontSize(9).text(`${fb.timestamp} | ${fb.employeeName} | ${fb.rating}/5`);
        });
    }
    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));