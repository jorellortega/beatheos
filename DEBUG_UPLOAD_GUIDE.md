# Upload Beat Debug Guide

## Overview
Comprehensive debug logging has been added to `/components/beat-upload/MockBeatUploadForm.tsx` to help identify upload issues for singles, albums, multiple uploads, and metadata.

## How to Use

### Viewing Debug Logs
1. Open your browser's Developer Console (F12 or Cmd+Option+I)
2. Navigate to http://localhost:3000/upload-beat
3. Filter console logs by typing `[DEBUG` in the console filter box
4. Perform your upload operations

### Debug Categories

#### 🔵 Component Lifecycle
- **[DEBUG MockBeatUploadForm]** - Component mount, user authentication
- **[DEBUG useEffect fetchDrafts]** - Draft loading and errors

#### 📂 File Drops & State Management
- **[DEBUG smartOnDrop]** - Files dropped in Upload Beat tab
  - Shows file count, names, types, sizes
  - Shows classification (MP3, WAV, ZIP, Image)
  - Shows which case was matched (single, pair, multiple)
  
- **[DEBUG filesTabOnDrop]** - Files dropped in Files tab
  - Shows all dropped files with metadata
  - Shows licensing initialization

- **[DEBUG setMp3File]** - MP3 file state changes
  - Shows when MP3 is set or cleared
  
- **[DEBUG setWavFile]** - WAV file state changes
  - Shows when WAV is set or cleared
  
- **[DEBUG setStemsFile]** - Stems file state changes
  - Shows when Stems are set or cleared
  
- **[DEBUG setCoverArt]** - Cover art state changes
  - Shows when cover art is set or cleared

- **[DEBUG FileUploader {label}]** - Individual file uploader components
  - Shows when files are dropped on specific uploaders
  - Shows file acceptance/rejection

#### 📤 Single Upload Flow (Frontend)
- **[DEBUG handleSubmit]** - Complete single beat upload
  - Shows upload type: SINGLE
  - Shows metadata (title, description, genre, BPM, key, tags)
  - Shows file sizes and names
  - Shows API response status
  - Shows success/error messages

#### 🔧 API/Backend Upload Flow
- **[DEBUG API] EXTRACTING FILES FROM FORMDATA** - Server receives files
  - Shows which files were received (mp3File, wavFile, stemsFile, coverArt)
  - Shows file details (name, size, type) or NULL
  
- **[DEBUG API] UPLOADING WAV FILE** - WAV upload process
  - Shows file details and upload path
  - Shows upload errors or success URL
  
- **[DEBUG API] UPLOADING STEMS FILE** - Stems upload process
  - Shows file details and upload path
  - Shows upload errors or success URL
  
- **[DEBUG API] UPLOADING COVER ART** - Cover art upload process
  - Shows file details and upload path
  - Shows upload errors or success URL
  
- **[DEBUG API] PREPARING BEAT DATA** - Final data summary
  - Shows which URLs are SET vs NULL before database insert

#### 📦 Batch/Multiple Upload Flow
- **[DEBUG handleBatchPublish]** - Batch upload process
  - Shows upload type: BATCH/MULTIPLE
  - Shows selected file count
  - Shows per-file processing (X/Y format)
  - Shows licensing info per file
  - Shows success/error count summary

#### 🎯 File Selection
- **[DEBUG handleCheckboxChange]** - File selection/deselection
  - Shows which file was checked/unchecked
  - Shows updated selection array

#### 🔗 File Pairing
- **[DEBUG handlePair]** - Pairing MP3/WAV/ZIP/Cover files
  - Shows selected files for pairing
  - Shows file types being paired
  - Shows final paired beat structure

#### 🖼️ Cover Art Management
- **[DEBUG Set as Cover]** - Setting a file as cover art
  - Shows file details being set as cover
  
- **[DEBUG handleApplyCoverToSelected]** - Applying cover to multiple files
  - Shows cover art details
  - Shows which files will be updated
  - Shows update count

#### ✏️ File Editing
- **[DEBUG handleEditFile]** - Starting file edit
- **[DEBUG handleSaveFileTitle]** - Saving title changes
- **[DEBUG handleDeleteAudioFile]** - Deleting files
- **[DEBUG handleBatchEditAll]** - Batch edit mode
- **[DEBUG handleBatchSave]** - Saving batch edits
- **[DEBUG handleBatchCancel]** - Canceling batch edits

