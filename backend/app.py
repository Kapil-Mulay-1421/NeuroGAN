from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import torch
import base64
import io

from pathlib import Path
from PIL import Image
from torchvision.transforms import ToPILImage

from model import Generator, latent_size

from pydantic import BaseModel

class InterpolationRequest(BaseModel):
    latentA: list[float]
    latentB: list[float]
    num_frames: int = 50

class GalleryRequest(BaseModel):
    count: int = 12

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

def sample_latent():
    return torch.randn(
        1,
        latent_size,
        1,
        1,
        device=device
    )

def slerp(t, z1, z2):
    z1_flat = z1.view(-1)
    z2_flat = z2.view(-1)

    z1_norm = z1_flat / z1_flat.norm()
    z2_norm = z2_flat / z2_flat.norm()

    omega = torch.acos(
        torch.clamp(torch.dot(z1_norm, z2_norm), -1.0, 1.0)
    )

    so = torch.sin(omega)

    if so < 1e-6:
        return (1 - t) * z1 + t * z2

    return (
        torch.sin((1 - t) * omega) / so * z1 +
        torch.sin(t * omega) / so * z2
    )

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

        z = sample_latent()

        img = generator(z)

    img_b64 = tensor_to_base64(img)

    return {
        "image": img_b64,
        "latent": z.cpu().flatten().tolist()
    }

@app.post("/interpolate")
def interpolate(request: InterpolationRequest):

    z1 = torch.tensor(
        request.latentA,
        dtype=torch.float32,
        device=device
    ).view(1, latent_size, 1, 1)

    z2 = torch.tensor(
        request.latentB,
        dtype=torch.float32,
        device=device
    ).view(1, latent_size, 1, 1)

    lerp_frames = []
    slerp_frames = []

    with torch.no_grad():

        # Precompute alphas to avoid division-by-zero when num_frames == 1
        if request.num_frames == 1:
            alphas = [0.0]
        else:
            alphas = [i / (request.num_frames - 1) for i in range(request.num_frames)]

        for alpha in alphas:

            # LERP
            z_lerp = (1 - alpha) * z1 + alpha * z2
            img_lerp = generator(z_lerp)

            lerp_frames.append(
                tensor_to_base64(img_lerp)
            )

            # SLERP
            z_slerp = slerp(alpha, z1, z2)
            img_slerp = generator(z_slerp)

            slerp_frames.append(
                tensor_to_base64(img_slerp)
            )

    return {
        "lerp_frames": lerp_frames,
        "slerp_frames": slerp_frames
    }

@app.post("/gallery")
def gallery(request: GalleryRequest):

    count = max(1, min(request.count, 50))

    images = []

    with torch.no_grad():

        for _ in range(count):

            z = sample_latent()

            img = generator(z)

            images.append(
                tensor_to_base64(img)
            )

    return {
        "images": images
    }