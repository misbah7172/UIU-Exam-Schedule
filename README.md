# Exam Schedule Web App

A frontend-only web application that allows users to upload Excel files containing exam schedule data and displays them in a clean, sortable table format.

## Features

- **Excel File Upload**: Upload and parse .xlsx and .xls files
- **Automatic Data Detection**: Intelligently detects columns for Course Name, Date, Time, and Room
- **Enhanced Course Search**: Search by course name, course code, or course title for easy discovery
- **Student ID Management**: Enter your student ID to get personalized exam schedules
- **Section-Based Scheduling**: Add courses with specific sections for accurate room assignments
- **PDF Course Extraction**: Upload your class routine PDF to automatically extract all courses and sections
- **Smart Room Assignment**: Automatically assigns exam rooms based on student ID ranges and course sections
- **PDF Export**: Download your personalized exam timetable as a PDF document
- **Responsive Design**: Works great on desktop and mobile devices
- **Sorting Functionality**: Sort by any column in ascending or descending order
- **Clean UI**: Modern interface built with Tailwind CSS and orange gradient theme
- **Error Handling**: Proper error messages for invalid files
- **No Backend Required**: Pure frontend application using SheetJS and PDF.js

## How to Use

### Method 1: Quick Setup (Fastest - Recommended!) ⚡
1. **Upload Exam Schedule**: Click "Choose File" and select the exam routine Excel file
2. **Parse Data**: Click "Parse Excel File" to process the uploaded file
3. **Auto-Extract Everything**: 
   - Upload your class registration PDF in the "Quick Setup" section
   - Click "🎯 Auto-Extract Everything from PDF"
   - The system automatically extracts:
     - ✅ Your Student ID
     - ✅ All course codes (CSE3421, PMG4101, etc.)
     - ✅ All sections (A, B, C, etc.)
     - ✅ Auto-assigns exam rooms
4. **Download PDF**: Your personalized exam schedule is ready - download it!

### Method 2: Manual Course Selection
1. **Upload Exam Schedule**: Click "Choose File" and select the exam routine Excel file
2. **Parse Data**: Click "Parse Excel File" to process the uploaded file
3. **Enter Student ID**: Input your student ID and confirm it
4. **Search and Add Courses**: 
   - Use the enhanced search to find courses by name, code, or title
   - Select the appropriate section for each course
   - Add courses to your personal schedule
5. **Download PDF**: Generate and download your personalized exam timetable

### Additional Features
6. **View Full Schedule**: Optionally view the complete exam schedule for all courses
7. **Sort Data**: Click on column headers or use the sort controls to organize the data
8. **Clear Data**: Use the "Clear Data" button to reset and upload a new file

## Excel File Format

The application automatically detects columns containing:
- **Course Name**: Columns with headers like "Course", "Subject", "Module", "Exam"
- **Date**: Columns with headers like "Date", "Day", "Datum"
- **Time**: Columns with headers like "Time", "Zeit", "Hour"
- **Room**: Columns with headers like "Room", "Raum", "Location", "Venue"

### Example Excel Structure:
```
Course Name    | Date       | Time  | Room
Mathematics    | 2024-01-15 | 09:00 | Room 101
Physics        | 2024-01-16 | 14:00 | Room 205
Chemistry      | 2024-01-17 | 10:30 | Lab A
```

## Class Routine PDF Format

For automatic course extraction, your class registration PDF should contain:
- **Course Codes**: In format like CSE251, MATH101, ENG102, etc.
- **Sections**: Indicated as "Sec: A", "Section: B", or similar format
- The PDF should be your official class registration/routine document from the university

The system will automatically:
1. Extract all course codes (e.g., CSE251, MATH101)
2. Identify the section for each course
3. Match them with the exam schedule
4. Assign the appropriate exam room based on your student ID

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS for responsive design
- **Excel Parsing**: SheetJS (xlsx library) for client-side Excel file processing
- **PDF Reading**: PDF.js for extracting course data from class routine PDFs
- **PDF Generation**: jsPDF with autoTable plugin for creating personalized exam schedules
- **No Server Required**: Runs entirely in the browser

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Modern mobile browsers

## Files Structure

- `index.html` - Main HTML file
- `script.js` - JavaScript functionality
- `styles.css` - Additional custom styles
- `README.md` - This documentation

## Development

To modify or extend the application:

1. Edit HTML structure in `index.html`
2. Modify JavaScript functionality in `script.js`
3. Customize styles in `styles.css`
4. Test with various Excel file formats

## Error Handling

The application handles common issues:
- Invalid file formats
- Empty or corrupted Excel files
- Missing column headers
- Malformed data

## Future Enhancements

Possible improvements:
- Export functionality (PDF, CSV)
- Filter by date range
- Calendar view
- Print-friendly layout
- Multiple file upload
- Data validation and cleaning

## License

This project is open source and available under the MIT License.
