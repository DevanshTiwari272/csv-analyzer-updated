# CSV Analyzer

A small CSV analysis app using HTML, CSS, JavaScript, Node.js/Express, Python, Pandas and Matplotlib.

## Features

- Upload a CSV file
- Dataset overview: rows, columns, missing values and duplicate rows
- First 10 rows preview
- Automatic histograms, bar charts and box plots
- Search for an exact value in a selected column and count matches
- Generate custom histogram, bar, box and scatter plots

## Project structure

```text
csv-analyzer/
├── src/
│   └── app.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── plots/
├── analize.py
├── features.py
├── server.js
├── package.json
└── requirements.txt
```

## Setup (Windows)

### 1. Install Node dependencies

Open a terminal in the project folder:

```bash
npm install
```

### 2. Install Python dependencies

```bash
python -m pip install -r requirements.txt
```

If `python` is not recognized, use the Python launcher:

```bash
py -m pip install -r requirements.txt
```

The server starts Python using the command `python` by default. If your computer uses `py` instead, set `PYTHON_PATH` to the full path of `python.exe`, or change the `spawn` command in `server.js` to use `py` with the appropriate arguments.

### 3. Start the backend

```bash
npm start
```

Backend: http://localhost:3000

### 4. Start the frontend

Open `frontend/index.html` with VS Code Live Server. The CORS configuration allows these local origins:

- http://127.0.0.1:1235
- http://localhost:1235
- http://127.0.0.1:5500
- http://localhost:5500

If Live Server uses another port, add that exact origin to the list in `src/app.js`.

## Notes

- Search uses exact, case-sensitive text matching. For example, `Delhi` and `delhi` are different values.
- Histogram and box plots require numeric columns.
- Scatter plots require two numeric columns.
- The current app stores the latest uploaded CSV path and analysis state in server memory. It is intended as a local, single-user project, not a multi-user deployment.
- CSV uploads are limited to 50 MB.
- Uploaded CSV files are stored in the operating system's temporary directory. Generated charts are stored in `plots/`.
