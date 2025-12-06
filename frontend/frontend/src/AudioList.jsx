import { useEffect, useState } from "react";
import axios from "axios";
import Transcriber from "./Transcriber.jsx";

export default function AudioList() {
  const [audios, setAudios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  

  // Obtener audios del usuario logueado
  const fetchAudios = async () => {
    try {
      const res = await axios.get("http://localhost:3001/media", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      setAudios(res.data.filter(item => item.type === "audio"));
    } catch (err) {
      console.error("Error cargando audios:", err.response || err);
      alert("Error cargando audios: " + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchAudios();
  }, []);

  // Eliminar audio
  const handleDelete = async (id) => {
    if (!confirm("¿Seguro quieres eliminar este audio?")) return;

    try {
      await axios.delete(`http://localhost:3001/media/${id}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      fetchAudios();
    } catch (err) {
      console.error("Error eliminando audio:", err.response || err);
      alert("No se pudo eliminar: " + (err.response?.data?.error || err.message));
    }
  };

  // Iniciar edición
  const handleEdit = (id, title) => {
    setEditingId(id);
    setNewTitle(title);
  };

  // Guardar título editado
  const saveEdit = async (id) => {
    if (!newTitle.trim()) {
      alert("El título no puede estar vacío");
      return;
    }

    try {
      await axios.put(`http://localhost:3001/media/${id}`, 
        { title: newTitle },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      setEditingId(null);
      setNewTitle("");
      fetchAudios();
    } catch (err) {
      console.error("Error actualizando título:", err.response || err);
      alert("No se pudo actualizar: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      {audios.length === 0 && <p>No tienes audios subidos aún.</p>}

      {audios.map((audio) => (
        <div key={audio.id} style={{ marginBottom: 20 }}>
          {editingId === audio.id ? (
            <>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
              />
              <button onClick={() => saveEdit(audio.id)}>Guardar</button>
              <button onClick={() => setEditingId(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <strong>{audio.title}</strong>
              <br />
              <audio controls src={audio.url} />
              <Transcriber mediaId={audio.id} mediaTitle={audio.title} />
              <br />
              <button onClick={() => handleEdit(audio.id, audio.title)}>Editar título</button>
              <button onClick={() => handleDelete(audio.id)}>Eliminar</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
