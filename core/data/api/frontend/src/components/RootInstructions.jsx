import { useEffect, useState } from "react";

export default function RootInstructions({ backendUrl }) {

  const [message, setMessage] = useState("");
  const [endpoints, setEndpoints] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = new URL("/", backendUrl);
    fetch(url.toString())
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setMessage(data.message);
        setEndpoints(data.endpoints);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [backendUrl]);

  if (error) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: "14px", color: "red" }}>
        Error: {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
        Loading instructions...
      </div>
    )
  }

  return (
    <div style={{ margin: "0 auto", padding: "1rem", textAlign: "left", fontFamily: "monospace", fontSize: "14px" }}>
      <h2>{message}</h2>

      <div style={{ textAlign: "left" }}>
        {Object.entries(endpoints).map(([instruction, path]) => {
          return (
            <div key={instruction} style={{ marginBottom: "0.5rem" }}>
              <strong>{instruction}:</strong>
              &nbsp;{(path === "/sets" || path === "/aliases") ? <a href={path}>{path}</a> : path}
            </div>
          );
        })}
      </div>
    </div>
  );

}
