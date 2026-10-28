import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#142B4A] flex flex-col font-sans selection:bg-[#EAF0F7] selection:text-[#142B4A]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
