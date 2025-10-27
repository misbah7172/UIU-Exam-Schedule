// Global variables
let examData = [];
let selectedCourses = [];
let currentSortField = 'course';
let currentSortOrder = 'asc';
let isFullRoutineVisible = false;
let studentIdConfirmed = false;
let confirmedStudentId = '';

// DOM elements
const fileInput = document.getElementById('excelFile');
const uploadBtn = document.getElementById('uploadBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const tableContainer = document.getElementById('tableContainer');
const examTable = document.getElementById('examTable');
const examTableBody = document.getElementById('examTableBody');
const examCount = document.getElementById('examCount');
const controls = document.getElementById('controls');
const sortBySelect = document.getElementById('sortBy');
const sortOrderSelect = document.getElementById('sortOrder');
const clearBtn = document.getElementById('clearBtn');
const loading = document.getElementById('loading');
const toggleRoutineBtn = document.getElementById('toggleRoutineBtn');

// Student ID elements
const studentIdSection = document.getElementById('studentIdSection');
const studentId = document.getElementById('studentId');
const confirmStudentIdBtn = document.getElementById('confirmStudentIdBtn');

// PDF Upload elements
const pdfUploadSection = document.getElementById('pdfUploadSection');
const classRoutinePdf = document.getElementById('classRoutinePdf');
const extractCoursesBtn = document.getElementById('extractCoursesBtn');
const extractionProgress = document.getElementById('extractionProgress');

// Search elements
const searchSection = document.getElementById('searchSection');
const courseSearch = document.getElementById('courseSearch');
const courseSection = document.getElementById('courseSection');
const searchSuggestions = document.getElementById('searchSuggestions');
const addCourseBtn = document.getElementById('addCourseBtn');
const selectedCoursesSection = document.getElementById('selectedCoursesSection');
const selectedCoursesDiv = document.getElementById('selectedCourses');
const clearSelectedBtn = document.getElementById('clearSelectedBtn');
const downloadTimetableBtn = document.getElementById('downloadTimetableBtn');

// Track selected course for section population
let selectedCourseForSection = null;

// Event listeners
fileInput.addEventListener('change', handleFileSelect);
uploadBtn.addEventListener('click', handleFileUpload);
clearBtn.addEventListener('click', clearData);
sortBySelect.addEventListener('change', handleSort);
sortOrderSelect.addEventListener('change', handleSort);
toggleRoutineBtn.addEventListener('click', toggleFullRoutine);

// Student ID event listeners
studentId.addEventListener('input', handleStudentIdInput);
confirmStudentIdBtn.addEventListener('click', confirmStudentId);

// PDF Upload event listeners
classRoutinePdf.addEventListener('change', handlePdfSelect);
extractCoursesBtn.addEventListener('click', extractCoursesFromPdf);

// Search event listeners
courseSearch.addEventListener('input', handleCourseSearch);
courseSearch.addEventListener('keydown', handleSearchKeydown);
courseSection.addEventListener('change', handleCourseSectionInput);
addCourseBtn.addEventListener('click', addSelectedCourse);
clearSelectedBtn.addEventListener('click', clearSelectedCourses);
downloadTimetableBtn.addEventListener('click', downloadTimetablePDF);

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
    if (!courseSearch.contains(event.target) && !searchSuggestions.contains(event.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

// Add click listeners to table headers for sorting
document.querySelectorAll('th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
        const sortField = header.getAttribute('data-sort');
        if (currentSortField === sortField) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = sortField;
            currentSortOrder = 'asc';
        }
        sortBySelect.value = currentSortField;
        sortOrderSelect.value = currentSortOrder;
        sortData();
        updateTable();
        updateSortIndicators();
    });
});

function handleFileSelect() {
    const file = fileInput.files[0];
    uploadBtn.disabled = !file;
    hideMessages();
}

function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) {
        showError('Please select a file first.');
        return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/)) {
        showError('Please select a valid Excel file (.xlsx or .xls).');
        return;
    }

    parseExcelFile(file);
}

function parseExcelFile(file) {
    showLoading(true);
    hideMessages();

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first worksheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length === 0) {
                throw new Error('Excel file is empty or invalid.');
            }

            processExcelData(jsonData);
            showSuccess(`Successfully loaded ${examData.length} exam records.`);
            
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            showError('Error parsing Excel file: ' + error.message);
        } finally {
            showLoading(false);
        }
    };

    reader.onerror = function() {
        showError('Error reading file. Please try again.');
        showLoading(false);
    };

    reader.readAsArrayBuffer(file);
}

function processExcelData(jsonData) {
    examData = [];
    
    // Find header row (look for common exam schedule headers)
    let headerRowIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && Array.isArray(row)) {
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('course') || rowStr.includes('subject') || 
                rowStr.includes('date') || rowStr.includes('time') || 
                rowStr.includes('room')) {
                headerRowIndex = i;
                headers = row.map(h => h ? h.toString().toLowerCase().trim() : '');
                break;
            }
        }
    }
    
    // If no header found, assume first row is header
    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        headers = jsonData[0] ? jsonData[0].map(h => h ? h.toString().toLowerCase().trim() : '') : [];
    }
    
    // Map column indices
    const courseCol = findColumnIndex(headers, ['course', 'subject', 'module', 'exam']);
    const courseTitleCol = findColumnIndex(headers, ['course title', 'title', 'course name', 'subject title', 'exam title']);
    const sectionCol = findColumnIndex(headers, ['section', 'sec', 'group', 'class']);
    const dateCol = findColumnIndex(headers, ['date', 'day', 'datum']);
    const timeCol = findColumnIndex(headers, ['zeit', 'time', 'hour']);
    const roomCol = findColumnIndex(headers, ['room', 'raum', 'location', 'venue']);
    const studentIdCol = findColumnIndex(headers, ['student', 'id', 'studentid', 'student_id', 'matrikel']);
    
    // Debug logging to help identify column detection
    console.log('Headers found:', headers);
    console.log('Column mappings:', {
        course: courseCol,
        courseTitle: courseTitleCol,
        section: sectionCol,
        date: dateCol,
        time: timeCol,
        room: roomCol,
        studentId: studentIdCol
    });
    
    // Process data rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row)) continue;
        
        const course = getCellValue(row, courseCol);
        const courseTitle = getCellValue(row, courseTitleCol);
        let section = getCellValue(row, sectionCol);
        const date = getCellValue(row, dateCol);
        const time = getCellValue(row, timeCol);
        const room = getCellValue(row, roomCol);
        const studentIdValue = getCellValue(row, studentIdCol);
        
        // If no section column found, try to detect section from other columns
        if (!section) {
            // Check if first column contains single letter/number (likely section)
            const firstCol = getCellValue(row, 0);
            if (firstCol && firstCol.length <= 2 && /^[A-Z0-9]+$/i.test(firstCol)) {
                section = firstCol.toUpperCase();
            }
            
            // Check if any column contains section-like data
            for (let j = 0; j < row.length; j++) {
                const cellValue = getCellValue(row, j);
                if (cellValue && cellValue.length <= 2 && /^[A-Z0-9]+$/i.test(cellValue) && 
                    cellValue !== course && cellValue !== date && cellValue !== time && 
                    !cellValue.includes(':') && !cellValue.includes('/')) {
                    section = cellValue.toUpperCase();
                    break;
                }
            }
        }
        
        // Skip empty rows
        if (!course && !date && !time && !room) continue;
        
        // Use course title from column if available, otherwise extract from course field
        let finalCourseCode = '';
        let finalCourseTitle = '';
        
        if (courseTitle && courseTitle !== 'N/A' && courseTitle.trim()) {
            // We have a separate course title column
            finalCourseTitle = courseTitle.trim();
            finalCourseCode = course || extractCourseCode(courseTitle);
        } else {
            // Extract course code and title from the course field
            const courseInfo = extractCourseCodeAndTitle(course || '');
            finalCourseCode = courseInfo.code;
            finalCourseTitle = courseInfo.title;
        }
        
        examData.push({
            course: course || 'N/A',
            courseCode: finalCourseCode,
            courseTitle: finalCourseTitle,
            section: section || null,
            date: formatDate(date) || 'N/A',
            time: time || 'N/A',
            room: room || 'N/A',
            studentId: studentIdValue || null
        });
    }
    
    if (examData.length === 0) {
        throw new Error('No valid exam data found in the file. Please check the file format.');
    }
    
    // Sort data initially
    sortData();
    updateTable();
    showInterface();
}

