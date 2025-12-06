import { useState } from "react";
import axios from "axios";

export default function Login({ setToken }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // <-- estado para username
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:3001/login", { email, password });
      const token = res.data.token;

      localStorage.setItem("token", token);
      setToken(token);

      window.location.href = "/"; // Redirigir al home
    } catch (err) {
      setMessage("Error: " + err.response?.data?.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // <-- enviamos también el username
      const res = await axios.post("http://localhost:3001/register", { email, username, password });

      const token = res.data.token;
      localStorage.setItem("token", token);
      setToken(token);

      window.location.href = "/";
    } catch (err) {
      setMessage("Error: " + err.response?.data?.error);
    }
  };

  return (
    <div className="app-container">
      <h1>Media Cloud</h1>

      {mode === "login" ? (
        <>
          <h2>Iniciar sesión</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button>Entrar</button>
          </form>
          <p>{message}</p>

          <p>
            ¿No tienes cuenta?{" "}
            <button onClick={() => setMode("register")}>Crear cuenta</button>
          </p>
        </>
      ) : (
        <>
          <h2>Crear cuenta</h2>
          <form onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button>Registrarme</button>
          </form>
          <p>{message}</p>

          <p>
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => setMode("login")}>Inicia sesión</button>
          </p>
        </>
      )}
    </div>
  );
}
