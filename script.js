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
    const sectionCol = findColumnIndex(headers, ['section', 'sec', 'group', 'class']);
    const dateCol = findColumnIndex(headers, ['date', 'day', 'datum']);
    const timeCol = findColumnIndex(headers, ['zeit', 'time', 'hour']);
    const roomCol = findColumnIndex(headers, ['room', 'raum', 'location', 'venue']);
    const studentIdCol = findColumnIndex(headers, ['student', 'id', 'studentid', 'student_id', 'matrikel']);
    
    // Process data rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row)) continue;
        
        const course = getCellValue(row, courseCol);
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
        
        examData.push({
            course: course || 'N/A',
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
    showSuccess(`Student ID confirmed: ${studentIdValue}. You can now add courses with sections.`);
    hideMessages();
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
    courseSearch.placeholder = "Search courses by name or code...";
    
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
    
    // Simple search - just look for the term in course names
    const matchingCourses = examData.filter(exam => {
        const courseName = exam.course.toLowerCase();
        return courseName.includes(searchTerm);
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
            course.course.toLowerCase() === searchTerm
        );
        
        if (exactMatch) {
            selectedCourseForSection = exactMatch.course;
            populateCourseSections(exactMatch.course);
        }
    } else {
        searchSuggestions.classList.add('hidden');
        addCourseBtn.disabled = true;
        courseSection.disabled = true;
        courseSection.innerHTML = '<option value="">No matching course found</option>';
        selectedCourseForSection = null;
    }
}

function extractCourseCode(courseName) {
    // Extract course code from course name (e.g., "CSE251" from "Computer Science CSE251")
    const codeMatch = courseName.match(/[A-Z]{2,4}\d{2,4}/);
    return codeMatch ? codeMatch[0] : '';
}

function showSuggestions(courses) {
    searchSuggestions.innerHTML = '';
    
    courses.slice(0, 5).forEach(exam => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        
        const courseCode = extractCourseCode(exam.course);
        const displayText = courseCode ? `${exam.course} (${courseCode})` : exam.course;
        
        suggestionItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium">${displayText}</span>
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

function findColumnIndex(headers, searchTerms) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (searchTerms.some(term => header.includes(term))) {
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
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${exam.course}</td>
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
    if (event.key === 'Enter') {
        event.preventDefault();
        if (!addCourseBtn.disabled) {
            addSelectedCourse();
        }
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
        courseTag.innerHTML = `
            <div class="flex-1">
                <h5 class="font-medium text-orange-900">${courseWithSection.course}</h5>
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
        const tableData = sortedCourses.map(course => [
            course.course,
            course.section,
            course.date,
            course.time,
            course.assignedRoom
        ]);
        
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
    searchSuggestions.classList.add('hidden');
    
    uploadBtn.disabled = true;
    addCourseBtn.disabled = true;
    confirmStudentIdBtn.disabled = true;
    confirmStudentIdBtn.textContent = 'Confirm Student ID';
    
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