// Student ID functionality
function handleStudentIdInput() {
    const studentIdValue = studentId.value.trim();
    confirmStudentIdBtn.disabled = studentIdValue.length === 0 || studentIdConfirmed;
    
    if (studentIdConfirmed && studentIdValue !== confirmedStudentId) {
        // Student ID changed after confirmation, need to re-confirm
        studentIdConfirmed = false;
        confirmedStudentId = '';
        confirmStudentIdBtn.disabled = false;
        confirmStudentIdBtn.textContent = 'Confirm Student ID';
        searchSection.classList.add('hidden');
        showError('Student ID changed. Please confirm the new ID.');
    }
}

function confirmStudentId() {
    const studentIdValue = studentId.value.trim();
    if (!studentIdValue) {
        showError('Please enter a student ID.');
        return;
    }
    
    studentIdConfirmed = true;
    confirmedStudentId = studentIdValue;
    confirmStudentIdBtn.disabled = true;
    confirmStudentIdBtn.textContent = 'ID Confirmed ✓';
    searchSection.classList.remove('hidden');
    pdfUploadSection.classList.remove('hidden'); // Show PDF upload option
    showSuccess(`Student ID confirmed: ${studentIdValue}. You can now add courses manually or upload your class routine PDF for quick setup.`);
    hideMessages();
}

// PDF Upload handlers
function handlePdfSelect() {
    const file = classRoutinePdf.files[0];
    extractCoursesBtn.disabled = !file;
}

function extractStudentIdFromPdf(text, structuredText = []) {
    console.log('=== Extracting Student ID ===');
    
    // Multiple patterns for student ID
    const idPatterns = [
        /Student\s*ID[\s:]*(\d{9,11})/gi,           // Student ID: 011221373
        /ID[\s:]*(\d{9,11})/gi,                      // ID: 011221373
        /\b(\d{9,11})\b/g,                           // Any 9-11 digit number
        /Student[\s:]*(\d{9,11})/gi,                 // Student 011221373
        /Matric[a-z]*[\s:]*(\d{9,11})/gi,           // Matriculation: 011221373
    ];
    
    // Try structured text first (better accuracy)
    if (structuredText && structuredText.length > 0) {
        for (let i = 0; i < structuredText.length; i++) {
            const item = structuredText[i];
            
            // Look for "Student ID" or "ID" label
            if (/student\s*id|^\s*id\s*$/i.test(item)) {
                // Check next few items for the ID number
                for (let j = i + 1; j < Math.min(i + 5, structuredText.length); j++) {
                    const nextItem = structuredText[j];
                    const idMatch = nextItem.match(/^(\d{9,11})$/);
                    if (idMatch) {
                        console.log(`✓ Found Student ID in structured text: ${idMatch[1]}`);
                        return idMatch[1];
                    }
                }
            }
            
            // Also check if current item contains both label and ID
            for (const pattern of idPatterns) {
                pattern.lastIndex = 0;
                const match = pattern.exec(item);
                if (match && match[1]) {
                    console.log(`✓ Found Student ID in item: ${match[1]}`);
                    return match[1];
                }
            }
        }
    }
    
    // Fallback: Try text-based extraction
    for (const pattern of idPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match && match[1]) {
            // Validate that it looks like a UIU student ID (starts with 0)
            if (match[1].startsWith('0') && match[1].length >= 9) {
                console.log(`✓ Found Student ID in text: ${match[1]}`);
                return match[1];
            }
        }
    }
    
    console.warn('⚠ Could not extract Student ID from PDF');
    return null;
}

