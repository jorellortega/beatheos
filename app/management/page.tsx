import React from 'react';

export default function ManagementPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <div className="max-w-lg w-full bg-zinc-900 rounded-xl shadow-lg p-8 border border-primary">
        <h1 className="text-3xl font-bold mb-4 text-primary">Beatheos Management & Ownership</h1>
        <p className="mb-6 text-lg">
          This page serves as official verification that <span className="font-semibold text-primary">J Ortega</span> is the manager and authorized representative for the Beatheos music profile and catalog.
        </p>
        <div className="mb-6">
          <div className="mb-2">
            <span className="font-semibold">Manager:</span> J Ortega
          </div>
          <div className="mb-2">
            <span className="font-semibold">Management Email:</span> <a href="mailto:jorellortega@gmail.com" className="text-primary underline">jorellortega@gmail.com</a>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-base">
            For any questions, concerns, or music verification requests regarding Beatheos, please contact the management email above. All inquiries will be handled promptly and professionally.
          </p>
        </div>
        <div className="text-xs text-zinc-400 mt-8">
          &copy; {new Date().getFullYear()} Beatheos. All rights reserved.
        </div>
      </div>
    </div>
  );
} 