// backend/server.js — versión limpia SOLO S3
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import mysql from "mysql2/promise";
import multer from "multer";
import AWS from "aws-sdk";
import fs from "fs";

dotenv.config();

// --------------------------------------
// CONFIGURAR AWS S3
// --------------------------------------
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const transcribe = new AWS.TranscribeService({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// --------------------------------------
// MULTER: archivos temporales
// --------------------------------------
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || String(200 * 1024 * 1024), 10);
const upload = multer({ dest: "uploads/", limits: { fileSize: MAX_FILE_SIZE } });

// --------------------------------------
// EXPRESS
// --------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "mi_secreto_temporal";

// --------------------------------------
// MYSQL
// --------------------------------------
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// --------------------------------------
// LOGIN
// --------------------------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y password requeridos" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );


    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/transcribe/:mediaId", authenticateToken, async (req, res) => {
  const mediaId = req.params.mediaId;

  try {
    // 1️⃣ Obtener la info del archivo desde la BD
    const [rows] = await db.query("SELECT * FROM media WHERE id = ?", [mediaId]);
    if (rows.length === 0) return res.status(404).json({ error: "Archivo no encontrado" });

    const media = rows[0];

    // 2️⃣ Solo permitir que el propietario haga la transcripción
    if (media.user_id !== req.user.userId) {
      return res.status(403).json({ error: "No tienes permiso para transcribir este archivo" });
    }

    // 3️⃣ Crear nombre único para la tarea de transcripción
    const jobName = `transcribe_${mediaId}_${Date.now()}`;

    // 4️⃣ Sacar la Key desde la URL de S3
    const bucket = process.env.AWS_BUCKET_NAME;
    const key = media.url.split(`https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

    if (!key) return res.status(400).json({ error: "No se pudo obtener la Key de S3" });

    // 5️⃣ Configurar parámetros para Transcribe usando s3://
    const params = {
      TranscriptionJobName: jobName,
      LanguageCode: "en-US", // o "es-US" si tu cuenta lo permite
      MediaFormat: media.type === "audio" ? "mp3" : "mp4",
      Media: { MediaFileUri: `s3://${bucket}/${key}` },
      OutputBucketName: bucket
    };

    // 6️⃣ Iniciar la transcripción
    await transcribe.startTranscriptionJob(params).promise();

    res.json({ ok: true, message: "Transcripción iniciada", jobName });

  } catch (err) {
    console.error("Error transcribing:", err);
    res.status(500).json({ error: err.message });
  }
});



app.get("/transcribe/:jobName", authenticateToken, async (req, res) => {
  const { jobName } = req.params;

  try {
    const data = await transcribe.getTranscriptionJob({ TranscriptionJobName: jobName }).promise();

    const job = data.TranscriptionJob;

    // Revisar el estado del trabajo
    if (job.TranscriptionJobStatus === "IN_PROGRESS") {
      return res.json({ status: "IN_PROGRESS" });
    }

    if (job.TranscriptionJobStatus === "FAILED") {
      return res.json({ status: "FAILED", reason: job.FailureReason });
    }

    // ✅ Si está completado, obtener el URL del JSON de la transcripción
    const transcriptUrl = job.Transcript.TranscriptFileUri;

    // Traer el JSON desde S3 o URL pública
    const response = await axios.get(transcriptUrl);
    const transcriptText = response.data.results.transcripts.map(t => t.transcript).join("\n");

    res.json({ status: "COMPLETED", transcript: transcriptText });

  } catch (err) {
    console.error("Error getting transcription:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------
// SUBIDA DE ARCHIVOS A S3 (audio y video)
// --------------------------------------
async function uploadFileToS3(filePath, key, contentType) {
  const fileBody = fs.readFileSync(filePath);
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: fileBody,
    ContentType: contentType
  };
  const result = await s3.upload(params).promise();
  return result.Location;
}

app.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No enviaste archivo" });

    if (!/^audio\//.test(file.mimetype) && !/^video\//.test(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Archivo no permitido. Solo audio y video." });
    }

    const folder = file.mimetype.startsWith("video") ? "video" : "audio";
    const objectName = `${folder}/${Date.now()}_${file.originalname}`;

    const url = await uploadFileToS3(file.path, objectName, file.mimetype);
    fs.unlinkSync(file.path);


    await db.query(
      "INSERT INTO media (title, type, url, user_id) VALUES (?, ?, ?, ?)",
      [file.originalname, folder, url, req.user.userId]
    );

    res.json({
      message: "Archivo subido correctamente",
      url,
      fileName: objectName,
      storage: "s3"
    });

  } catch (error) {
    console.error("Error upload:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/media/:id", authenticateToken, async (req, res) => {
  const mediaId = req.params.id;

  try {
    const [rows] = await db.query("SELECT * FROM media WHERE id = ?", [mediaId]);
    if (rows.length === 0) return res.status(404).json({ error: "Archivo no encontrado" });

    const media = rows[0];
    if (media.user_id !== req.user.userId) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este archivo" });
    }

    const Key = media.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
    if (Key) {
      await s3.deleteObject({ Bucket: process.env.AWS_BUCKET_NAME, Key }).promise();
    }

    await db.query("DELETE FROM media WHERE id = ?", [mediaId]);
    res.json({ ok: true, message: "Archivo eliminado correctamente" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/media/:id", authenticateToken, async (req, res) => {
  const mediaId = req.params.id;
  const { title } = req.body;

  if (!title) return res.status(400).json({ error: "Título requerido" });

  try {
    const [rows] = await db.query("SELECT * FROM media WHERE id = ?", [mediaId]);
    if (rows.length === 0) return res.status(404).json({ error: "Archivo no encontrado" });

    const media = rows[0];
    if (media.user_id !== req.user.userId) {
      return res.status(403).json({ error: "No tienes permiso para editar este archivo" });
    }

    await db.query("UPDATE media SET title = ? WHERE id = ?", [title, mediaId]);
    res.json({ ok: true, message: "Título actualizado" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------
// MEDIA (guardar y listar)
// --------------------------------------
app.post("/media", async (req, res) => {
  const { title, url, type } = req.body;

  if (!title || !url || !type) {
    return res.status(400).json({ error: "title, url y type son requeridos" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO media (title, type, url) VALUES (?, ?, ?)",
      [title, type, url]
    );

    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/media", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM media WHERE user_id = ?",
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/media/all", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM media ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// --------------------------------------
// REGISTRO
// --------------------------------------
app.post("/register", async (req, res) => {
  const { email, username, password } = req.body || {};

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username y password requeridos" });
  }

  try {
    // Verificar si el usuario ya existe
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Guardar en la BD incluyendo username
    const [result] = await db.query(
      "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)",
      [email, username, password_hash]
    );

    // Crear token automático al registrarse
    const token = jwt.sign(
      { userId: result.insertId, email, username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ ok: true, token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------
// MIDDLEWARE DE AUTENTICACIÓN
// --------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "Token requerido" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = user; // guardamos info del usuario en la request
    next();
  });
}


// --------------------------------------
// PING
// --------------------------------------
app.get("/", (req, res) => res.json({ ok: true, message: "API funcionando ✔" }));

// --------------------------------------
// START SERVER
// --------------------------------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
