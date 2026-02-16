import requests
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from io import BytesIO
from collections import Counter
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY_TMDB = os.getenv('API_KEY_TMDB')
API_KEY_DEEPL = os.getenv('API_KEY_DEEPL')
URL_TMDB = 'https://api.themoviedb.org/3/'

def get_dominant_color(image_path, k=4):
    response = requests.get(image_path)
    image = Image.open(BytesIO(response.content))

    def calculate_dominant_color(image):
        # Convertir en RGB si l'image est en noir et blanc
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image_np = np.array(image)
        half_height = image_np.shape[0] // 2

        if image_np.ndim == 3:
            top_half = image_np[:half_height, :, :]
            pixels = top_half.reshape(-1, 3)
        else:
            top_half = image_np[:half_height, :]
            pixels = top_half.reshape(-1, 1)

        kmeans = KMeans(n_clusters=k)
        kmeans.fit(pixels)
        counts = Counter(kmeans.labels_)
        most_common_cluster = counts.most_common(1)[0][0]
        dominant_color = kmeans.cluster_centers_[most_common_cluster]

        return dominant_color.astype(int)

    dominant_color = calculate_dominant_color(image)
    try:
        dominant_color_hex = '#%02x%02x%02x' % tuple(dominant_color)
    except TypeError:
        dominant_color_hex = ''

    if not dominant_color_hex:
        image = image.resize((150, 150))
        dominant_color = calculate_dominant_color(image)
        dominant_color_hex = '#%02x%02x%02x' % tuple(dominant_color)

    return dominant_color_hex


def search_detailed_movies(url):
    headers = {
        'accept': 'application/json',
        "Authorization": "Bearer " + API_KEY_TMDB,
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from TMDb API: {e}")