#### 📜 Licensing
- **[DEBUG useEffect licensing]** - Default licensing initialization
  - Shows which files received default licensing
  - Shows default license values

#### 🔀 Tab Navigation
- **[DEBUG Tab Change]** - Switching between tabs
  - Shows which tab was activated

## Recent Fixes

### ✅ Fixed: Auto-Submit on Enter Key
**Issue**: Form was submitting automatically when pressing Enter in input fields.

**Fix**: Added `onKeyDown` handler to the form that prevents Enter key from submitting. Now only the "Publish Beat" button triggers submission.

**Debug Logs**:
- `[DEBUG Form] Enter key pressed in input field - PREVENTED auto-submit`
- `[DEBUG Submit Button] Upload button clicked`

### ✅ Fixed: Single File Uploads Not Accumulating
**Issue**: When uploading files one at a time (e.g., WAV first, then MP3), the previously uploaded file would disappear.

**Fix**: Modified `smartOnDrop` to NOT clear other file slots when uploading a single file. Now you can:
- Upload a WAV file first
- Then upload an MP3 file
- Both files are retained and visible
- Same applies for ZIP (stems) and cover art

**Behavior**:
- Single file drops: Adds to the appropriate slot without clearing others
- Multiple file drops at once: Replaces all files (original behavior)

## Common Use Cases

### Testing Single Upload
1. Go to http://localhost:3000/upload-beat
2. Open console and filter by `[DEBUG handleSubmit]`
3. Upload a single file
4. Check logs for:
   - File metadata
   - API call status
   - Response data

### Testing Sequential File Uploads (WAV + MP3 + Cover)
1. Go to http://localhost:3000/upload-beat
2. Open console and filter by `[DEBUG smartOnDrop]`
3. Drag and drop a WAV file
4. Check logs: Should say "Setting WAV, keeping existing MP3 and Stems"
5. Drag and drop an MP3 file
6. Check logs: Should say "Setting MP3, keeping existing WAV and Stems"
7. Verify both files are visible in the form
8. Optionally drag and drop a cover image
9. Verify all three files are retained

### Testing Multiple Uploads (Album)
1. Switch to "Files" tab
2. Open console and filter by `[DEBUG handleBatchPublish]`
3. Drop multiple files
4. Select files and click "Publish"
5. Check logs for:
   - Total file count
   - Per-file processing
   - Success/error counts

### Testing Metadata Issues
1. Filter console by `[DEBUG handleSubmit]` or `[DEBUG handleBatchPublish]`
2. Look for metadata section showing:
   - Title, description, genre, BPM, key
   - Tags array
   - Licensing object
   - File names and sizes

### Testing File Pairing
1. Filter console by `[DEBUG handlePair]`
2. Drop multiple files (MP3 + WAV + Cover, etc.)
3. Select files and click "Pair"
4. Check logs for paired components

### Testing Cover Art Application
1. Filter console by `[DEBUG handleApplyCoverToSelected]` or `[DEBUG Set as Cover]`
2. Upload image file
3. Set as cover or apply to selected files
4. Check logs for which files received cover art

## Troubleshooting Guide

### If Upload Fails
Look for these debug sections in order:
1. **[DEBUG handleSubmit]** - Check if it started
2. Check metadata values - are they all present?
3. Check file sizes - are they reasonable?
4. Check API Response status - what error was returned?

### If Batch Upload Fails
1. **[DEBUG handleBatchPublish]** - Check selected file count
2. Look for per-file processing logs
3. Check which file failed (error status)
4. Look at the summary (successful vs failed count)

### If Files Not Appearing
1. **[DEBUG smartOnDrop]** or **[DEBUG filesTabOnDrop]** - Were files detected?
2. Check file classification - did it match expected type?
3. Check which case was matched

### If Metadata Missing
1. **[DEBUG handleSubmit]** or **[DEBUG handleBatchPublish]**
2. Look at metadata section
3. Check if values are empty strings or null

### If Licensing Issues
1. **[DEBUG useEffect licensing]** - Check if defaults were applied
2. **[DEBUG handleBatchPublish]** - Check per-file licensing info

### If WAV/Stems/Cover Art Not Uploading (showing as null)
**This is a critical issue to debug! Check BOTH frontend AND backend logs.**

#### STEP 1: Check Frontend (Browser Console)

