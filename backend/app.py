from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import torch
import base64
import io

from pathlib import Path
from PIL import Image
from torchvision.transforms import ToPILImage

from model import Generator, latent_size

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

base_dir = Path(__file__).resolve().parent
checkpoint_path = base_dir / "generator.pth"

if not checkpoint_path.exists() or checkpoint_path.stat().st_size == 0:
    raise FileNotFoundError(
        f"Checkpoint not found or empty: {checkpoint_path}. "
        "Place a valid generator.pth state dict in the backend folder."
    )

state_dict = torch.load(checkpoint_path, map_location=device)

if isinstance(state_dict, dict):
    normalized = {}
    for k, v in state_dict.items():
        if k.startswith("model."):
            normalized[k] = v
        else:
            normalized[f"model.{k}"] = v
    state_dict = normalized

generator = Generator().to(device)

generator.load_state_dict(state_dict)

generator.eval()

def tensor_to_base64(img_tensor):
    img_tensor = img_tensor.squeeze(0)

    img_tensor = (img_tensor + 1) / 2
    img_tensor = img_tensor.clamp(0, 1)

    pil_img = ToPILImage()(img_tensor.cpu())

    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG")

    return base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

@app.post("/generate")
def generate():
    with torch.no_grad():

        z = torch.randn(
            1,
            latent_size,
            1,
            1,
            device=device
        )

        img = generator(z)

    img_b64 = tensor_to_base64(img)

    return {
        "image": img_b64
    }