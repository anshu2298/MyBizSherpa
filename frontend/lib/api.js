export async function postData(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({}));
      throw new Error(
        errorData.message ||
          `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function getData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
}
