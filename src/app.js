import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
    origin: [
        "http://127.0.0.1:1234",
        "http://localhost:1234",
        "http://127.0.0.1:1235",
        "http://localhost:1235",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default app;
