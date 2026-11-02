import sys
import json
import os
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


def main():
    mode = sys.argv[1]
    file_path = sys.argv[2]
    df = pd.read_csv(file_path)

    if mode == "count":
        column = sys.argv[3]
        search_value = sys.argv[4]

        if column not in df.columns:
            print(json.dumps({"error": "Column not found."}))
            return

        # Exact, case-sensitive comparison. Missing values are not counted.
        matches = df[column].notna() & (df[column].astype(str) == search_value)

        print(json.dumps({
            "column": column,
            "value": search_value,
            "count": int(matches.sum())
        }))

    elif mode == "plot":
        chart_type = sys.argv[3]
        column = sys.argv[4]
        output_path = sys.argv[5]

        if column not in df.columns:
            print(json.dumps({"error": "Column not found."}))
            return

        plt.figure(figsize=(8, 5))

        if chart_type == "histogram":
            if not pd.api.types.is_numeric_dtype(df[column]):
                print(json.dumps({"error": "Histogram requires a numeric column."}))
                return
            df[column].dropna().hist(bins=10)
            plt.xlabel(column)
            plt.ylabel("Frequency")
            plt.title(f"Histogram of {column}")

        elif chart_type == "bar":
            counts = df[column].astype(str).value_counts().head(15)
            counts.plot(kind="bar")
            plt.xlabel(column)
            plt.ylabel("Count")
            plt.title(f"Top Values in {column}")

        elif chart_type == "boxplot":
            if not pd.api.types.is_numeric_dtype(df[column]):
                print(json.dumps({"error": "Box plot requires a numeric column."}))
                return
            df.boxplot(column=column)
            plt.title(f"Box Plot of {column}")

        elif chart_type == "scatter":
            y_column = sys.argv[6]
            if y_column not in df.columns:
                print(json.dumps({"error": "Y column not found."}))
                return
            if not pd.api.types.is_numeric_dtype(df[column]) or not pd.api.types.is_numeric_dtype(df[y_column]):
                print(json.dumps({"error": "Scatter plot requires two numeric columns."}))
                return
            plt.scatter(df[column], df[y_column], alpha=0.7)
            plt.xlabel(column)
            plt.ylabel(y_column)
            plt.title(f"{column} vs {y_column}")

        else:
            print(json.dumps({"error": "Invalid chart type."}))
            return

        plt.tight_layout()
        plt.savefig(output_path)
        plt.close()

        print(json.dumps({
            "message": "Plot generated successfully.",
            "filename": os.path.basename(output_path)
        }))

    else:
        print(json.dumps({"error": "Unknown feature mode."}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
