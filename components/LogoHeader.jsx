// src/components/LogoHeader.jsx

import React from 'react';

export default function LogoHeader() {
  return (
    <header className="w-full p-4 flex items-center justify-between bg-white dark:bg-gray-900 shadow-md">
      <div className="flex items-center space-x-4">
        <img
          src="/assets/logo.png" // Make sure your logo is placed in public/assets/logo.png
          alt="Space4Wheels Logo"
          className="h-12 w-auto transition-transform hover:scale-105 dark:invert"
        />
        {/* <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-wide">
          Space4Wheels
        </h1> */}
      </div>
    </header>
  );
}
