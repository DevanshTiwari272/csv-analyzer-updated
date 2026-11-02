import express from "express";
import app from "./src/app.js";
import multer from "multer";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const uploadDir = path.join(os.tmpdir(), "csv-analyzer-uploads");
const plotDir = path.join(__dirname, "plots");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(plotDir, { recursive: true });

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isCsv = file.originalname.toLowerCase().endsWith(".csv") ||
            file.mimetype === "text/csv" ||
            file.mimetype === "application/vnd.ms-excel";

        cb(isCsv ? null : new Error("Please upload a CSV file"), isCsv);
    }
});

let filePath = null;
let csvData = null;
let charts = [];

app.use("/plots", express.static(plotDir));


function runPythonFeature(args, res) {
    const python = process.env.PYTHON_PATH || "python";
    const child = spawn(python, args, { cwd: __dirname });

    let output = "";
    let errorOutput = "";
    let responded = false;

    child.stdout.on("data", data => output += data.toString());
    child.stderr.on("data", data => errorOutput += data.toString());

    child.on("error", error => {
        console.error("Could not start Python:", error);
        if (!responded && !res.headersSent) {
            responded = true;
            res.status(500).json({ error: "Could not start Python. Check your Python installation." });
        }
    });

    child.on("close", code => {
        if (responded || res.headersSent) return;

        if (code !== 0) {
            console.error("Python feature error:", errorOutput);
            responded = true;
            return res.status(500).json({
                error: "Python feature failed.",
                details: errorOutput.trim().slice(-1500)
            });
        }

        try {
            const result = JSON.parse(output);
            responded = true;

            if (result.error) return res.status(400).json(result);
            res.json(result);
        } catch {
            responded = true;
            res.status(500).json({ error: "Invalid response from Python." });
        }
    });
}

app.get("/", (req, res) => {
    res.send("CSV Analyzer API is running.");
});

app.post("/upload", (req, res) => {
    upload.single("file")(req, res, err => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Please choose a CSV file." });
        }

        // Remove the previously uploaded CSV after a new upload succeeds.
        if (filePath && fs.existsSync(filePath)) {
            fs.unlink(filePath, () => {});
        }

        filePath = req.file.path;
        csvData = null;
        charts = [];

        const python = process.env.PYTHON_PATH || "python";
        const child = spawn(python, ["analize.py", filePath, plotDir], { cwd: __dirname });

        let output = "";
        let errorOutput = "";
        let responded = false;

        child.stdout.on("data", data => output += data.toString());
        child.stderr.on("data", data => errorOutput += data.toString());

        child.on("error", error => {
            console.error("Could not start Python:", error);
            if (!responded && !res.headersSent) {
                responded = true;
                res.status(500).json({ error: "Could not start Python. Check your Python installation." });
            }
        });

        child.on("close", code => {
            if (responded || res.headersSent) return;

            if (code !== 0) {
                console.error("Python analysis error:", errorOutput);
                responded = true;
                return res.status(500).json({
                    error: "CSV analysis failed.",
                    details: errorOutput.trim().slice(-1500)
                });
            }

            try {
                const result = JSON.parse(output);
                responded = true;

                if (result.error) {
                    return res.status(400).json(result);
                }

                csvData = result;
                charts = (result.charts || []).map(chart => ({
                    ...chart,
                    url: `/plots/${chart.filename}`
                }));
                csvData.charts = charts;

                res.json(csvData);
            } catch (error) {
                console.error("Invalid Python output:", output, errorOutput);
                responded = true;
                res.status(500).json({ error: "Could not read Python analysis response." });
            }
        });
    });
});

// Count exact matches in a selected column.
app.post("/count", (req, res) => {
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).json({ error: "Upload a CSV file first." });
    }

    const { column, value } = req.body;

    if (typeof column !== "string" || value === undefined || String(value).length === 0) {
        return res.status(400).json({ error: "Select a column and enter a value." });
    }

    runPythonFeature(["features.py", "count", filePath, column, String(value)], res);
});

// Generate a chart chosen by the user.
app.post("/custom-plot", (req, res) => {
    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).json({ error: "Upload a CSV file first." });
    }

    const { chartType, column, yColumn } = req.body;
    const allowedTypes = ["histogram", "bar", "boxplot", "scatter"];

    if (!allowedTypes.includes(chartType) || typeof column !== "string" || !column) {
        return res.status(400).json({ error: "Choose a valid chart type and column." });
    }

    if (chartType === "scatter" && (typeof yColumn !== "string" || !yColumn)) {
        return res.status(400).json({ error: "Choose both X and Y columns for a scatter plot." });
    }

    const filename = `${randomUUID()}.png`;
    const outputPath = path.join(plotDir, filename);
    const args = ["features.py", "plot", filePath, chartType, column, outputPath];

    if (chartType === "scatter") args.push(yColumn);

    const python = process.env.PYTHON_PATH || "python";
    const child = spawn(python, args, { cwd: __dirname });

    let output = "";
    let errorOutput = "";
    let responded = false;

    child.stdout.on("data", data => output += data.toString());
    child.stderr.on("data", data => errorOutput += data.toString());

    child.on("error", error => {
        console.error(error);
        if (!responded && !res.headersSent) {
            responded = true;
            res.status(500).json({ error: "Could not start Python." });
        }
    });

    child.on("close", code => {
        if (responded || res.headersSent) return;

        if (code !== 0) {
            console.error(errorOutput);
            responded = true;
            return res.status(500).json({ error: "Could not generate plot.", details: errorOutput.trim().slice(-1500) });
        }

        try {
            const result = JSON.parse(output);
            responded = true;

            if (result.error) return res.status(400).json(result);

            res.json({
                ...result,
                url: `/plots/${filename}`
            });
        } catch {
            responded = true;
            res.status(500).json({ error: "Invalid response from Python." });
        }
    });
});

app.get("/csv", (req, res) => {
    if (!csvData) {
        return res.status(404).json({ error: "Upload a CSV file first." });
    }

    res.json({
        overview: csvData.overview,
        preview: csvData.preview
    });
});

app.get("/plots", (req, res) => {
    if (!charts.length) {
        return res.status(404).json({ error: "No charts generated yet." });
    }

    res.json(charts);
});

// Start server.
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