async function extractCoursesFromPdf() {
    const file = classRoutinePdf.files[0];
    if (!file) {
        showError('Please select a PDF file.');
        return;
    }

    extractionProgress.classList.remove('hidden');
    extractionProgress.innerHTML = '<p class="text-sm text-blue-800">Processing PDF... Please wait.</p>';
    extractCoursesBtn.disabled = true;

    try {
        // Set up PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let allText = '';
        let structuredText = []; // Keep text with positions for better parsing
        
        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + '\n';
            structuredText.push(...textContent.items.map(item => item.str));
        }

        console.log('=== PDF Text Extraction ===');
        console.log('Total pages:', pdf.numPages);
        console.log('Extracted text preview (first 500 chars):', allText.substring(0, 500));
        console.log('All text items:', structuredText);

        // Extract Student ID from PDF first
        const extractedStudentId = extractStudentIdFromPdf(allText, structuredText);
        
        if (extractedStudentId) {
            console.log('✓ Extracted Student ID:', extractedStudentId);
            
            // Auto-fill and confirm student ID
            studentId.value = extractedStudentId;
            confirmedStudentId = extractedStudentId;
            studentIdConfirmed = true;
            confirmStudentIdBtn.disabled = true;
            confirmStudentIdBtn.textContent = 'ID Auto-Confirmed ✓';
            
            extractionProgress.innerHTML = '<p class="text-sm text-green-800">✓ Student ID detected: ' + extractedStudentId + '</p>';
        } else {
            console.warn('⚠ Could not extract Student ID from PDF');
            extractionProgress.innerHTML = '<p class="text-sm text-orange-800">⚠ Student ID not found in PDF. Please enter it manually above.</p>';
            
            if (!studentIdConfirmed) {
                showError('Could not find Student ID in PDF. Please enter your Student ID manually and confirm it, then try again.');
                extractionProgress.classList.add('hidden');
                extractCoursesBtn.disabled = false;
                return;
            }
        }

        // Parse the extracted text to find courses
        const extractedCourses = parseCourseData(allText, structuredText);
        
        console.log('Extracted courses:', extractedCourses);
        
        if (extractedCourses.length === 0) {
            extractionProgress.innerHTML = '<p class="text-sm text-red-800">❌ No courses found. Showing debug info...</p>';
            console.error('Failed to extract courses. PDF text content:', allText);
            showError('No courses found in the PDF. Please check the console for details or add courses manually. Make sure the PDF contains course codes like CSE251, MATH101, etc. and sections like Sec: A, Section: B, etc.');
            extractionProgress.classList.add('hidden');
            extractCoursesBtn.disabled = false;
            return;
        }
        
        // Show what was extracted
        extractionProgress.innerHTML = `
            <div class="text-sm">
                <p class="font-semibold text-green-700">✓ Successfully extracted ${extractedCourses.length} courses from PDF:</p>
                <p class="text-blue-700 mt-1">${extractedCourses.map(c => `${c.courseCode} (Sec: ${c.section})`).join(', ')}</p>
                <p class="text-gray-600 mt-2">Now matching with exam schedule...</p>
            </div>
        `;

        // Match extracted courses with exam data
        const matchedCourses = matchCoursesWithExamData(extractedCourses);
        
        console.log('Matched courses:', matchedCourses);
        
        if (matchedCourses.length === 0) {
            const extractedList = extractedCourses.map(c => `${c.courseCode} (${c.section})`).join(', ');
            const availableList = examData.map(e => extractCourseCode(e.course) || e.course).slice(0, 10).join(', ');
            
            extractionProgress.innerHTML = `
                <div class="text-sm space-y-2">
                    <p class="font-semibold text-red-700">⚠️ Found ${extractedCourses.length} courses in PDF but none match the exam schedule.</p>
                    <div class="bg-white p-3 rounded border border-orange-300">
                        <p class="text-orange-900"><strong>From your PDF:</strong> <span class="text-blue-700">${extractedList}</span></p>
                        <p class="text-orange-900 mt-2"><strong>In exam schedule (sample):</strong> <span class="text-green-700">${availableList}${examData.length > 10 ? '...' : ''}</span></p>
                    </div>
                    <div class="bg-yellow-50 p-3 rounded border border-yellow-300">
                        <p class="font-semibold text-yellow-900">🎯 Solutions:</p>
                        <ol class="list-decimal ml-5 mt-2 text-yellow-900 space-y-1">
                            <li><strong>Upload correct exam schedule:</strong> Make sure the Excel file contains courses from your department (CSE, ECO, PMG, etc.)</li>
                            <li><strong>Use manual entry:</strong> Search and add courses one by one using the search box below</li>
                            <li><strong>Check semester/department:</strong> Exam schedule should match your current semester</li>
                        </ol>
                    </div>
                </div>
            `;
            
            console.warn('❌ NO MATCHES FOUND');
            console.warn('Extracted from PDF:', extractedCourses);
            console.warn('Available in exam schedule:', examData.slice(0, 20).map(e => ({ 
                original: e.course, 
                code: extractCourseCode(e.course) 
            })));
            
            showError(`Found ${extractedCourses.length} courses in PDF (${extractedList}) but none match the exam schedule. Please verify you uploaded the correct exam routine Excel file for this semester.`);
            
            // Don't hide progress, keep it visible with info
            extractCoursesBtn.disabled = false;
            return;
        }

        // Add all matched courses to selected courses
        selectedCourses = matchedCourses;
        updateSelectedCoursesDisplay();
        
        extractionProgress.classList.add('hidden');
        extractCoursesBtn.disabled = false;
        
        showSuccess(`Successfully extracted ${matchedCourses.length} courses from PDF! ${extractedCourses.length - matchedCourses.length > 0 ? `(${extractedCourses.length - matchedCourses.length} courses not in exam schedule)` : ''} You can now download your personalized exam schedule.`);
        
        // Scroll to selected courses section
        setTimeout(() => {
            selectedCoursesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);

    } catch (error) {
        console.error('Error extracting courses from PDF:', error);
        extractionProgress.innerHTML = `<p class="text-sm text-red-800">Error: ${error.message}</p>`;
        showError(`Failed to extract courses from PDF: ${error.message}. Please check the console for details or add courses manually.`);
        extractionProgress.classList.add('hidden');
        extractCoursesBtn.disabled = false;
    }
}

