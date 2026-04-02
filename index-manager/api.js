const API = "http://192.168.1.5:5050/api/appdaemon";

export async function api(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "text/plain" },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API}/${endpoint}`, options);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error || `Erreur ${response.status}`);
  }

  return json;
}