1. **Check file state when submitting:**
   - Look for `[DEBUG handleSubmit] Current files state:` at the very start of submission
   - Check if `wavFile`, `stemsFile`, and `coverArt` show file objects or null
   
2. **If files are null in state:**
   - Look back through logs for `[DEBUG setWavFile]`, `[DEBUG setStemsFile]`, `[DEBUG setCoverArt]`
   - Check if these were ever called with file data
   - Check if they were later called with `null` (which would clear them)
   
3. **If files show in state but not in FormData:**
   - Look for `[DEBUG handleSubmit] Adding files to FormData:`
   - Check if WAV/Stems/Cover say "SKIPPED" even though they should be present
   
4. **Check for conflicts:**
   - Look for multiple calls to setter functions
   - Check if smartOnDrop is running and clearing files
   - Check if FileUploader components are interfering

#### STEP 2: Check Backend (Terminal/Server Console)

**Look for these logs in your terminal where Next.js is running:**

1. **Check if files were received by API:**
   - Look for `[DEBUG API] ========== EXTRACTING FILES FROM FORMDATA ==========`
   - Check `[DEBUG API] Files received from FormData:`
   - **Are wavFile, stemsFile, coverArt showing as NULL?**
   
2. **If files are NULL on the backend:**
   - **Problem:** Files didn't make it through the network request
   - Check if FormData was built correctly on frontend
   - This is rare - likely a Next.js or network issue
   
3. **If files ARE present on backend, check upload attempts:**
   - Look for `[DEBUG API] ========== UPLOADING WAV FILE ==========`
   - Look for `[DEBUG API] ========== UPLOADING STEMS FILE ==========`
   - Look for `[DEBUG API] ========== UPLOADING COVER ART ==========`
   - **Are these sections missing? That means the `if` check failed.**
   
4. **Check for upload errors:**
   - Look for `[DEBUG API] WAV upload ERROR:`
   - Look for `[DEBUG API] Stems upload ERROR:`
   - Look for `[DEBUG API] Cover art upload ERROR:`
   - **These will show Supabase storage errors (permissions, size limits, etc.)**
   
5. **Check final URLs:**
   - Look for `[DEBUG API] ========== PREPARING BEAT DATA ==========`
   - Check which URLs are `SET` vs `NULL`
   - This tells you which files successfully uploaded

**Example of what you should see in a successful upload:**
```
[DEBUG setWavFile] Setting WAV file: { name: "beat.wav", size: 45234567 }
[DEBUG setMp3File] Setting MP3 file: { name: "beat.mp3", size: 5234567 }
[DEBUG setCoverArt] Setting Cover Art: { name: "cover.jpg", size: 234567 }
[DEBUG handleSubmit] Current files state: {
  mp3File: { name: "beat.mp3", ... },
  wavFile: { name: "beat.wav", ... },
  coverArt: { name: "cover.jpg", ... }
}
[DEBUG handleSubmit] Adding files to FormData:
  - MP3: beat.mp3
  - WAV: beat.wav
  - Cover Art: cover.jpg
```

### If Form Auto-Submits
1. **Check for:** `[DEBUG Form] Enter key pressed in input field - PREVENTED auto-submit`
   - If you see this, the prevention is working
   - If you DON'T see this and form submits, there's another cause
   
2. **Check what triggered submit:**
   - Look for `[DEBUG Submit Button] Upload button clicked`
   - If submission happens without this log, something else triggered it

## Log Format Examples

```
[DEBUG smartOnDrop] Files dropped: 3
[DEBUG smartOnDrop] File 1: { name: "beat.mp3", type: "audio/mpeg", size: 5242880 }
[DEBUG smartOnDrop] Case: Multiple files -> Adding to Files tab

[DEBUG handleSubmit] ========== SINGLE BEAT UPLOAD STARTED ==========
[DEBUG handleSubmit]   - Title: My Beat
[DEBUG handleSubmit]   - MP3 File: beat.mp3 (5.00 MB)
[DEBUG handleSubmit] API Response status: 200

[DEBUG handleBatchPublish] ========== Processing file 1/5 ==========
[DEBUG handleBatchPublish] File object found: { title: "Beat 1", hasFile: true, licensing: {...} }
```

## Notes
- All debug logs use `console.log` for normal flow
- Error conditions use `console.error`
- Each major function has clear START/FINISHED delimiters
- File sizes are shown in MB for audio, KB for images
- Licensing is tracked at initialization and upload time

