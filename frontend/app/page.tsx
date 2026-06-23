'use client';

import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
      });

      const data = await response.json();

      setImage(`data:image/png;base64,${data.image}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image');
    } finally {
      setLoading(false);
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
    </main>
  );
}