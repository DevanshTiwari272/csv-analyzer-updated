import sys
import json
import os
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def main():
    file_path = sys.argv[1]
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    df = pd.read_csv(file_path)

    numeric_columns = df.select_dtypes(include=["number"]).columns.tolist()
    categorical_columns = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()

    charts = []

    # Histograms for numeric columns
    for i, column in enumerate(numeric_columns):
        filename = f"histogram_{i}.png"
        plt.figure(figsize=(8, 5))
        df[column].dropna().hist(bins=10)
        plt.title(f"Histogram of {column}")
        plt.xlabel(column)
        plt.ylabel("Frequency")
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, filename))
        plt.close()
        charts.append({
            "type": "histogram",
            "column": column,
            "filename": filename
        })

    # Bar charts for categorical columns
    for i, column in enumerate(categorical_columns):
        filename = f"barchart_{i}.png"
        counts = df[column].astype(str).value_counts().head(10)
        if not counts.empty:
            plt.figure(figsize=(8, 5))
            counts.plot(kind="bar")
            plt.title(f"Top Values in {column}")
            plt.xlabel(column)
            plt.ylabel("Count")
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, filename))
            plt.close()
            charts.append({
                "type": "bar",
                "column": column,
                "filename": filename
            })

    # Box plots for numeric columns
    for i, column in enumerate(numeric_columns):
        filename = f"boxplot_{i}.png"
        plt.figure(figsize=(8, 5))
        df.boxplot(column=column)
        plt.title(f"Box Plot of {column}")
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, filename))
        plt.close()
        charts.append({
            "type": "boxplot",
            "column": column,
            "filename": filename
        })

    preview = df.head(10).astype(object)
    preview = preview.where(pd.notna(preview), None)

    result = {
        "overview": {
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "missing_values": int(df.isnull().sum().sum()),
            "duplicate_rows": int(df.duplicated().sum()),
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_columns,
            "categorical_columns": categorical_columns,
            "data_types": df.dtypes.astype(str).to_dict()
        },
        "preview": preview.to_dict(orient="records"),
        "charts": charts
    }

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
