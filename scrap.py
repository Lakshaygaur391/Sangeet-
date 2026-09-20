import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

url = "https://pagalworld.is/"

headers = {
    "User-Agent": "Mozilla/5.0"
}

response = requests.get(url, headers=headers, timeout=10)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

# -----------------------------
# SCRAPE LINKS
# -----------------------------

links = set()

for a in soup.find_all("a", href=True):
    link = urljoin(url, a["href"])
    links.add(link)

print("\n===== LINKS =====")

for link in sorted(links):
    print(link)


# -----------------------------
# SCRAPE IMAGES
# -----------------------------

images = set()

for img in soup.find_all("img"):
    src = img.get("src")

    if src:
        image_url = urljoin(url, src)
        images.add(image_url)

print("\n===== IMAGES =====")

for image in sorted(images):
    print(image)


print("\nTotal Links:", len(links))
print("Total Images:", len(images))