function parseCourseData(text, structuredText = []) {
    const courses = [];
    
    console.log('=== Starting Course Parsing ===');
    
    // Multiple patterns for course codes to handle different formats
    const coursePatterns = [
        /\b([A-Z]{2,4}\s*\d{3,4})\b/g,           // CSE 251, CSE251
        /\b([A-Z]{2,4}-\d{3,4})\b/g,             // CSE-251
        /\b([A-Z]{2,4}_\d{3,4})\b/g,             // CSE_251
        /Course[:\s]*([A-Z]{2,4}\s*\d{3,4})/gi,  // Course: CSE251
    ];
    
    // Multiple patterns for sections
    const sectionPatterns = [
        /\b(?:Sec|Section|Sect)[\s:.-]*([A-Z0-9]+)\b/gi,     // Sec: A, Section A
        /\bSection[\s:]*([A-Z0-9]+)\b/gi,                     // Section: A
        /\b([A-Z])\s*$/,                                       // Single letter at end of line
        /\bGrp[\s:.-]*([A-Z0-9]+)\b/gi,                       // Grp: A
    ];
    
    // Try to extract course-section pairs from structured text (closer proximity)
    if (structuredText && structuredText.length > 0) {
        console.log('Trying structured text parsing...');
        for (let i = 0; i < structuredText.length; i++) {
            const item = structuredText[i];
            
            // Check if this item contains a course code
            for (const pattern of coursePatterns) {
                pattern.lastIndex = 0; // Reset regex
                const match = pattern.exec(item);
                if (match) {
                    const courseCode = match[1].replace(/[\s-_]/g, '').toUpperCase();
                    console.log(`Found course code: ${courseCode} at index ${i}`);
                    
                    // Look for section in nearby items (within next 10 items)
                    let foundSection = null;
                    for (let j = i; j < Math.min(i + 10, structuredText.length); j++) {
                        const nearbyItem = structuredText[j];
                        
                        for (const secPattern of sectionPatterns) {
                            secPattern.lastIndex = 0; // Reset regex
                            const secMatch = secPattern.exec(nearbyItem);
                            if (secMatch) {
                                foundSection = secMatch[1].toUpperCase();
                                console.log(`Found section: ${foundSection} for ${courseCode}`);
                                break;
                            }
                        }
                        if (foundSection) break;
                    }
                    
                    if (foundSection) {
                        const exists = courses.some(c => 
                            c.courseCode === courseCode && c.section === foundSection
                        );
                        if (!exists) {
                            courses.push({ courseCode, section: foundSection });
                            console.log(`Added course: ${courseCode} - ${foundSection}`);
                        }
                    }
                }
            }
        }
    }
    
    // Fallback: Parse line by line
    if (courses.length === 0) {
        console.log('Structured parsing found nothing, trying line-by-line parsing...');
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Try to find course codes
            for (const pattern of coursePatterns) {
                pattern.lastIndex = 0; // Reset regex
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const courseCode = match[1].replace(/[\s-_]/g, '').toUpperCase();
                    console.log(`Line ${i}: Found course code: ${courseCode} in "${line}"`);
                    
                    // Look for section in the same line
                    let foundSection = null;
                    for (const secPattern of sectionPatterns) {
                        secPattern.lastIndex = 0; // Reset regex
                        const secMatch = secPattern.exec(line);
                        if (secMatch) {
                            foundSection = secMatch[1].toUpperCase();
                            console.log(`Found section in same line: ${foundSection}`);
                            break;
                        }
                    }
                    
                    // If not found in same line, check next few lines
                    if (!foundSection) {
                        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                            const nextLine = lines[j].trim();
                            if (!nextLine) continue;
                            
                            for (const secPattern of sectionPatterns) {
                                secPattern.lastIndex = 0; // Reset regex
                                const secMatch = secPattern.exec(nextLine);
                                if (secMatch) {
                                    foundSection = secMatch[1].toUpperCase();
                                    console.log(`Found section in line ${j}: ${foundSection} in "${nextLine}"`);
                                    break;
                                }
                            }
                            if (foundSection) break;
                        }
                    }
                    
                    if (foundSection) {
                        const exists = courses.some(c => 
                            c.courseCode === courseCode && c.section === foundSection
                        );
                        if (!exists) {
                            courses.push({ courseCode, section: foundSection });
                            console.log(`Added course: ${courseCode} - ${foundSection}`);
                        }
                    } else {
                        console.warn(`Course ${courseCode} found but no section detected`);
                    }
                }
            }
        }
    }
    
    // Final attempt: Look for table-like structures
    if (courses.length === 0) {
        console.log('Trying table-like structure parsing...');
        // Sometimes PDFs have course and section in adjacent cells
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length - 2; i++) {
            // Check if current word is a course code
            for (const pattern of coursePatterns) {
                pattern.lastIndex = 0;
                if (pattern.test(words[i])) {
                    const courseCode = words[i].replace(/[\s-_]/g, '').toUpperCase();
                    // Check next few words for section indicators
                    for (let j = i + 1; j < Math.min(i + 5, words.length); j++) {
                        for (const secPattern of sectionPatterns) {
                            secPattern.lastIndex = 0;
                            const secMatch = secPattern.exec(words[j]);
                            if (secMatch) {
                                const section = secMatch[1].toUpperCase();
                                const exists = courses.some(c => 
                                    c.courseCode === courseCode && c.section === section
                                );
                                if (!exists) {
                                    courses.push({ courseCode, section });
                                    console.log(`Table parsing - Added: ${courseCode} - ${section}`);
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    console.log('=== Final Extracted Courses ===');
    console.log(courses);
    
    return courses;
}

function matchCoursesWithExamData(extractedCourses) {
    const matchedCourses = [];
    
    console.log('=== Starting Course Matching ===');
    console.log('Courses to match:', extractedCourses);
    console.log('Available exam data:', examData.map(e => ({ course: e.course, extracted: extractCourseCode(e.course) })));
    
    for (const extractedCourse of extractedCourses) {
        console.log(`Trying to match: ${extractedCourse.courseCode} (Section: ${extractedCourse.section})`);
        
        // Try to find matching course in exam data
        let matchingExam = examData.find(exam => {
            const examCourseCode = extractCourseCode(exam.course);
            const extractedCode = extractedCourse.courseCode;
            
            // Normalize both codes by removing spaces and comparing
            const normalizedExamCode = examCourseCode.replace(/\s+/g, '');
            const normalizedExtractedCode = extractedCode.replace(/\s+/g, '');
            
            const match = normalizedExamCode === normalizedExtractedCode;
            if (match) {
                console.log(`✓ Exact match: ${extractedCode} matches ${examCourseCode} in ${exam.course}`);
            }
            return match;
        });
        
        // If exact match not found, try variations (with/without leading zeros)
        if (!matchingExam) {
            matchingExam = examData.find(exam => {
                const examCourseCode = extractCourseCode(exam.course);
                
                // Try matching with variations:
                // CSE251 vs CSE0251, CSE3421 vs CSE321, PMG4101 vs PMG 4101, etc.
                const extracted = extractedCourse.courseCode.replace(/\s+/g, '');
                const examCode = examCourseCode.replace(/\s+/g, '');
                
                // Extract prefix and number parts
                const extractedMatch = extracted.match(/^([A-Z]+)(\d+)$/);
                const examMatch = examCode.match(/^([A-Z]+)(\d+)$/);
                
                if (extractedMatch && examMatch) {
                    const [, extractedPrefix, extractedNum] = extractedMatch;
                    const [, examPrefix, examNum] = examMatch;
                    
                    // Same prefix, check if numbers match (ignoring leading zeros)
                    if (extractedPrefix === examPrefix) {
                        const match = parseInt(extractedNum) === parseInt(examNum);
                        if (match) {
                            console.log(`✓ Variation match: ${extracted} matches ${examCode} in ${exam.course}`);
                        }
                        return match;
                    }
                }
                
                return false;
            });
        }
        
        // If still no match, try partial matching
        if (!matchingExam) {
            console.log(`No exact match for ${extractedCourse.courseCode}, trying partial match...`);
            matchingExam = examData.find(exam => {
                const examCourseLower = exam.course.toLowerCase().replace(/\s+/g, '');
                const extractedLower = extractedCourse.courseCode.toLowerCase().replace(/\s+/g, '');
                
                // Check if course code appears anywhere in the exam course name
                const match = examCourseLower.includes(extractedLower);
                
                if (match) {
                    console.log(`✓ Partial match: ${extractedCourse.courseCode} with ${exam.course}`);
                }
                return match;
            });
        }
        
        if (matchingExam) {
            // Check if already selected
            const alreadySelected = selectedCourses.some(selected =>
                selected.course.toLowerCase() === matchingExam.course.toLowerCase() &&
                selected.section === extractedCourse.section
            );
            
            if (!alreadySelected) {
                const courseWithSection = {
                    ...matchingExam,
                    section: extractedCourse.section,
                    assignedRoom: findStudentRoom(matchingExam.course, confirmedStudentId, extractedCourse.section)
                };
                
                matchedCourses.push(courseWithSection);
                console.log(`✓ Added to matched courses: ${matchingExam.course} (${extractedCourse.section})`);
            } else {
                console.log(`⊘ Already selected: ${matchingExam.course} (${extractedCourse.section})`);
            }
        } else {
            console.warn(`✗ No match found for: ${extractedCourse.courseCode}`);
        }
    }
    
    console.log('=== Matching Complete ===');
    console.log('Total matched:', matchedCourses.length);
    
    return matchedCourses;
}

function handleCourseSectionInput() {
    const courseValue = courseSearch.value.trim();
    const sectionValue = courseSection.value.trim();
    
    // Enable the button if all conditions are met
    const shouldEnable = courseValue.length > 0 && 
                        sectionValue.length > 0 && 
                        studentIdConfirmed && 
                        selectedCourseForSection;
    
    addCourseBtn.disabled = !shouldEnable;
}

// Function to find the correct room for a student based on course and section
function findStudentRoom(course, studentIdValue, studentSectionValue = null) {
    if (!studentIdValue) {
        return 'N/A - Enter Student ID';
    }
    
    const studentIdNum = parseInt(studentIdValue);
    if (isNaN(studentIdNum)) {
        return 'N/A - Invalid ID';
    }
    
    // If section is not provided, get it from the input field
    if (!studentSectionValue) {
        studentSectionValue = courseSection.value.trim();
    }
    
    // First priority: Find exact course and section match
    if (studentSectionValue) {
        const exactMatch = examData.find(exam => 
            exam.course.toLowerCase() === course.toLowerCase() && 
            exam.section && 
            exam.section.toUpperCase() === studentSectionValue.toUpperCase()
        );
        
        if (exactMatch) {
            // Extract room number from the room string
            const roomMatch = exactMatch.room.match(/\d+/);
            return roomMatch ? roomMatch[0] : exactMatch.room;
        }
    }
    
    // Second priority: Find all rooms for this course
    const courseRooms = examData.filter(exam => 
        exam.course.toLowerCase() === course.toLowerCase()
    );
    
    if (courseRooms.length === 0) {
        return 'N/A';
    }
    
    // If only one room, return it
    if (courseRooms.length === 1) {
        const roomMatch = courseRooms[0].room.match(/\d+/);
        return roomMatch ? roomMatch[0] : courseRooms[0].room;
    }
    
    // Third priority: Try to find room based on ID ranges and section
    for (const roomData of courseRooms) {
        const roomInfo = roomData.room;
        
        // Enhanced format with section: "304 Sec A (011221300-011221400)", "305 Section B (011221401-011221500)"
        if (studentSectionValue) {
            const sectionRangeMatch = roomInfo.match(new RegExp(`(\\d+)\\s*(?:Sec|Section)\\s*${studentSectionValue}\\s*\\((\\d+)-(\\d+)\\)`, 'i'));
            if (sectionRangeMatch) {
                const rangeStart = parseInt(sectionRangeMatch[2]);
                const rangeEnd = parseInt(sectionRangeMatch[3]);
                
                if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                    return sectionRangeMatch[1]; // Return just the room number
                }
            }
            
            // Alternative section format: "Room 304 Section A for 011221300-011221400"
            const altSectionMatch = roomInfo.match(new RegExp(`Room\\s+(\\d+)\\s*(?:Sec|Section)\\s*${studentSectionValue}\\s*for\\s+(\\d+)-(\\d+)`, 'i'));
            if (altSectionMatch) {
                const rangeStart = parseInt(altSectionMatch[2]);
                const rangeEnd = parseInt(altSectionMatch[3]);
                
                if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                    return altSectionMatch[1]; // Return just the room number
                }
            }
        }
        
        // Try to extract ID ranges from room description (original logic)
        // Format examples: "304(011221300-011221400)", "Room 101 (011221001-011221100)", "304 (011221300-011221400)"
        const rangeMatch = roomInfo.match(/(\d+)\s*\((\d+)-(\d+)\)/);
        if (rangeMatch) {
            const rangeStart = parseInt(rangeMatch[2]);
            const rangeEnd = parseInt(rangeMatch[3]);
            
            if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                return rangeMatch[1]; // Return just the room number
            }
        }
        
        // Alternative format: "304(011221300-011221400)"
        const altRangeMatch = roomInfo.match(/^(\d+)\((\d+)-(\d+)\)$/);
        if (altRangeMatch) {
            const rangeStart = parseInt(altRangeMatch[2]);
            const rangeEnd = parseInt(altRangeMatch[3]);
            
            if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                return altRangeMatch[1]; // Return just the room number
            }
        }
        
        // Another format: "Room 304 for 011221300-011221400"
        const anotherRangeMatch = roomInfo.match(/Room\s+(\d+)\s+for\s+(\d+)-(\d+)/i);
        if (anotherRangeMatch) {
            const rangeStart = parseInt(anotherRangeMatch[2]);
            const rangeEnd = parseInt(anotherRangeMatch[3]);
            
            if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                return anotherRangeMatch[1]; // Return just the room number
            }
        }
        
        // Format: "304 (011221300-011221400) 305 (011221401-011221500)"
        // Extract multiple room ranges from single entry
        const multipleRanges = roomInfo.match(/(\d+)\s*\((\d+)-(\d+)\)/g);
        if (multipleRanges) {
            for (const range of multipleRanges) {
                const match = range.match(/(\d+)\s*\((\d+)-(\d+)\)/);
                if (match) {
                    const rangeStart = parseInt(match[2]);
                    const rangeEnd = parseInt(match[3]);
                    
                    if (studentIdNum >= rangeStart && studentIdNum <= rangeEnd) {
                        return match[1]; // Return just the room number
                    }
                }
            }
        }
    }
    
    // Fourth priority: Section-based fallback
    if (studentSectionValue) {
        // Try to find rooms that mention the section
        for (const roomData of courseRooms) {
            const roomInfo = roomData.room.toLowerCase();
            if (roomInfo.includes(studentSectionValue.toLowerCase()) || 
                roomInfo.includes(`sec ${studentSectionValue.toLowerCase()}`) ||
                roomInfo.includes(`section ${studentSectionValue.toLowerCase()}`)) {
                
                // Extract room number from the matched room info
                const roomMatch = roomData.room.match(/(\d+)/);
                if (roomMatch) {
                    return roomMatch[1];
                }
            }
        }
    }
    
    // Final fallback: return the first room with extracted number
    const roomMatch = courseRooms[0].room.match(/\d+/);
    return roomMatch ? roomMatch[0] : courseRooms[0].room;
}

// Toggle full routine visibility
function toggleFullRoutine() {
    isFullRoutineVisible = !isFullRoutineVisible;
    
    if (isFullRoutineVisible) {
        tableContainer.classList.remove('hidden');
        toggleRoutineBtn.textContent = 'Hide Full Routine';
        toggleRoutineBtn.classList.remove('bg-gradient-orange');
        toggleRoutineBtn.classList.add('bg-red-500', 'hover:bg-red-600');
    } else {
        tableContainer.classList.add('hidden');
        toggleRoutineBtn.textContent = 'Show Full Routine';
        toggleRoutineBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        toggleRoutineBtn.classList.add('bg-gradient-orange');
    }
}

function showInterface() {
    controls.classList.remove('hidden');
    searchSection.classList.remove('hidden');
    studentIdSection.classList.remove('hidden');
    
    // Enable course search normally
    courseSearch.disabled = false;
    courseSearch.placeholder = "Search by course name, code, or title...";
    
    updateSortIndicators();
    
    // Hide full routine by default
    tableContainer.classList.add('hidden');
    isFullRoutineVisible = false;
    toggleRoutineBtn.textContent = 'Show Full Routine';
    toggleRoutineBtn.classList.add('bg-gradient-orange');
}

// Enhanced course search functionality
function handleCourseSearch() {
    const searchTerm = courseSearch.value.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
        searchSuggestions.classList.add('hidden');
        addCourseBtn.disabled = true;
        courseSection.disabled = true;
        courseSection.innerHTML = '<option value="">Select a course first</option>';
        selectedCourseForSection = null;
        return;
    }
    
    // Enhanced search - look for the term in course names, codes, and titles
    const matchingCourses = examData.filter(exam => {
        const courseName = (exam.course || '').toLowerCase();
        const courseCode = (exam.courseCode || '').toLowerCase();
        const courseTitle = (exam.courseTitle || '').toLowerCase();
        
        // Search in course name, code, and title
        return courseName.includes(searchTerm) || 
               courseCode.includes(searchTerm) || 
               courseTitle.includes(searchTerm);
    });
    
    // Get unique courses
    const uniqueCourses = [];
    const seen = new Set();
    
    matchingCourses.forEach(exam => {
        const courseLower = exam.course.toLowerCase();
        if (!seen.has(courseLower)) {
            seen.add(courseLower);
            uniqueCourses.push(exam);
        }
    });
    
    if (uniqueCourses.length > 0) {
        showSuggestions(uniqueCourses);
        
        // If there's an exact match, select it automatically
        const exactMatch = uniqueCourses.find(course => 
            course.course.toLowerCase() === searchTerm ||
            (course.courseCode || '').toLowerCase() === searchTerm ||
            (course.courseTitle || '').toLowerCase() === searchTerm
        );
        
        if (exactMatch) {
            selectedCourseForSection = exactMatch.course;
            populateCourseSections(exactMatch.course);
        }
    } else {
        // Show "no results" message instead of hiding suggestions
        showNoResultsMessage(searchTerm);
        addCourseBtn.disabled = true;
        courseSection.disabled = true;
        courseSection.innerHTML = '<option value="">No matching course found</option>';
        selectedCourseForSection = null;
    }
}

