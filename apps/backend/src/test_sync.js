const XLSX = require('xlsx');

const STUDENT_TEMPLATE_COLUMNS = [
  'Roll Number',
  'First Name',
  'Last Name',
  'Class Section',
  'Gender',
  'Date Of Birth',
  'Blood Group',
  'Guardian Name',
  'Guardian Phone',
  'Guardian Email',
  'Address',
  'Status',
  'CNIC',
  'Phone',
  'Group',
  'Religion',
  'Admission Note',
];

function normalizeLookup(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
}

function buildClassSectionLabel(className, sectionName, classCode) {
    const codePart = classCode ? ` (${classCode})` : ''
    return `${className}${codePart} | ${sectionName}`
}

async function testLoop() {
    // 1. Export logic simulation
    const rows = [{
        'Roll Number': 'STU-001',
        'First Name': 'Ali',
        'Last Name': 'Khan',
        'Class Section': buildClassSectionLabel('Class 1', 'Section A', 'C1'),
        Gender: 'MALE',
        'Date Of Birth': '2010-01-01',
        'Blood Group': 'O+',
        'Guardian Name': 'Parent',
        'Guardian Phone': '123',
        'Guardian Email': 'email',
        Address: 'address',
        Status: 'ACTIVE',
        CNIC: 'cnic',
        Phone: 'phone',
        Group: 'group',
        Religion: 'religion',
        'Admission Note': 'note',
    }];

    const workbook = XLSX.utils.book_new();
    const studentSheet = XLSX.utils.json_to_sheet(rows, { header: [...STUDENT_TEMPLATE_COLUMNS] });
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'Students');
    
    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 2. Import logic simulation
    const readWb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = readWb.Sheets['Students'];
    const sheetRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    
    const headerRow = sheetRows[0] || [];
    console.log('Detected Headers:', headerRow);
    
    const normalizedHeaders = new Set(headerRow.map((cell) => normalizeLookup(cell)));
    const missingHeaders = STUDENT_TEMPLATE_COLUMNS.filter(
      (column) => !normalizedHeaders.has(normalizeLookup(column)),
    );

    if (missingHeaders.length > 0) {
        console.error('FAILED! Missing headers:', missingHeaders);
    } else {
        console.log('SUCCESS! All headers found.');
    }
}

testLoop();
