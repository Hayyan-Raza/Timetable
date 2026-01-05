---
description: Build and package the application into a portable executable
---

This workflow packages the React Frontend and Python Backend into a single `.exe` file.

## Prerequisites
1.  **Node.js** installed (v18+ recommended).
2.  **Python 3.10+** installed.
3.  **Dependencies** installed:
    ```powershell
    npm install
    cd backend
    pip install -r requirements.txt
    pip install pyinstaller
    cd ..
    ```

## Build Command

To build everything (Backend + Frontend + Electron Packaging), run this single command in the project root:

```powershell
npm run package
```

// turbo
npm run package

## Output
The executable will be located in:
`release/University Timetable Dashboard-X.X.X-Portable.exe`
