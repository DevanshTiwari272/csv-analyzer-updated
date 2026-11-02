const API = "http://localhost:3000";

const fileInput = document.getElementById("file");
const uploadButton = document.getElementById("upload");
const statusText = document.getElementById("status");

uploadButton.addEventListener("click", uploadCSV);
document.getElementById("search-button").addEventListener("click", searchValue);
document.getElementById("generate-plot").addEventListener("click", generateCustomPlot);

async function uploadCSV() {
    const file = fileInput.files[0];

    if (!file) {
        statusText.textContent = "Please select a CSV file first.";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    uploadButton.disabled = true;
    statusText.textContent = "Uploading and analyzing CSV...";

    try {
        const response = await fetch(`${API}/upload`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Upload failed.");

        showOverview(result.overview);
        showTable(result.preview);
        showCharts(result.charts);
        populateColumnOptions(result.overview.columns);

        document.getElementById("results-section").hidden = false;
        statusText.textContent = "CSV analyzed successfully.";
    } catch (error) {
        console.error(error);
        statusText.textContent = error.message;
    } finally {
        uploadButton.disabled = false;
    }
}

function showOverview(overview) {
    document.getElementById("total-rows").textContent = overview.total_rows;
    document.getElementById("total-columns").textContent = overview.total_columns;
    document.getElementById("missing-values").textContent = overview.missing_values;
    document.getElementById("duplicate-rows").textContent = overview.duplicate_rows;

    const info = document.getElementById("column-info");
    info.replaceChildren();

    overview.columns.forEach(column => {
        const chip = document.createElement("span");
        chip.className = "column-chip";
        chip.textContent = `${column} (${overview.data_types[column] || "unknown"})`;
        info.appendChild(chip);
    });
}

function showTable(rows) {
    const table = document.getElementById("data-table");
    table.replaceChildren();

    if (!rows || rows.length === 0) {
        table.textContent = "No rows to preview.";
        return;
    }

    const columns = Object.keys(rows[0]);
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    columns.forEach(column => {
        const th = document.createElement("th");
        th.textContent = column;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");
    rows.forEach(row => {
        const tr = document.createElement("tr");

        columns.forEach(column => {
            const td = document.createElement("td");
            td.textContent = row[column] ?? "";
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.append(thead, tbody);
}

function showCharts(charts) {
    const container = document.getElementById("plot-container");
    container.replaceChildren();

    if (!charts || charts.length === 0) {
        container.textContent = "No automatic charts could be generated for this dataset.";
        return;
    }

    charts.forEach(chart => {
        const card = document.createElement("article");
        card.className = "chart-card";

        const heading = document.createElement("h3");
        heading.textContent = `${chart.type}: ${chart.column}`;

        const image = document.createElement("img");
        image.src = `${API}${chart.url}`;
        image.alt = `${chart.type} of ${chart.column}`;

        card.append(heading, image);
        container.appendChild(card);
    });
}

function populateColumnOptions(columns) {
    const dropdowns = [
        document.getElementById("search-column"),
        document.getElementById("plot-column"),
        document.getElementById("plot-y-column")
    ];

    dropdowns.forEach(dropdown => {
        const firstOption = dropdown.options[0];
        dropdown.replaceChildren(firstOption);

        columns.forEach(column => {
            const option = document.createElement("option");
            option.value = column;
            option.textContent = column;
            dropdown.appendChild(option);
        });
    });
}

async function searchValue() {
    const column = document.getElementById("search-column").value;
    const value = document.getElementById("search-value").value;
    const resultText = document.getElementById("search-result");

    if (!column || value.trim() === "") {
        resultText.textContent = "Select a column and enter a value.";
        return;
    }

    resultText.textContent = "Searching...";

    try {
        const response = await fetch(`${API}/count`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column, value })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Search failed.");

        resultText.textContent =
            `"${result.value}" appears ${result.count} times in "${result.column}".`;
    } catch (error) {
        console.error(error);
        resultText.textContent = error.message;
    }
}

async function generateCustomPlot() {
    const chartType = document.getElementById("chart-type").value;
    const column = document.getElementById("plot-column").value;
    const yColumn = document.getElementById("plot-y-column").value;
    const status = document.getElementById("plot-status");
    const container = document.getElementById("custom-plot-container");

    if (!column) {
        status.textContent = "Please select a column.";
        return;
    }

    if (chartType === "scatter" && !yColumn) {
        status.textContent = "Please select a Y column too.";
        return;
    }

    status.textContent = "Generating plot...";
    container.replaceChildren();

    try {
        const response = await fetch(`${API}/custom-plot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chartType, column, yColumn })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not generate plot.");

        const image = document.createElement("img");
        image.src = `${API}${result.url}`;
        image.alt = `${chartType} for ${column}`;
        container.appendChild(image);

        status.textContent = "Custom plot generated successfully.";
    } catch (error) {
        console.error(error);
        status.textContent = error.message;
    }
}