function extractCourseCode(courseName) {
    // Extract course code from course name (e.g., "CSE251" or "CSE3421" from "Computer Science CSE251")
    // Support both 3-digit and 4-digit course codes
    const codeMatch = courseName.match(/\b([A-Z]{2,4}\d{3,4})\b/i);
    return codeMatch ? codeMatch[1].toUpperCase() : '';
}

function extractCourseCodeAndTitle(courseString) {
    if (!courseString || courseString === 'N/A') {
        return { code: '', title: courseString || '' };
    }
    
    // Try to extract course code (pattern like CSE251, MATH101, etc.)
    const codeMatch = courseString.match(/\b([A-Z]{2,4}\d{2,4})\b/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : '';
    
    let title = courseString.trim();
    
    if (code) {
        // Remove the code from the title to get clean title
        title = courseString.replace(new RegExp(`\\b${code}\\b`, 'gi'), '').trim();
        // Clean up extra spaces and separators
        title = title.replace(/^\s*[-–—:,]\s*|\s*[-–—:,]\s*$/g, '').trim();
        title = title.replace(/\s+/g, ' '); // Replace multiple spaces with single space
    }
    
    // If no clear separation was found, check for common patterns
    if (!code || !title) {
        // Pattern 1: "Course Name - CODE123" or "Course Name CODE123"
        const pattern1 = courseString.match(/^(.+?)\s*[-–—]?\s*([A-Z]{2,4}\d{2,4})$/i);
        if (pattern1) {
            return {
                code: pattern1[2].toUpperCase(),
                title: pattern1[1].trim()
            };
        }
        
        // Pattern 2: "CODE123 - Course Name" or "CODE123 Course Name"
        const pattern2 = courseString.match(/^([A-Z]{2,4}\d{2,4})\s*[-–—]?\s*(.+)$/i);
        if (pattern2) {
            return {
                code: pattern2[1].toUpperCase(),
                title: pattern2[2].trim()
            };
        }
    }
    
    return {
        code: code || '',
        title: title || courseString
    };
}

function showSuggestions(courses) {
    searchSuggestions.innerHTML = '';
    
    const searchTerm = courseSearch.value.toLowerCase().trim();
    
    courses.slice(0, 5).forEach(exam => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        
        // Create a better display format with highlighting
        let displayText = '';
        const courseCode = exam.courseCode || extractCourseCode(exam.course);
        const courseTitle = exam.courseTitle || exam.course;
        
        if (courseCode && courseTitle && courseCode !== courseTitle) {
            // Highlight matching parts
            const highlightedCode = highlightMatch(courseCode, searchTerm);
            const highlightedTitle = highlightMatch(courseTitle, searchTerm);
            displayText = `<span class="font-semibold text-primary">${highlightedCode}</span> - ${highlightedTitle}`;
        } else if (courseCode) {
            // Show just the highlighted code
            const highlightedCode = highlightMatch(courseCode, searchTerm);
            displayText = `<span class="font-semibold text-primary">${highlightedCode}</span>`;
        } else {
            // Show the highlighted original course name
            const highlightedCourse = highlightMatch(exam.course, searchTerm);
            displayText = `<span class="font-medium">${highlightedCourse}</span>`;
        }
        
        suggestionItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>${displayText}</div>
                <span class="text-xs text-gray-500">${exam.date} - ${exam.room}</span>
            </div>
        `;
        
        suggestionItem.addEventListener('click', () => {
            courseSearch.value = exam.course;
            searchSuggestions.classList.add('hidden');
            selectedCourseForSection = exam.course;
            populateCourseSections(exam.course);
        });
        searchSuggestions.appendChild(suggestionItem);
    });
    
    searchSuggestions.classList.remove('hidden');
}

function highlightMatch(text, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 rounded px-1">$1</mark>');
}

function findColumnIndex(headers, searchTerms) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim();
        if (searchTerms.some(term => {
            // Check for exact match or if header contains the search term
            return header === term.toLowerCase() || header.includes(term.toLowerCase());
        })) {
            return i;
        }
    }
    return -1;
}

function getCellValue(row, colIndex) {
    if (colIndex === -1 || !row[colIndex]) return '';
    return row[colIndex].toString().trim();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    
    // Handle Excel date serial numbers
    if (!isNaN(dateStr) && dateStr > 25567) {
        const date = new Date((dateStr - 25567) * 86400 * 1000);
        return date.toLocaleDateString();
    }
    
    // Handle various date formats
    const cleanDate = dateStr.toString().trim();
    if (cleanDate.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/)) {
        return cleanDate;
    }
    
    return cleanDate;
}

function sortData() {
    examData.sort((a, b) => {
        let aVal = a[currentSortField];
        let bVal = b[currentSortField];
        
        // Handle date sorting
        if (currentSortField === 'date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
            if (isNaN(aVal)) aVal = new Date(0);
            if (isNaN(bVal)) bVal = new Date(0);
        }
        
        // Handle time sorting
        if (currentSortField === 'time') {
            aVal = convertTimeToMinutes(aVal);
            bVal = convertTimeToMinutes(bVal);
        }
        
        let result = 0;
        if (aVal < bVal) result = -1;
        if (aVal > bVal) result = 1;
        
        return currentSortOrder === 'desc' ? -result : result;
    });
}

function convertTimeToMinutes(timeStr) {
    if (!timeStr || timeStr === 'N/A') return 0;
    
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
}

function updateTable() {
    examTableBody.innerHTML = '';
    
    examData.forEach((exam, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // Get course code and title for better display
        const courseCode = exam.courseCode || extractCourseCode(exam.course);
        const courseTitle = exam.courseTitle || exam.course;
        
        let courseDisplayText = '';
        if (courseCode && courseTitle && courseCode !== courseTitle) {
            courseDisplayText = `<span class="font-semibold text-primary">${courseCode}</span><br><span class="text-sm text-gray-600">${courseTitle}</span>`;
        } else {
            courseDisplayText = exam.course;
        }
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${courseDisplayText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${exam.date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${exam.time}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${exam.room}</td>
        `;
        
        examTableBody.appendChild(row);
    });
    
    examCount.textContent = examData.length;
}

