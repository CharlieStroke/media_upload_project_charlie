import { useState } from "react";
import axios from "axios";

export default function Transcriber({ mediaId, mediaTitle }) {
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");

  const startTranscription = async () => {
    try {
      setStatus("INICIANDO...");
      const token = localStorage.getItem("token");

      // Crear job de transcripción en el backend
      // Transcriber.jsx
const res = await axios.post(
  `http://localhost:3001/transcribe/${mediaId}`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);

const jobName = res.data.jobName; // <-- usar la propiedad correcta
setJobName(jobName);
pollTranscription(jobName, token);

        setStatus("EN PROGRESO...");
        setTranscript("");

        // Comenzar polling para revisar estado
        pollTranscription(jobName, token);


    } catch (err) {
      console.error(err);
      setStatus("ERROR iniciando transcripción");
    }
  };

  const pollTranscription = async (job, token) => {
    try {
      const interval = setInterval(async () => {
        const res = await axios.get(
          `http://localhost:3001/transcribe/${job}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "COMPLETED") {
          clearInterval(interval);
          setTranscript(res.data.transcript);
          setStatus("COMPLETADO");
        } else if (res.data.status === "FAILED") {
          clearInterval(interval);
          setStatus("FALLIDO: " + res.data.reason);
        } else {
          setStatus("EN PROGRESO...");
        }
      }, 3000); // revisar cada 3s
    } catch (err) {
      console.error(err);
      setStatus("ERROR revisando transcripción");
    }
  };

  return (
    <div style={{ marginTop: 10, padding: 10, border: "1px solid #39ff14", borderRadius: 8 }}>
      <strong>{mediaTitle}</strong>
      <div>
        <button onClick={startTranscription}>Transcribir</button>
      </div>
      <p>Status: {status}</p>
      {transcript && (
        <div style={{ marginTop: 10, background: "#000000bb", padding: 10, borderRadius: 6 }}>
          <strong>Transcripción:</strong>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}
