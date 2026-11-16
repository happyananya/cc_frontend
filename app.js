const { apiBaseUrl, apiKey } = window.APP_CONFIG;

// SDK1: the API Gateway generated client (sdk/apigClient.js).
const apigClient =
  typeof apigClientFactory !== "undefined" ? apigClientFactory.newClient({ apiKey }) : null;

const $ = (id) => document.getElementById(id);

// ---------- Search: GET /search?q= ----------
async function searchPhotos(q) {
  if (apigClient) {
    const res = await apigClient.searchGet({ q }, {}, {});
    return res.data.results || [];
  }
  // Fallback if the SDK files haven't been added yet.
  const res = await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(q)}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return (await res.json()).results || [];
}

function renderResults(results) {
  const grid = $("results");
  grid.innerHTML = "";
  for (const photo of results) {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = (photo.labels || []).join(", ");
    img.loading = "lazy";
    const caption = document.createElement("figcaption");
    caption.textContent = (photo.labels || []).join(", ");
    fig.append(img, caption);
    grid.append(fig);
  }
}

$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("search-input").value.trim();
  $("search-status").textContent = "Searching…";
  try {
    const results = await searchPhotos(q);
    renderResults(results);
    $("search-status").textContent = results.length
      ? `${results.length} photo(s) found.`
      : "No photos matched your search.";
  } catch (err) {
    console.error(err);
    $("search-status").textContent = "Search failed. Check the console.";
  }
});

// ---------- Upload: PUT /photos/{object} ----------
// The generated SDK copies the request body as a plain object, which corrupts binary
// files, so the upload goes through fetch against the same API (same API key).
async function uploadPhoto(file, customLabels) {
  const key = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const headers = {
    "Content-Type": file.type || "image/jpeg",
    "x-api-key": apiKey,
  };
  if (customLabels.length) {
    headers["x-amz-meta-customLabels"] = customLabels.join(", ");
  }
  const res = await fetch(`${apiBaseUrl}/photos/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers,
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return key;
}

$("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("upload-file").files[0];
  const labels = $("upload-labels")
    .value.split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  $("upload-status").textContent = "Uploading…";
  try {
    const key = await uploadPhoto(file, labels);
    $("upload-status").textContent =
      `Uploaded ${key}. It will be searchable in a few seconds once it's indexed.`;
    e.target.reset();
  } catch (err) {
    console.error(err);
    $("upload-status").textContent = "Upload failed. Check the console.";
  }
});