function updateSortIndicators() {
    // Reset all indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '↕';
    });
    
    // Set current indicator
    const currentHeader = document.querySelector(`th[data-sort="${currentSortField}"] .sort-indicator`);
    if (currentHeader) {
        currentHeader.textContent = currentSortOrder === 'asc' ? '↑' : '↓';
    }
}

function handleSort() {
    currentSortField = sortBySelect.value;
    currentSortOrder = sortOrderSelect.value;
    sortData();
    updateTable();
    updateSortIndicators();
}

function showTable() {
    tableContainer.classList.remove('hidden');
    controls.classList.remove('hidden');
    searchSection.classList.remove('hidden');
    updateSortIndicators();
}

// Note: handleCourseSearch function is defined earlier in the file

// Note: showSuggestions function is defined earlier in the file

function handleSearchKeydown(event) {
    const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
    const isVisible = !searchSuggestions.classList.contains('hidden');
    
    if (!isVisible || suggestions.length === 0) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (!addCourseBtn.disabled) {
                addSelectedCourse();
            }
        }
        return;
    }
    
    let currentIndex = Array.from(suggestions).findIndex(item => 
        item.classList.contains('suggestion-active')
    );
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < suggestions.length - 1) {
                if (currentIndex >= 0) suggestions[currentIndex].classList.remove('suggestion-active');
                currentIndex++;
                suggestions[currentIndex].classList.add('suggestion-active');
            } else if (currentIndex === -1 && suggestions.length > 0) {
                suggestions[0].classList.add('suggestion-active');
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                suggestions[currentIndex].classList.remove('suggestion-active');
                currentIndex--;
                suggestions[currentIndex].classList.add('suggestion-active');
            } else if (currentIndex === 0) {
                suggestions[currentIndex].classList.remove('suggestion-active');
            }
            break;
            
        case 'Enter':
            event.preventDefault();
            if (currentIndex >= 0 && currentIndex < suggestions.length) {
                suggestions[currentIndex].click();
            } else if (!addCourseBtn.disabled) {
                addSelectedCourse();
            }
            break;
            
        case 'Escape':
            event.preventDefault();
            searchSuggestions.classList.add('hidden');
            break;
    }
}

