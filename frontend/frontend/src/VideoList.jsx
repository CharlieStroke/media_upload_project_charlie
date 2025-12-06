import { useEffect, useState } from "react";
import axios from "axios";

export default function VideoList() {
  const [videos, setVideos] = useState([]);

  const token = localStorage.getItem("token");

  // Traer solo los videos del usuario logueado
  const fetchVideos = async () => {
    try {
      const res = await axios.get("http://localhost:3001/media", {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtrar solo videos
      setVideos(res.data.filter(item => item.type === "video"));
    } catch (err) {
      console.error("Error cargando videos:", err.response || err);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Eliminar video
  const handleDelete = async (id) => {
    if (!confirm("¿Deseas eliminar este video?")) return;

    try {
      await axios.delete(`http://localhost:3001/media/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVideos(); // refrescar lista
    } catch (err) {
      alert("Error al eliminar: " + err.response?.data?.error);
    }
  };

  // Editar título
  const handleEditTitle = async (id) => {
    const newTitle = prompt("Nuevo título:");
    if (!newTitle) return;

    try {
      await axios.put(`http://localhost:3001/media/${id}`, { title: newTitle }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVideos(); // refrescar lista
    } catch (err) {
      alert("Error al editar: " + err.response?.data?.error);
    }
  };

  return (
    <div>
      {videos.length === 0 && <p>No has subido videos aún.</p>}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "20px",
        marginTop: 20
      }}>
        {videos.map((video) => (
          <div key={video.id} style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
            <strong>{video.title}</strong>
            <div style={{ marginTop: 10 }}>
              <video controls src={video.url} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: 5 }}>
              <button onClick={() => handleEditTitle(video.id)} style={{ marginRight: 5 }}>Editar título</button>
              <button onClick={() => handleDelete(video.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
