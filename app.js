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
// Rekognition only reads JPEG and PNG, so other formats (AVIF, WebP, GIF, ...)
// are re-encoded to JPEG in the browser before upload.
async function toRekognitionFormat(file) {
  if (file.type === "image/jpeg" || file.type === "image/png") return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  const name = file.name.replace(/\.[^.]*$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function uploadPhoto(original, customLabels) {
  const file = await toRekognitionFormat(original);
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
