"use client"

import React, { useState } from 'react';

const GENRES = [
  'Trap',
  'Hip Hop',
  'R&B',
  'Pop',
  'Rock',
  'Electronic',
  'Jazz',
  'Classical',
  'Other',
];

export default function BeatUploadPage() {
  const [formData, setFormData] = useState({
    tags: '',
    genre: '',
    customGenre: '',
    price: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Use formData.genre === 'Other' ? formData.customGenre : formData.genre for the genre value
    // Submit logic here
    alert(
      `Tags: ${formData.tags}\nGenre: ${formData.genre === 'Other' ? formData.customGenre : formData.genre}\nPrice: ${formData.price}`
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto mt-8">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Tags</label>
        <input
          type="text"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g. trap, hip hop, rnb"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Genre</label>
        <select
          name="genre"
          value={formData.genre}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Select a genre</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {formData.genre === 'Other' && (
          <input
            type="text"
            name="customGenre"
            value={formData.customGenre}
            onChange={handleChange}
            placeholder="Enter custom genre"
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        )}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Price</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Upload Beat
      </button>
    </form>
  );
} 