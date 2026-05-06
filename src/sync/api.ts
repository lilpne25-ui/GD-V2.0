// Lógica para consumir APIs REST (placeholder)
export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(endpoint, options);
  return response.json();
}
