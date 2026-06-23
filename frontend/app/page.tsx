'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [latent, setLatent] = useState<number[] | null>(null);

  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);

  const [latentA, setLatentA] = useState<number[] | null>(null);
  const [latentB, setLatentB] = useState<number[] | null>(null);
  const [currentImage, setCurrentImage] =
    useState<string | null>(null);

  const [lerpFrames, setLerpFrames] =
    useState<string[]>([]);

  const [slerpFrames, setSlerpFrames] =
    useState<string[]>([]);

  const [method, setMethod] =
    useState<'lerp' | 'slerp'>('slerp');

  const [sliderValue, setSliderValue] =
    useState(0);

  const [loading, setLoading] = useState(false);

  const [interpolating, setInterpolating] =
    useState(false);

  const [galleryImages, setGalleryImages] =
    useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const generateImage = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/generate`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      setImage(`data:image/png;base64,${data.image}`);
      setLatent(data.latent);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateA = async () => {
    const response = await fetch(
      `${API_URL}/generate`,
      {
        method: 'POST',
      }
    );

    const data = await response.json();

    setImageA(
      `data:image/png;base64,${data.image}`
    );

    setLatentA(data.latent);
  };

  const generateB = async () => {
    const response = await fetch(
      `${API_URL}/generate`,
      {
        method: 'POST',
      }
    );

    const data = await response.json();

    setImageB(
      `data:image/png;base64,${data.image}`
    );

    setLatentB(data.latent);
  };

  const interpolate = async () => {

    setInterpolating(true);

    try {
      if (!latentA || !latentB) {
        alert('Generate Image A and Image B first');
        return;
      }

      const response = await fetch(
        `${API_URL}/interpolate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latentA,
            latentB,
            num_frames: 50,
          }),
        }
      );

      const data = await response.json();

      const lerp = data.lerp_frames.map(
        (img: string) =>
          `data:image/png;base64,${img}`
      );

      const slerp = data.slerp_frames.map(
        (img: string) =>
          `data:image/png;base64,${img}`
      );

      setLerpFrames(lerp);
      setSlerpFrames(slerp);

      setSliderValue(0);
      setCurrentImage(slerp[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setInterpolating(false);
    }
  };

  const loadGallery = async () => {
    const response = await fetch(`${API_URL}/gallery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count: 12,
      }),
    });

    const data = await response.json();

    const galleryImages = data.images.map(
      (img: string) =>
        `data:image/png;base64,${img}`
    );

    setGalleryImages(galleryImages);
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const idx = Number(e.target.value);

    setSliderValue(idx);

    const frames =
      method === 'slerp'
        ? slerpFrames
        : lerpFrames;

    setCurrentImage(frames[idx]);
  };

  const handleMethodChange = (
    newMethod: 'lerp' | 'slerp'
  ) => {

    setMethod(newMethod);

    const frames =
      newMethod === 'slerp'
        ? slerpFrames
        : lerpFrames;

    if (frames.length > 0) {
      setCurrentImage(frames[sliderValue]);
    }
  };
  

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">
        Brain Tumor GAN Demo
      </h1>

      <button
        onClick={generateImage}
        disabled={loading}
        className="px-6 py-3 bg-black text-white rounded-lg"
      >
        {loading ? 'Generating...' : 'Generate Tumor'}
      </button>

      {image && (
        <img
          src={image}
          alt="Generated Tumor"
          className="w-64 h-64 border"
        />
      )}
      <section className="mt-20 w-full max-w-6xl">

        <h2 className="text-2xl font-bold mb-6">
          Latent Space Interpolation
        </h2>

        <div className="grid grid-cols-3 gap-8">

          <div className="flex flex-col items-center">
            <button
              onClick={generateA}
              className="mb-4 px-4 py-2 bg-black text-white rounded"
            >
              Generate A
            </button>

            {imageA && (
              <img
                src={imageA}
                alt="Image A"
                className="border"
              />
            )}
          </div>

          <div className="flex flex-col items-center">

            {currentImage && (
              <img
                src={currentImage}
                alt="Current"
                className="border"
              />
            )}

            {lerpFrames.length > 0 && (
              <>
                <input
                  type="range"
                  min={0}
                  max={49}
                  value={sliderValue}
                  onChange={handleSliderChange}
                  className="w-full mt-4"
                />

                <div className="mt-4 flex gap-4">

                  <button
                    onClick={() => handleMethodChange('lerp')}
                    className={
                      method === 'lerp'
                        ? 'px-3 py-2 rounded bg-white text-black font-semibold'
                        : 'px-3 py-2 rounded bg-black text-white'
                    }
                  >
                    LERP
                  </button>

                  <button
                    onClick={() => handleMethodChange('slerp')}
                    className={
                      method === 'slerp'
                        ? 'px-3 py-2 rounded bg-white text-black font-semibold'
                        : 'px-3 py-2 rounded bg-black text-white'
                    }
                  >
                    SLERP
                  </button>

                </div>
              </>
            )}

          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={generateB}
              className="mb-4 px-4 py-2 bg-black text-white rounded"
            >
              Generate B
            </button>

            {imageB && (
              <img
                src={imageB}
                alt="Image B"
                className="border"
              />
            )}
          </div>

        </div>

        <div className="flex justify-center gap-4 mt-8">

          <button
            onClick={interpolate}
            disabled={interpolating}
            className="px-6 py-3 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {interpolating ? 'Interpolating...' : 'Interpolate'}
          </button>

        </div>

        {galleryImages.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-8">
            {galleryImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Generated ${idx}`}
                className="border"
              />
            ))}
          </div>
        )}

      </section>
    </main>
  );
}