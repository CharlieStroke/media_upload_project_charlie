import { useState, useEffect } from "react";
import MediaList from "./medialist.jsx";
import AudioUploader from "./AudioUploader.jsx";
import VideoUploader from "./VideoUploader.jsx";
import AudioList from "./AudioList.jsx";
import VideoList from "./VideoList.jsx";

// Helper para decodificar JWT correctamente
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64));
  } catch (e) {
    return null;
  }
}



export default function Dashboard({ setToken }) {
  const [activeSection, setActiveSection] = useState("home");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = parseJwt(token);
      if (payload?.username) {
        setUsername(payload.username);
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  return (
    <div className="app-container">
      <h1>Charlie's Cloud</h1>
      <h3>Bienvenido, {username}</h3>

      <button className="logout-btn" onClick={logout}>
        Cerrar sesión
      </button>


      <div style={{ marginBottom: 30 }}>
        <button
          onClick={() => setActiveSection("home")}
          style={{
            marginRight: 10,
            backgroundColor: activeSection === "home" ? "#dd4ffaff" : "#1b2a4d",
          }}
        >
          Buscar contenido
        </button>

        <button
          onClick={() => setActiveSection("upload_audio")}
          style={{
            marginRight: 10,
            backgroundColor:
              activeSection === "upload_audio" ? "#74dcfcff" : "#1b2a4d",
          }}
        >
          Subir Canción
        </button>

        <button
          onClick={() => setActiveSection("upload_video")}
          style={{
            backgroundColor:
              activeSection === "upload_video" ? "#fa4f7aff" : "#1b2a4d",
          }}
        >
          Subir Video
        </button>
      </div>

      {activeSection === "home" && (
        <div>
          <MediaList />
        </div>
      )}

      {activeSection === "upload_audio" && (
        <div>
          <h2>Subir nueva canción</h2>
          <AudioUploader />
          <hr />
          <h2>Mis canciones</h2>
          <AudioList />
        </div>
      )}

      {activeSection === "upload_video" && (
        <div>
          <h2>Subir nuevo Video</h2>
          <VideoUploader />
          <hr />
          <h2>Mis videos</h2>
          <VideoList />
        </div>
      )}
    </div>
  );
}