function addSelectedCourse() {
    const searchTerm = courseSearch.value.trim();
    const sectionValue = courseSection.value.trim();
    
    if (!searchTerm || !sectionValue || !selectedCourseForSection) return;
    
    // Find the course in exam data
    const courseExams = examData.filter(exam => 
        exam.course.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (courseExams.length === 0) {
        showError('Course not found in the exam schedule.');
        return;
    }
    
    // Check if course with this section is already selected
    const existingCourse = selectedCourses.find(selected => 
        selected.course.toLowerCase() === courseExams[0].course.toLowerCase() &&
        selected.section === sectionValue
    );
    
    if (existingCourse) {
        showError('Course with this section is already selected.');
        return;
    }
    
    // Create course object with section and auto-assigned room
    const courseWithSection = {
        ...courseExams[0],
        section: sectionValue,
        assignedRoom: findStudentRoom(courseExams[0].course, confirmedStudentId, sectionValue)
    };
    
    // Add the course
    selectedCourses.push(courseWithSection);
    
    // Clear search and update UI
    courseSearch.value = '';
    courseSection.value = '';
    courseSection.disabled = true;
    courseSection.innerHTML = '<option value="">Select a course first</option>';
    selectedCourseForSection = null;
    searchSuggestions.classList.add('hidden');
    addCourseBtn.disabled = true;
    updateSelectedCoursesDisplay();
    showSuccess(`Added ${courseExams[0].course} (Section ${sectionValue}) - Room: ${courseWithSection.assignedRoom}`);
    hideMessages();
}

function updateSelectedCoursesDisplay() {
    if (selectedCourses.length === 0) {
        selectedCoursesSection.classList.add('hidden');
        return;
    }
    
    selectedCoursesSection.classList.remove('hidden');
    
    selectedCoursesDiv.innerHTML = '';
    selectedCourses.forEach((courseWithSection, index) => {
        const courseTag = document.createElement('div');
        courseTag.className = 'bg-orange-50 border border-orange-200 rounded-lg p-3 flex justify-between items-start selected-course-card';
        
        // Get course code and title for better display
        const courseCode = courseWithSection.courseCode || extractCourseCode(courseWithSection.course);
        const courseTitle = courseWithSection.courseTitle || courseWithSection.course;
        
        let courseDisplayText = '';
        if (courseCode && courseTitle && courseCode !== courseTitle) {
            courseDisplayText = `<span class="font-bold text-primary">${courseCode}</span> - ${courseTitle}`;
        } else {
            courseDisplayText = courseWithSection.course;
        }
        
        courseTag.innerHTML = `
            <div class="flex-1">
                <h5 class="font-medium text-orange-900">${courseDisplayText}</h5>
                <p class="text-sm text-orange-700">${courseWithSection.date} at ${courseWithSection.time}</p>
                <p class="text-sm text-orange-600">Section: ${courseWithSection.section}</p>
                <p class="text-sm font-semibold text-orange-800">Room: ${courseWithSection.assignedRoom}</p>
            </div>
            <button class="text-red-500 hover:text-red-700 font-bold text-lg ml-2" onclick="removeCourse(${index})">×</button>
        `;
        selectedCoursesDiv.appendChild(courseTag);
    });
    
    // Update the CSS class for better display
    selectedCoursesDiv.className = 'space-y-2 mb-4';
}

function removeCourse(index) {
    selectedCourses.splice(index, 1);
    updateSelectedCoursesDisplay();
}

function clearSelectedCourses() {
    selectedCourses = [];
    updateSelectedCoursesDisplay();
}

// PDF Download functionality
function downloadTimetablePDF() {
    if (selectedCourses.length === 0) {
        showError('Please select at least one course to download.');
        return;
    }
    
    if (!studentIdConfirmed) {
        showError('Please confirm your Student ID first.');
        return;
    }
    
    // Show loading indicator
    showLoading(true);
    
    try {
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set orange theme colors
        const orangeColor = [255, 107, 53]; // #FF6B35
        const lightOrangeColor = [255, 244, 230]; // Light orange background
        
        // Add header with orange gradient effect
        doc.setFillColor(...orangeColor);
        doc.rect(0, 0, 210, 25, 'F');
        
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('UIU Exam Schedule', 105, 15, { align: 'center' });
        
        // Student info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Student ID: ${confirmedStudentId}`, 20, 35);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
        
        // Sort selected courses by date and time
        const sortedCourses = [...selectedCourses].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
        });
        
        // Prepare table data
        const tableData = sortedCourses.map(course => {
            // Get course code and title for better display in PDF
            const courseCode = course.courseCode || extractCourseCode(course.course);
            const courseTitle = course.courseTitle || course.course;
            
            let courseDisplayText = '';
            if (courseCode && courseTitle && courseCode !== courseTitle) {
                courseDisplayText = `${courseCode} - ${courseTitle}`;
            } else {
                courseDisplayText = course.course;
            }
            
            return [
                courseDisplayText,
                course.section,
                course.date,
                course.time,
                course.assignedRoom
            ];
        });
        
        // Create table using autoTable plugin
        doc.autoTable({
            head: [['Course Name', 'Section', 'Date', 'Time', 'Room']],
            body: tableData,
            startY: 55,
            theme: 'grid',
            headStyles: {
                fillColor: orangeColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 12
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [255, 250, 245] // Very light orange
            },
            columnStyles: {
                0: { cellWidth: 50 }, // Course Name
                1: { cellWidth: 25 }, // Section
                2: { cellWidth: 30 }, // Date
                3: { cellWidth: 30 }, // Time
                4: { cellWidth: 25 }  // Room
            },
            margin: { top: 55, left: 20, right: 20 },
            styles: {
                overflow: 'linebreak',
                cellPadding: 5,
                fontSize: 10
            }
        });
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('Good luck with your exams!', 105, 285, { align: 'center' });
            doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
        }
        
        // Generate filename with current date and student ID
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `Exam_Schedule_${confirmedStudentId}_${currentDate}.pdf`;
        
        // Download the PDF
        doc.save(filename);
        
        showSuccess(`PDF downloaded successfully as "${filename}"`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showError('Error generating PDF. Please try again.');
    } finally {
        showLoading(false);
        hideMessages();
    }
}

