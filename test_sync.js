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
    .toLowerCase()
    .replace(/[^\w\s|()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function verifyHeaderMapping(fileHeaders) {
  const normalizedFileHeaders = fileHeaders.map((h) => normalizeLookup(h));
  const columnMap = new Map();
  const missingHeaders = [];

  STUDENT_TEMPLATE_COLUMNS.forEach((col) => {
    const normalizedTarget = normalizeLookup(col);
    const index = normalizedFileHeaders.indexOf(normalizedTarget);
    if (index !== -1) {
      columnMap.set(col, index);
    } else {
      missingHeaders.push(col);
    }
  });

  console.log('--- Header Mapping Test ---');
  console.log('Input Headers:', fileHeaders);
  if (missingHeaders.length > 0) {
    console.log('FAIL: Missing Headers:', missingHeaders);
  } else {
    console.log('SUCCESS: All headers mapped correctly.');
    columnMap.forEach((index, col) => {
      console.log(`  - ${col} -> Index ${index} (Value: "${fileHeaders[index]}")`);
    });
  }
}

// Test Case 1: Standard order
verifyHeaderMapping([...STUDENT_TEMPLATE_COLUMNS]);

// Test Case 2: Shuffled order with extra spaces and symbols
const shuffledHeaders = [
  '  First Name  ',
  'Last Name*',
  'Roll Number (ID)', // Note: parentheses are preserved by regex
  'Class Section',
  'Gender',
  'Status',
  'Blood Group ',
  'Date Of Birth',
  'Guardian Name',
  'Guardian Phone',
  'Guardian Email',
  'Address',
  'CNIC',
  'Phone',
  'Group',
  'Religion',
  'Admission Note'
];
verifyHeaderMapping(shuffledHeaders);

// Test Case 3: Missing a required header
const incompleteHeaders = ['Roll Number', 'First Name', 'Last Name'];
verifyHeaderMapping(incompleteHeaders);
