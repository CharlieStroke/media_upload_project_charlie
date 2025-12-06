import { useState } from "react";
import axios from "axios";

export default function VideoUploader() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) {
      alert("Debes seleccionar un archivo de video y poner un título");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Subida a S3 (backend)
      const res = await axios.post("http://localhost:3001/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      });

      const fileUrl = res.data.url;

      // Guardar en BD indicando tipo
      await axios.post("http://localhost:3001/media", {
        title,
        url: fileUrl,
        type: "video"
      }, {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("token")
        }
      });

      alert("Video subido correctamente");
      setFile(null);
      setTitle("");

    } catch (err) {
      console.error("Error subiendo video:", err.response || err);
      alert("Error subiendo video: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Subir archivo de video</h2>

      <input
        type="text"
        placeholder="Título del video"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br /><br />

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <br /><br />

      <button disabled={uploading} onClick={handleUpload}>
        {uploading ? "Subiendo..." : "Subir"}
      </button>
    </div>
  );
}