function showTable() {
    tableContainer.classList.remove('hidden');
    controls.classList.remove('hidden');
    searchSection.classList.remove('hidden');
    updateSortIndicators();
}

function clearData() {
    examData = [];
    selectedCourses = [];
    isFullRoutineVisible = false;
    studentIdConfirmed = false;
    confirmedStudentId = '';
    selectedCourseForSection = null;
    
    tableContainer.classList.add('hidden');
    controls.classList.add('hidden');
    searchSection.classList.add('hidden');
    studentIdSection.classList.add('hidden');
    selectedCoursesSection.classList.add('hidden');
    
    fileInput.value = '';
    courseSearch.value = '';
    courseSection.value = '';
    courseSection.disabled = true;
    courseSection.innerHTML = '<option value="">Select a course first</option>';
    studentId.value = '';
    classRoutinePdf.value = '';
    searchSuggestions.classList.add('hidden');
    extractionProgress.classList.add('hidden');
    
    uploadBtn.disabled = true;
    addCourseBtn.disabled = true;
    confirmStudentIdBtn.disabled = true;
    confirmStudentIdBtn.textContent = 'Confirm Student ID';
    extractCoursesBtn.disabled = true;
    
    toggleRoutineBtn.textContent = 'Show Full Routine';
    toggleRoutineBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
    toggleRoutineBtn.classList.add('bg-gradient-orange');
    
    hideMessages();
}

function showError(message) {
    document.getElementById('errorText').textContent = message;
    errorMessage.classList.remove('hidden');
    successMessage.classList.add('hidden');
}

function showSuccess(message) {
    document.getElementById('successText').textContent = message;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
        uploadBtn.disabled = true;
    } else {
        loading.classList.add('hidden');
        uploadBtn.disabled = false;
    }
}

// Function to populate course sections based on selected course
function populateCourseSections(courseName) {
    // Find all entries for this course
    const courseEntries = examData.filter(exam => 
        exam.course.toLowerCase() === courseName.toLowerCase()
    );
    
    if (courseEntries.length === 0) {
        courseSection.innerHTML = '<option value="">Course not found</option>';
        courseSection.disabled = true;
        return;
    }
    
    // Extract sections from the data
    const sections = new Set();
    
    courseEntries.forEach(exam => {
        if (exam.section) {
            sections.add(exam.section.toString().toUpperCase());
        }
    });
    
    // If no sections found, create default based on number of entries
    if (sections.size === 0) {
        // Create sections based on the number of unique entries for this course
        courseEntries.forEach((exam, index) => {
            // Use alphabetical sections A, B, C, etc.
            const sectionLetter = String.fromCharCode(65 + index); // A, B, C, D, etc.
            if (sectionLetter <= 'Z') {
                sections.add(sectionLetter);
            }
        });
        
        // If still no sections, use default
        if (sections.size === 0) {
            sections.add('A');
        }
    }
    
    // Filter out already selected course-section combinations
    const availableSections = Array.from(sections).filter(section => {
        return !selectedCourses.some(selected => 
            selected.course.toLowerCase() === courseName.toLowerCase() &&
            selected.section === section
        );
    });
    
    // Populate the section dropdown
    courseSection.innerHTML = '<option value="">Select Section</option>';
    
    if (availableSections.length === 0) {
        courseSection.innerHTML = '<option value="">All sections already selected</option>';
        courseSection.disabled = true;
        addCourseBtn.disabled = true;
        return;
    }
    
    // Sort sections (letters first, then numbers)
    const sortedSections = availableSections.sort((a, b) => {
        if (isNaN(a) && isNaN(b)) return a.localeCompare(b);
        if (isNaN(a)) return -1;
        if (isNaN(b)) return 1;
        return parseInt(a) - parseInt(b);
    });
    
    sortedSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = `Section ${section}`;
        courseSection.appendChild(option);
    });
    
    courseSection.disabled = false;
    // Don't disable the button here - let handleCourseSectionInput handle it
    
    // Trigger button state check
    handleCourseSectionInput();
}

// Function to show a helpful message when no search results are found
function showNoResultsMessage(searchTerm) {
    searchSuggestions.innerHTML = '';
    
    const noResultsItem = document.createElement('div');
    noResultsItem.className = 'p-3 text-center text-gray-500 border-b';
    noResultsItem.innerHTML = `
        <div class="text-sm">
            <p class="font-medium">No courses found for "${searchTerm}"</p>
            <p class="text-xs mt-1">Try searching with:</p>
            <ul class="text-xs mt-1 text-left">
                <li>• Course code (e.g., CSE251, MATH101)</li>
                <li>• Course title (e.g., Computer Science, Mathematics)</li>
                <li>• Partial names (e.g., Micro, Calc)</li>
            </ul>
        </div>
    `;
    
    searchSuggestions.appendChild(noResultsItem);
    searchSuggestions.classList.remove('hidden');
}
