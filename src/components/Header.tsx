import React from 'react';

const Header: React.FC = () => (
  <header className="bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] shadow-lg sticky top-0 z-50">
    <div className="max-w-[1100px] mx-auto px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">⚡</span>
        <span className="text-[22px] font-bold text-white tracking-tight">Boardspell</span>
      </div>
      <span className="text-sm text-white/80">Cross-Board Automation Builder</span>
    </div>
  </header>
);

export default Header;
