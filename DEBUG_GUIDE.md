# PDF Extraction Debugging Guide

## How to Debug PDF Extraction Issues

If the PDF extraction is not working, follow these steps to diagnose the problem:

### Step 1: Open Browser Console
1. Open the application in your browser
2. Press `F12` or right-click and select "Inspect"
3. Click on the "Console" tab

### Step 2: Upload Files and Check Console
1. Upload the exam schedule Excel file
2. Enter and confirm your student ID
3. Upload your class routine PDF
4. Click "Extract Courses from PDF"
5. **Watch the console output carefully**

### What to Look For in Console

The console will show detailed information:

```
=== PDF Text Extraction ===
Total pages: 2
Extracted text preview (first 500 chars): [shows first 500 characters]
All text items: [array of all text items]

=== Starting Course Parsing ===
Found course code: CSE251 at index 45
Found section: A for CSE251
Added course: CSE251 - A
...

=== Final Extracted Courses ===
[
  { courseCode: "CSE251", section: "A" },
  { courseCode: "MATH101", section: "B" }
]

=== Starting Course Matching ===
Trying to match: CSE251 (Section: A)
✓ Matched CSE251 with exam course: Computer Science CSE251
✓ Added to matched courses: Computer Science CSE251 (A)
...
```

## Common Issues and Solutions

### Issue 1: "No courses found in the PDF"

**Symptoms:**
- Console shows: `Failed to extract courses`
- PDF text is shown but no course codes detected

**Possible Causes:**
1. PDF doesn't contain standard course codes (like CSE251, MATH101)
2. Course codes are in images, not text
3. PDF is scanned/image-based, not text-based

**Solutions:**
- Check if the PDF text in console contains course codes
- Look at the "Extracted text preview" - does it show readable text?
- If text is garbled or empty, your PDF might be image-based (not supported)
- Try manual course entry instead

### Issue 2: "Found courses but none match exam schedule"

**Symptoms:**
- Console shows: `Found X courses in PDF but none match`
- Lists extracted courses like CSE251, MATH101

**Possible Causes:**
1. Wrong exam schedule file uploaded
2. Course codes don't match between PDF and Excel
3. Exam schedule doesn't have those courses

**Solutions:**
- Check console: Compare "Courses to match" with "Available exam data"
- Verify you uploaded the correct exam routine Excel file
- Check if course codes in PDF match those in exam schedule
- Some courses might not have scheduled exams yet

### Issue 3: "No sections detected"

**Symptoms:**
- Console shows: `Course CSE251 found but no section detected`

**Possible Causes:**
1. Section information not in standard format
2. Section is too far from course code in PDF

**Solutions:**
- Check if your PDF has section info near course codes
- Section should be like: "Sec: A", "Section: B", etc.
- Try adding the course manually with correct section

### Issue 4: Only some courses extracted

**Symptoms:**
- Only 2-3 courses found, but you have 5-6 courses

**Possible Causes:**
1. Some course-section pairs couldn't be matched
2. PDF format varies for different courses

**Solutions:**
- Check console for warnings about specific courses
- Add missing courses manually
- The extracted ones are still valid!

## Understanding Console Output

### ✓ Good Signs:
- `Found course code: CSE251`
- `Found section: A`
- `Added course: CSE251 - A`
- `✓ Matched CSE251 with exam course`
- `✓ Added to matched courses`

### ⚠️ Warning Signs:
- `Course CSE251 found but no section detected` - Section missing
- `No exact match for CSE251` - May still work with partial match
- `✗ No match found for: CSE251` - Course not in exam schedule

### ❌ Error Signs:
- `No courses found in the PDF` - Extraction failed
- `Extracted text preview: (empty)` - PDF is image-based
- `Error: Failed to load PDF` - Corrupted file

## Manual Verification

To verify what's in your PDF:
1. Open the PDF in Adobe Reader or browser
2. Try to select/copy text from it
3. If you can't select text → PDF is image-based (won't work)
4. If you can select text → Should work (check format)

## Course Code Formats Supported

The system recognizes these formats:
- `CSE251` (standard)
- `CSE 251` (with space)
- `CSE-251` (with dash)
- `CSE_251` (with underscore)
- `Course: CSE251` (with label)

## Section Formats Supported

The system recognizes:
- `Sec: A`
- `Section: A`
- `Sect A`
- `Grp: A`
- `A` (single letter)

## Still Having Issues?

1. **Check the full console output** - It tells you exactly what's happening
2. **Verify your files** - Correct exam schedule and class routine
3. **Try manual entry** - Always works as fallback
4. **Share console output** - Contact developer with console logs
5. **Check file format** - PDF should be text-based, not scanned images

## Tips for Best Results

1. ✅ Use official UIU class registration PDF
2. ✅ Ensure PDF contains text (not images)
3. ✅ Upload correct exam schedule Excel file first
4. ✅ Confirm student ID before uploading PDF
5. ✅ Check console for detailed feedback
6. ✅ Use manual method as reliable fallback

---

**Remember:** The console is your friend! It shows exactly what's being extracted and why something might not be working.
