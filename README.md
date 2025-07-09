# Exam Schedule Web App

A frontend-only web application that allows users to upload Excel files containing exam schedule data and displays them in a clean, sortable table format.

## Features

- **Excel File Upload**: Upload and parse .xlsx and .xls files
- **Automatic Data Detection**: Intelligently detects columns for Course Name, Date, Time, and Room
- **Enhanced Course Search**: Search by course name, course code, or course title for easy discovery
- **Student ID Management**: Enter your student ID to get personalized exam schedules
- **Section-Based Scheduling**: Add courses with specific sections for accurate room assignments
- **Smart Room Assignment**: Automatically assigns exam rooms based on student ID ranges and course sections
- **PDF Export**: Download your personalized exam timetable as a PDF document
- **Responsive Design**: Works great on desktop and mobile devices
- **Sorting Functionality**: Sort by any column in ascending or descending order
- **Clean UI**: Modern interface built with Tailwind CSS and orange gradient theme
- **Error Handling**: Proper error messages for invalid files
- **No Backend Required**: Pure frontend application using SheetJS

## How to Use

1. **Open the Application**: Open `index.html` in any modern web browser
2. **Upload Excel File**: Click "Choose File" and select your Excel file (.xlsx or .xls)
3. **Parse Data**: Click "Parse Excel File" to process the uploaded file
4. **Enter Student ID**: Input your student ID and confirm it
5. **Search and Add Courses**: 
   - Use the enhanced search to find courses by name, code, or title
   - Select the appropriate section for each course
   - Add courses to your personal schedule
6. **Download PDF**: Generate and download your personalized exam timetable
7. **View Full Schedule**: Optionally view the complete exam schedule for all courses
8. **Sort Data**: Click on column headers or use the sort controls to organize the data
9. **Clear Data**: Use the "Clear Data" button to reset and upload a new file

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

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS for responsive design
- **Excel Parsing**: SheetJS (xlsx library) for client-side Excel file processing
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
