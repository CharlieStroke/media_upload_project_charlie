import { useEffect, useState } from "react";
import axios from "axios";
import "./MediaList.css"; // <-- CSS separado

function MediaList() {
  const [media, setMedia] = useState([]);
  const [audioSearch, setAudioSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");
  const [audioPage, setAudioPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await axios.get("http://localhost:3001/media/all");
        setMedia(res.data);
      } catch (err) {
        console.error("Error cargando media:", err.response || err);
      }
    };
    fetchMedia();
  }, []);

  const audios = media.filter(
    (m) => m.type === "audio" && m.title.toLowerCase().includes(audioSearch.toLowerCase())
  );
  const videos = media.filter(
    (m) => m.type === "video" && m.title.toLowerCase().includes(videoSearch.toLowerCase())
  );

  const paginate = (items, page) => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  };

  return (
    <div className="media-container">
      <h2>Biblioteca Multimedia</h2>

      {/* BUSCADOR DE AUDIOS */}
      <h3>Audios</h3>
      <input
        type="text"
        className="media-search"
        placeholder="Buscar audios..."
        value={audioSearch}
        onChange={(e) => {
          setAudioSearch(e.target.value);
          setAudioPage(1);
        }}
      />
      <div className="media-grid">
        {paginate(audios, audioPage).length > 0
          ? paginate(audios, audioPage).map((m) => (
              <div key={m.id} className="media-card">
                <strong>{m.title}</strong>
                <audio controls src={m.url} className="media-player" />
              </div>
            ))
          : <p className="no-results">No se encontraron audios...</p>}
      </div>
      {audios.length > itemsPerPage && (
        <div className="pagination">
          {Array.from({ length: Math.ceil(audios.length / itemsPerPage) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setAudioPage(i + 1)}
              className={audioPage === i + 1 ? "page-btn active" : "page-btn"}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* BUSCADOR DE VIDEOS */}
      <h3>Videos</h3>
      <input
        type="text"
        className="media-search"
        placeholder="Buscar videos..."
        value={videoSearch}
        onChange={(e) => {
          setVideoSearch(e.target.value);
          setVideoPage(1);
        }}
      />
      <div className="media-grid">
        {paginate(videos, videoPage).length > 0
          ? paginate(videos, videoPage).map((m) => (
              <div key={m.id} className="media-card">
                <strong>{m.title}</strong>
                <video
                  controls
                  src={m.url}
                  className="media-player video-player"
                />
              </div>
            ))
          : <p className="no-results">No se encontraron videos...</p>}
      </div>
      {videos.length > itemsPerPage && (
        <div className="pagination">
          {Array.from({ length: Math.ceil(videos.length / itemsPerPage) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setVideoPage(i + 1)}
              className={videoPage === i + 1 ? "page-btn active" : "page-btn"}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaList;
